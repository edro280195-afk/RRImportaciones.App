using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.DTOs.Reportes;
using RR.Application.DTOs.Tramites;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public partial class CotizadorService : ICotizadorService
{
    private readonly AppDbContext _db;
    private readonly INhtsaService _nhtsa;
    private readonly IBanxicoService _banxico;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUser;

    public CotizadorService(
        AppDbContext db,
        INhtsaService nhtsa,
        IBanxicoService banxico,
        ITenantContext tenantContext,
        ICurrentUserService currentUser)
    {
        _db = db;
        _nhtsa = nhtsa;
        _banxico = banxico;
        _tenantContext = tenantContext;
        _currentUser = currentUser;
    }

    public async Task<CotizacionOutput> CalcularCotizacionAsync(CotizacionInput input)
    {
        var resolved = await ResolveVehicleAsync(input);
        if (resolved.Anno is null)
            throw new InvalidOperationException("El año modelo es obligatorio para cotizar");

        var clasificacion = DetermineFraccion(resolved.CilindradaCm3, input.TipoVehiculo, resolved.VehicleType, resolved.BodyClass, resolved.FuelType);
        var regimen = DetermineRegimen(resolved.Anno.Value);
        var honorarios = input.HonorariosOverride ?? await GetHonorariosAsync(regimen);
        var cargoExpress = input.TipoTramite.Equals("EXPRESS", StringComparison.OrdinalIgnoreCase) ? 2000m : 0m;

        decimal? valorUsd = null;
        decimal valorPesos;
        decimal? tcReferencia = null;
        decimal? tcAplicado = null;
        string? outputContexto = null;
        string? outputNota = null;
        var tcStale = false;
        var fuentePrecio = "ANEXO2";
        PriceLookupResult? precioLookup = null;
        string? categoriaAmparoUsada = null;

        if (regimen == "AMPARO")
        {
            var categoriaAmparoOverride = input.CategoriaAmparoOverride?.ToUpperInvariant();
            var categoriaAmparo = categoriaAmparoOverride == "LUJO"
                ? "LUJO"
                : DetermineCategoriaAmparo(clasificacion.Categoria, resolved.EngineCylinders);
            categoriaAmparoUsada = categoriaAmparo;

            var amparo = await _db.TabuladoresAmparo
                .FirstOrDefaultAsync(x => x.AnnoModelo == resolved.Anno.Value && x.Categoria == categoriaAmparo);

            if (amparo is null)
                throw new InvalidOperationException(
                    $"No se encontró precio de amparo para el año {resolved.Anno.Value} y categoría {categoriaAmparo}");

            valorPesos = amparo.PrecioMxn;
            fuentePrecio = "AMPARO";
            precioLookup = PriceLookupResult.Amparo(amparo.Categoria, amparo.Notas, amparo.PrecioMxn);
        }
        else
        {
            if (input.ValorAduanaUsdOverride.HasValue)
            {
                valorUsd = input.ValorAduanaUsdOverride.Value;
                fuentePrecio = "OVERRIDE";
                precioLookup = PriceLookupResult.Override(valorUsd.Value);
            }
            else if (input.PrecioEstimadoIdOverride.HasValue)
            {
                var seleccionAdmin = await _db.PreciosEstimados
                    .Include(x => x.PreciosPorAntiguedad)
                    .Include(x => x.Fraccion)
                    .FirstOrDefaultAsync(x => x.Id == input.PrecioEstimadoIdOverride.Value);

                if (seleccionAdmin is null)
                    throw new InvalidOperationException("La entrada del catálogo seleccionada no existe");

                var antiguedad = Math.Clamp(DateTime.Today.Year - resolved.Anno.Value, 1, 12);
                precioLookup = BuildPriceLookup(seleccionAdmin, antiguedad, "ESPECIFICO", 100,
                    "Precio seleccionado manualmente por el administrador.");
                valorUsd = precioLookup?.PrecioUsd;

                if (seleccionAdmin.Fraccion?.Fraccion is { } fraccionSeleccionada)
                    clasificacion = (fraccionSeleccionada, clasificacion.Categoria);
            }
            else
            {
                precioLookup = await FindPrecioEstimadoAsync(clasificacion.Fraccion, resolved.MarcaId, resolved.Modelo, resolved.Anno.Value, resolved.EngineCylinders, clasificacion.Categoria);
                valorUsd = precioLookup?.PrecioUsd;

                if (precioLookup?.FraccionUsada is { } fraccionCatalogo && fraccionCatalogo != clasificacion.Fraccion)
                    clasificacion = (fraccionCatalogo, clasificacion.Categoria);
            }

            if (valorUsd is null || precioLookup is null)
                throw new InvalidOperationException("No se pudo determinar precio estimado");

            var tipoCambio = await _banxico.GetTipoCambioDofAsync();
            if (tipoCambio is null)
                throw new InvalidOperationException("No se pudo obtener tipo de cambio de Banxico y no hay cache disponible");

            tcReferencia = tipoCambio.TipoCambio;
            tcAplicado = tipoCambio.TipoCambio + input.TcMargen;
            tcStale = tipoCambio.IsStale;
            valorPesos = decimal.Round(valorUsd.Value * tcAplicado.Value, 2);

            outputContexto = tipoCambio.Contexto;
            outputNota = tipoCambio.Nota;

            if (!input.ValorAduanaUsdOverride.HasValue)
                fuentePrecio = precioLookup.FuentePrecio;
        }

        ParametroFiscal? fiscal = null;
        if (regimen != "AMPARO")
            fiscal = await GetParametroFiscalAsync(regimen);
        
        var output = CalculateTaxes(input, resolved, clasificacion, regimen, fuentePrecio, precioLookup, valorUsd, valorPesos, tcReferencia, tcAplicado, outputContexto, outputNota, tcStale, fiscal, honorarios, cargoExpress);
        output.CategoriaAmparoUsada = categoriaAmparoUsada;
        output.CategoriaAmparoOverride = input.CategoriaAmparoOverride;
        if (input.PrecioEstimadoIdOverride.HasValue)
            output.PrecioEstimadoSeleccionadoId = input.PrecioEstimadoIdOverride.Value;
        return output;
    }

    public async Task<CandidatosPrecioOutput> ObtenerCandidatosAsync(CotizacionInput input)
    {
        var resolved = await ResolveVehicleAsync(input);
        if (resolved.Anno is null)
            throw new InvalidOperationException("El año modelo es obligatorio");

        var clasificacion = DetermineFraccion(resolved.CilindradaCm3, input.TipoVehiculo, resolved.VehicleType, resolved.BodyClass, resolved.FuelType);
        var antiguedad = Math.Clamp(DateTime.Today.Year - resolved.Anno.Value, 1, 12);
        var normalizedModel = Normalize(resolved.Modelo ?? "");

        var fraccionesABuscar = _fraccionesGasolina.Contains(clasificacion.Fraccion)
            ? _fraccionesGasolina
            : new[] { clasificacion.Fraccion };

        var fraccionEntities = await _db.FraccionesArancelarias
            .Where(x => fraccionesABuscar.Contains(x.Fraccion))
            .ToListAsync();

        var fraccionIds = fraccionEntities.Select(f => f.Id).ToHashSet();

        var precios = await _db.PreciosEstimados
            .Include(x => x.PreciosPorAntiguedad)
            .Include(x => x.Fraccion)
            .Where(x => fraccionIds.Contains(x.FraccionId) && x.PreciosPorAntiguedad.Any() && !x.EsGenerico)
            .ToListAsync();

        var scored = precios
            .Where(x => !resolved.MarcaId.HasValue || x.MarcaId == resolved.MarcaId)
            .Select(x =>
            {
                var score = ScoreModelMatch(normalizedModel, x.Modelo, resolved.EngineCylinders, clasificacion.Categoria);
                var price = x.PreciosPorAntiguedad
                    .OrderBy(p => Math.Abs(p.AntiguedadAnios - antiguedad))
                    .ThenByDescending(p => p.AntiguedadAnios)
                    .First();
                return new
                {
                    Precio = x,
                    Score = score,
                    Price = price,
                    EsEspecifico = score > 0,
                };
            })
            .Where(x => x.EsEspecifico)
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Price.PrecioUsd)
            .Take(8)
            .ToList();

        var candidatos = scored.Select((x, idx) => new CandidatoPrecio
        {
            PrecioEstimadoId = x.Precio.Id,
            Fraccion = x.Precio.Fraccion?.Fraccion ?? clasificacion.Fraccion,
            ModeloCatalogo = x.Precio.Modelo,
            MarcaTextoCatalogo = x.Precio.MarcaTexto,
            HojaOrigen = x.Precio.HojaOrigen ?? string.Empty,
            MatchTipo = "ESPECIFICO",
            Score = x.Score,
            AntiguedadDisponible = x.Price.AntiguedadAnios,
            EsAntiguedadExacta = x.Price.AntiguedadAnios == antiguedad,
            PrecioUsd = x.Price.PrecioUsd,
            EsSugerido = idx == 0,
            AniosDisponibles = x.Precio.PreciosPorAntiguedad
                .Select(p => p.AntiguedadAnios)
                .OrderBy(a => a)
                .ToList(),
        }).ToList();

        var requiereSeleccion = candidatos.Count == 0
            || candidatos.Count > 1
            || !candidatos[0].EsAntiguedadExacta
            || (candidatos.Count > 1 && candidatos[0].Score - candidatos[1].Score <= 5);

        return new CandidatosPrecioOutput
        {
            Marca = resolved.Marca,
            Modelo = resolved.Modelo,
            Anno = resolved.Anno,
            AntiguedadAnios = antiguedad,
            RequiereSeleccion = requiereSeleccion,
            Candidatos = candidatos,
        };
    }
}
