using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.DTOs.Reportes;
using RR.Application.DTOs.Tramites;
using RR.Domain.Entities;

namespace RR.Infrastructure.Services;

public partial class CotizadorService
{
    public async Task<CotizacionOutput> CrearCotizacionAsync(GuardarCotizacionRequest request)
    {
        var output = await CalcularCotizacionAsync(request);
        var folio = string.IsNullOrWhiteSpace(request.Folio) ? await GenerateFolioAsync() : request.Folio.Trim().ToUpperInvariant();

        var entity = new Cotizacion
        {
            Id = Guid.NewGuid(),
            Folio = folio,
            ClienteId = request.ClienteId,
            Notas = request.Notas,
            FechaExpiracion = request.FechaExpiracion ?? DateTime.UtcNow.Date.AddDays(7),
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };

        ApplyOutput(entity, output);
        _db.Cotizaciones.Add(entity);
        AddDetails(entity, output);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _db.ChangeTracker.Clear();
            throw new InvalidOperationException("Conflicto al guardar la cotización. Intente de nuevo.", ex);
        }

        output.Id = entity.Id;
        output.Folio = folio;
        output.ClienteId = request.ClienteId;
        output.Notas = request.Notas;
        output.FechaExpiracion = entity.FechaExpiracion;
        return output;
    }

    public async Task<CotizacionOutput> ActualizarCotizacionAsync(Guid id, GuardarCotizacionRequest request)
    {
        var entity = await _db.Cotizaciones.Include(x => x.Detalles).FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
            throw new KeyNotFoundException("Cotización no encontrada");
        if (!string.Equals(entity.EstadoLogistico, "BORRADOR", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Solo se pueden editar cotizaciones en borrador");

        var output = await CalcularCotizacionAsync(request);
        entity.ClienteId = request.ClienteId;
        entity.Notas = request.Notas;
        entity.FechaExpiracion = request.FechaExpiracion ?? entity.FechaExpiracion ?? DateTime.UtcNow.Date.AddDays(7);
        entity.FechaModificacion = DateTime.UtcNow;
        ApplyOutput(entity, output);

        _db.CotizacionesDetalles.RemoveRange(entity.Detalles);
        AddDetails(entity, output);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _db.ChangeTracker.Clear();
            throw new InvalidOperationException("Conflicto al guardar la cotización. Intente de nuevo.", ex);
        }

        output.Id = entity.Id;
        output.Folio = entity.Folio;
        output.ClienteId = entity.ClienteId;
        output.Notas = entity.Notas;
        output.FechaExpiracion = entity.FechaExpiracion;
        return output;
    }

    public async Task<PagedResult<CotizacionListDto>> GetListAsync(Guid? clienteId, string? estado, DateTime? fechaDesde, string? search, int page, int pageSize)
    {
        await ExpirarCotizacionesAsync();

        var query = _db.Cotizaciones.Include(x => x.Cliente).Include(x => x.Tramite).AsQueryable();
        if (clienteId.HasValue)
            query = query.Where(x => x.ClienteId == clienteId);
        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(x => x.EstadoLogistico == estado);
        if (fechaDesde.HasValue)
            query = query.Where(x => x.FechaCreacion >= fechaDesde.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToUpper();
            query = query.Where(x => (x.Folio ?? "").ToUpper().Contains(s) || (x.Vin ?? "").ToUpper().Contains(s) || (x.Modelo ?? "").ToUpper().Contains(s));
        }

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.FechaCreacion)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new CotizacionListDto
            {
                Id = x.Id,
                Folio = x.Folio,
                Estado = x.EstadoLogistico ?? "BORRADOR",
                ClienteNombre = x.Cliente != null ? x.Cliente.Apodo : null,
                Vin = x.Vin,
                Vehiculo = ((x.MarcaTexto ?? "") + " " + (x.Modelo ?? "")).Trim(),
                Anno = x.AnnoModelo,
                Total = x.TotalGeneral ?? 0m,
                TramiteId = x.TramiteId,
                TramiteNumero = x.Tramite != null ? x.Tramite.NumeroConsecutivo : null,
                FechaCreacion = x.FechaCreacion,
                FechaExpiracion = x.FechaExpiracion,
            })
            .ToListAsync();

        return new PagedResult<CotizacionListDto> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<CotizacionOutput?> GetByIdAsync(Guid id)
    {
        var x = await _db.Cotizaciones.Include(c => c.Cliente).Include(c => c.Tramite).FirstOrDefaultAsync(c => c.Id == id);
        return x is null ? null : ToOutput(x);
    }

    public async Task<CotizacionOutput> RecalcularAsync(Guid id)
    {
        var entity = await _db.Cotizaciones.Include(x => x.Detalles).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada");
        if (entity.TramiteId.HasValue || string.Equals(entity.EstadoLogistico, "CONVERTIDA", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("La cotizacion ya fue convertida y no se puede recalcular");

        var input = new CotizacionInput
        {
            Vin = entity.Vin,
            MarcaId = entity.MarcaId,
            Marca = entity.MarcaTexto,
            Modelo = entity.Modelo,
            Anno = entity.AnnoModelo,
            CilindradaCm3 = entity.CilindradaCm3,
            TipoVehiculo = entity.Categoria,
            ValorAduanaUsdOverride = entity.FuentePrecio == "OVERRIDE" ? entity.ValorAduanaUsd : null,
            PrecioEstimadoIdOverride = entity.PrecioEstimadoSeleccionadoId,
            TcMargen = (entity.TipoCambioAplicado.HasValue && entity.TipoCambioReferencia.HasValue)
                ? entity.TipoCambioAplicado.Value - entity.TipoCambioReferencia.Value
                : 0.30m,
            TipoTramite = (entity.CargoExpress ?? 0m) > 0m ? "EXPRESS" : "NORMAL",
            HonorariosOverride = entity.TotalHonorarios,
            CategoriaAmparoOverride = entity.CategoriaAmparoSeleccionada,
        };

        var output = await CalcularCotizacionAsync(input);
        ApplyOutput(entity, output);
        entity.FechaModificacion = DateTime.UtcNow;
        _db.CotizacionesDetalles.RemoveRange(entity.Detalles);
        entity.Detalles.Clear();
        AddDetails(entity, output);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _db.ChangeTracker.Clear();
            throw new InvalidOperationException("Conflicto al guardar la cotización. Intente de nuevo.", ex);
        }

        output.Id = entity.Id;
        output.Folio = entity.Folio;
        output.ClienteId = entity.ClienteId;
        output.Notas = entity.Notas;
        output.FechaExpiracion = entity.FechaExpiracion;
        output.Estado = entity.EstadoLogistico ?? "BORRADOR";
        return output;
    }

    public async Task<TramiteDetailDto> ConvertirATramiteAsync(Guid id, ConvertirCotizacionRequest request)
    {
        var cotizacion = await _db.Cotizaciones
            .Include(x => x.Tramite)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada");

        if (!string.Equals(cotizacion.EstadoLogistico, "ACEPTADA", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Solo una cotizacion aceptada puede convertirse a tramite");
        if (cotizacion.TramiteId.HasValue)
            throw new InvalidOperationException("La cotizacion ya fue convertida a tramite");
        if (!cotizacion.ClienteId.HasValue)
            throw new InvalidOperationException("Cotizacion sin cliente vinculado");

        var aduana = await _db.Aduanas.FirstOrDefaultAsync(x => x.ClaveAduana == request.AduanaCodigo)
            ?? throw new InvalidOperationException("Aduana no encontrada");
        var tramitador = await _db.Tramitadores.FirstOrDefaultAsync(x => x.Id == request.TramitadorId && x.Activo)
            ?? throw new InvalidOperationException("Tramitador no encontrado o inactivo");

        var vehiculoId = await GetOrCreateVehiculoAsync(cotizacion);
        var numero = await GenerateTramiteNumeroAsync();
        var cargoExpress = request.TipoTramite.Equals("EXPRESS", StringComparison.OrdinalIgnoreCase) ? cotizacion.CargoExpress ?? 0m : 0m;

        var tramite = new Tramite
        {
            Id = Guid.NewGuid(),
            NumeroConsecutivo = numero,
            ClienteId = cotizacion.ClienteId,
            VehiculoId = vehiculoId,
            AduanaId = aduana.Id,
            TramitadorId = tramitador.Id,
            CotizacionOrigenId = cotizacion.Id,
            DescripcionMercancia = $"{cotizacion.MarcaTexto} {cotizacion.Modelo} {cotizacion.AnnoModelo}".Trim(),
            TipoTramite = request.TipoTramite,
            EstadoLogistico = "PENDIENTE_TRAMITE",
            CobroTotal = cotizacion.TotalGeneral ?? 0m,
            Honorarios = cotizacion.TotalHonorarios ?? 0m,
            CargoExpress = cargoExpress,
            Notas = request.NotasAdicionales,
            FechaEstadoActual = DateTime.UtcNow,
            FechaCreacion = DateTime.UtcNow,
        };

        cotizacion.TramiteId = tramite.Id;
        cotizacion.EstadoLogistico = "CONVERTIDA";
        cotizacion.FechaModificacion = DateTime.UtcNow;

        _db.Tramites.Add(tramite);
        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            Tipo = "CREACION",
            Contenido = $"Tramite originado por cotizacion #{cotizacion.Folio}",
            EstadoNuevo = "PENDIENTE_TRAMITE",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        _db.TareasCampo.Add(new TareaCampo
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            Tipo = "FOTOS_YARDA",
            EstadoLogistico = "ABIERTA",
            FechaCreacion = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        var estadoAnterior = tramite.EstadoLogistico;
        tramite.EstadoLogistico = "FOTOS_SOLICITADAS";
        tramite.FechaEstadoActual = DateTime.UtcNow;
        tramite.FechaModificacion = DateTime.UtcNow;

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            Tipo = "CAMBIO_ESTADO",
            EstadoAnterior = estadoAnterior,
            EstadoNuevo = "FOTOS_SOLICITADAS",
            Contenido = "Tarea de campo creada automaticamente para toma de fotos y validacion de unidad.",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();
        return await BuildTramiteDetailAsync(tramite.Id);
    }

    public async Task<CotizacionDashboardDto> GetDashboardAsync()
    {
        await ExpirarCotizacionesAsync();
        var today = DateTime.UtcNow.Date;
        return new CotizacionDashboardDto
        {
            PendientesRespuesta = await _db.Cotizaciones.CountAsync(x => x.EstadoLogistico == "ENVIADA" && !x.TramiteId.HasValue && (x.FechaExpiracion == null || x.FechaExpiracion >= today)),
            PorExpirar = await _db.Cotizaciones.CountAsync(x => (x.EstadoLogistico == "ENVIADA" || x.EstadoLogistico == "BORRADOR") && !x.TramiteId.HasValue && x.FechaExpiracion != null && x.FechaExpiracion >= today && x.FechaExpiracion <= today.AddDays(2)),
            AceptadasListas = await _db.Cotizaciones
                .Include(x => x.Cliente)
                .Where(x => x.EstadoLogistico == "ACEPTADA" && !x.TramiteId.HasValue)
                .OrderByDescending(x => x.FechaModificacion ?? x.FechaCreacion)
                .Take(5)
                .Select(x => new CotizacionListDto
                {
                    Id = x.Id,
                    Folio = x.Folio,
                    Estado = x.EstadoLogistico ?? "BORRADOR",
                    ClienteNombre = x.Cliente != null ? x.Cliente.Apodo : null,
                    Vin = x.Vin,
                    Vehiculo = ((x.MarcaTexto ?? "") + " " + (x.Modelo ?? "")).Trim(),
                    Anno = x.AnnoModelo,
                    Total = x.TotalGeneral ?? 0m,
                    FechaCreacion = x.FechaCreacion,
                    FechaExpiracion = x.FechaExpiracion,
                })
                .ToListAsync(),
        };
    }

    public async Task<ConversionCotizacionesDto> GetReporteConversionAsync(DateTime? desde, DateTime? hasta)
    {
        await ExpirarCotizacionesAsync();
        var start = ToUtcDate(desde) ?? DateTime.UtcNow.Date.AddMonths(-1);
        var endExclusive = (ToUtcDate(hasta) ?? DateTime.UtcNow.Date).AddDays(1);
        var query = _db.Cotizaciones.Include(x => x.Cliente).Where(x => x.FechaCreacion >= start && x.FechaCreacion < endExclusive);
        var total = await query.CountAsync();
        var aceptadas = await query.CountAsync(x => x.EstadoLogistico == "ACEPTADA" || x.EstadoLogistico == "CONVERTIDA");
        var rechazadas = await query.CountAsync(x => x.EstadoLogistico == "RECHAZADA");
        var expiradas = await query.CountAsync(x => x.EstadoLogistico == "EXPIRADA");

        var aceptadasFechas = await query
            .Where(x => (x.EstadoLogistico == "ACEPTADA" || x.EstadoLogistico == "CONVERTIDA") && x.FechaModificacion != null)
            .Select(x => new { x.FechaCreacion, x.FechaModificacion })
            .ToListAsync();

        return new ConversionCotizacionesDto
        {
            TotalEmitidas = total,
            TotalAceptadas = aceptadas,
            TotalRechazadas = rechazadas,
            TotalExpiradas = expiradas,
            TasaConversionGlobal = total == 0 ? 0m : decimal.Round((decimal)aceptadas / total * 100m, 2),
            TiempoPromedioAceptacionDias = aceptadasFechas.Count == 0 ? 0m : decimal.Round((decimal)aceptadasFechas.Average(x => (x.FechaModificacion!.Value - x.FechaCreacion).TotalDays), 2),
            TopClientes = await query
                .GroupBy(x => new { x.ClienteId, Cliente = x.Cliente != null ? x.Cliente.Apodo : "Sin cliente" })
                .OrderByDescending(g => g.Count())
                .Take(10)
                .Select(g => new TopClienteCotizacionesDto
                {
                    ClienteId = g.Key.ClienteId,
                    Cliente = g.Key.Cliente,
                    TotalCotizaciones = g.Count(),
                })
                .ToListAsync(),
        };
    }

    private static DateTime? ToUtcDate(DateTime? value)
    {
        if (!value.HasValue) return null;

        var date = value.Value.Date;
        return date.Kind switch
        {
            DateTimeKind.Utc => date,
            DateTimeKind.Local => date.ToUniversalTime().Date,
            _ => DateTime.SpecifyKind(date, DateTimeKind.Utc)
        };
    }

    public async Task MarcarEnviadaAsync(Guid id, MarcarEnviadaRequest request)
    {
        var c = await GetEntityAsync(id);
        if (!string.Equals(c.EstadoLogistico, "BORRADOR", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(c.EstadoLogistico, "ENVIADA", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"No se puede marcar como enviada una cotizacion en estado {c.EstadoLogistico}. Solo se permite desde BORRADOR o ENVIADA.");

        c.EstadoLogistico = "ENVIADA";
        c.FechaEnvio = DateTime.UtcNow;
        c.EnviadoPor = request.EnviadoPor;
        c.EnviadoA = request.EnviadoA;
        c.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task AceptarAsync(Guid id)
    {
        var c = await GetEntityAsync(id);
        if (!string.Equals(c.EstadoLogistico, "ENVIADA", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"No se puede aceptar una cotizacion en estado {c.EstadoLogistico}. Primero debe ser enviada al cliente.");

        c.EstadoLogistico = "ACEPTADA";
        c.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task RechazarAsync(Guid id, string motivo)
    {
        var c = await GetEntityAsync(id);
        if (!string.Equals(c.EstadoLogistico, "ENVIADA", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"No se puede rechazar una cotizacion en estado {c.EstadoLogistico}. Primero debe ser enviada al cliente.");

        c.EstadoLogistico = "RECHAZADA";
        c.MotivoRechazo = motivo;
        c.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task<Cotizacion> GetEntityAsync(Guid id)
    {
        return await _db.Cotizaciones.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Cotización no encontrada");
    }

    private async Task<string> GenerateFolioAsync()
    {
        var prefix = $"COT-{DateTime.Today:yyyyMM}-";
        var count = await _db.Cotizaciones.CountAsync(x => x.Folio != null && x.Folio.StartsWith(prefix));
        return $"{prefix}{count + 1:0000}";
    }

    private async Task<string> GenerateTramiteNumeroAsync()
    {
        var maxNum = await _db.Tramites.MaxAsync(t => (string?)t.NumeroConsecutivo) ?? "RR-0000";
        if (maxNum.Length >= 3 && int.TryParse(maxNum[3..], out var lastNum))
            return $"RR-{lastNum + 1:D4}";
        return "RR-0001";
    }

    private async Task<Guid> GetOrCreateVehiculoAsync(Cotizacion cotizacion)
    {
        var vin = string.IsNullOrWhiteSpace(cotizacion.Vin)
            ? $"COT{cotizacion.Id:N}"[..17].ToUpperInvariant()
            : cotizacion.Vin.Trim().ToUpperInvariant();

        var existing = await _db.Vehiculos.FirstOrDefaultAsync(x => x.Vin == vin && x.ClienteId == cotizacion.ClienteId!.Value);
        if (existing is not null)
            return existing.Id;

        var fraccionId = await _db.FraccionesArancelarias
            .Where(x => x.Fraccion == cotizacion.Fraccion)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync();

        var vehiculo = new Vehiculo
        {
            Id = Guid.NewGuid(),
            ClienteId = cotizacion.ClienteId!.Value,
            Vin = vin,
            VinCorto = vin.Length >= 6 ? vin[^6..] : vin,
            MarcaId = cotizacion.MarcaId,
            Anno = cotizacion.AnnoModelo,
            CilindradaCm3 = cotizacion.CilindradaCm3,
            Categoria = cotizacion.Categoria,
            ValorFactura = cotizacion.ValorAduanaUsd,
            Moneda = "USD",
            FraccionArancelariaId = fraccionId,
            FechaRegistro = DateTime.UtcNow,
        };

        if (cotizacion.MarcaId.HasValue && !string.IsNullOrWhiteSpace(cotizacion.Modelo))
        {
            var modelName = cotizacion.Modelo.Trim();
            var modelo = await _db.Modelos.FirstOrDefaultAsync(x => x.MarcaId == cotizacion.MarcaId && x.Nombre.ToUpper() == modelName.ToUpper());
            if (modelo is null)
            {
                modelo = new Modelo { Id = Guid.NewGuid(), MarcaId = cotizacion.MarcaId.Value, Nombre = modelName };
                _db.Modelos.Add(modelo);
            }
            vehiculo.ModeloId = modelo.Id;
        }

        _db.Vehiculos.Add(vehiculo);
        return vehiculo.Id;
    }

    private async Task<TramiteDetailDto> BuildTramiteDetailAsync(Guid id)
    {
        return await _db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v.Modelo)
            .Include(t => t.Aduana)
            .Include(t => t.Tramitador)
            .Include(t => t.CotizacionOrigen)
            .Include(t => t.Eventos)
            .Where(t => t.Id == id)
            .Select(t => new TramiteDetailDto
            {
                Id = t.Id,
                NumeroConsecutivo = t.NumeroConsecutivo,
                ClienteId = t.ClienteId,
                ClienteApodo = t.Cliente != null ? t.Cliente.Apodo : null,
                ClienteNombre = t.Cliente != null ? t.Cliente.NombreCompleto : null,
                VehiculoId = t.VehiculoId,
                VehiculoVin = t.Vehiculo != null ? t.Vehiculo.Vin : null,
                VehiculoVinCorto = t.Vehiculo != null ? t.Vehiculo.VinCorto : null,
                VehiculoMarca = t.Vehiculo != null && t.Vehiculo.Marca != null ? t.Vehiculo.Marca.Nombre : null,
                VehiculoModelo = t.Vehiculo != null && t.Vehiculo.Modelo != null ? t.Vehiculo.Modelo.Nombre : null,
                VehiculoAnno = t.Vehiculo != null ? t.Vehiculo.Anno : null,
                DescripcionMercancia = t.DescripcionMercancia,
                AduanaId = t.AduanaId,
                AduanaNombre = t.Aduana != null ? t.Aduana.Nombre : null,
                TramitadorId = t.TramitadorId,
                TramitadorNombre = t.Tramitador != null ? t.Tramitador.Nombre : null,
                CotizacionOrigenId = t.CotizacionOrigenId,
                CotizacionOrigenFolio = t.CotizacionOrigen != null ? t.CotizacionOrigen.Folio : null,
                CotizacionFecha = t.CotizacionOrigen != null ? t.CotizacionOrigen.FechaCreacion : null,
                TipoTramite = t.TipoTramite,
                EstadoLogistico = t.EstadoLogistico,
                CobroTotal = t.CobroTotal,
                Honorarios = t.Honorarios,
                CargoExpress = t.CargoExpress,
                Notas = t.Notas,
                FechaInicio = t.FechaInicio,
                FechaEstadoActual = t.FechaEstadoActual,
                FechaCreacion = t.FechaCreacion,
                FechaModificacion = t.FechaModificacion,
                Eventos = t.Eventos.OrderByDescending(e => e.FechaEvento).Select(e => new TramiteEventoDto
                {
                    Id = e.Id,
                    Tipo = e.Tipo,
                    EstadoAnterior = e.EstadoAnterior,
                    EstadoNuevo = e.EstadoNuevo,
                    Contenido = e.Contenido,
                    FotoUrl = e.FotoUrl,
                    FechaEvento = e.FechaEvento,
                }).ToList(),
            })
            .FirstAsync();
    }

    private async Task ExpirarCotizacionesAsync()
    {
        var today = DateTime.UtcNow.Date;
        var expired = await _db.Cotizaciones
            .Where(x => !x.TramiteId.HasValue && x.FechaExpiracion != null && x.FechaExpiracion < today && (x.EstadoLogistico == "BORRADOR" || x.EstadoLogistico == "ENVIADA"))
            .ToListAsync();
        if (expired.Count == 0)
            return;
        foreach (var cotizacion in expired)
        {
            cotizacion.EstadoLogistico = "EXPIRADA";
            cotizacion.FechaModificacion = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
    }

    private static void ApplyOutput(Cotizacion entity, CotizacionOutput output)
    {
        entity.Vin = output.Vin;
        entity.MarcaId = output.MarcaId;
        entity.MarcaTexto = output.Marca;
        entity.Modelo = output.Modelo;
        entity.AnnoModelo = output.Anno;
        entity.CilindradaCm3 = output.CilindradaCm3;
        entity.Categoria = output.Categoria;
        entity.Fraccion = output.Fraccion;
        entity.RegimenFiscal = output.RegimenFiscal;
        entity.FuentePrecio = output.FuentePrecio;
        entity.PrecioCatalogoMarca = output.PrecioCatalogoMarca;
        entity.PrecioCatalogoModelo = output.PrecioCatalogoModelo;
        entity.PrecioCatalogoOrigen = output.PrecioCatalogoOrigen;
        entity.PrecioAntiguedadAnios = output.PrecioAntiguedadAnios;
        entity.PrecioMatchTipo = output.PrecioMatchTipo;
        entity.PrecioMatchScore = output.PrecioMatchScore;
        entity.PrecioAdvertencia = output.PrecioAdvertencia;
        entity.ValorAduanaUsd = output.ValorAduanaUsd;
        entity.ValorPesos = output.ValorPesos;
        entity.TipoCambioReferencia = output.TipoCambioReferencia;
        entity.TipoCambioAplicado = output.TipoCambioAplicado;
        entity.TipoCambioContexto = output.TipoCambioContexto;
        entity.TipoCambioNota = output.TipoCambioNota;
        entity.IgiPorcentaje = output.IgiPorcentaje;
        entity.Igi = output.Igi;
        entity.Dta = output.Dta;
        entity.Iva = output.Iva;
        entity.Prev = output.Prev;
        entity.Prv = output.Prv;
        entity.TotalHonorarios = output.Honorarios;
        entity.TotalContribuciones = output.ImpuestosTotal;
        entity.CargoExpress = output.CargoExpress;
        entity.TotalGeneral = output.Total;
        entity.PrecioEstimadoSeleccionadoId = output.PrecioEstimadoSeleccionadoId;
        entity.CategoriaAmparoSeleccionada = output.CategoriaAmparoOverride;
        entity.EstadoLogistico ??= "BORRADOR";
    }

    private static CotizacionOutput ToOutput(Cotizacion x)
    {
        return new CotizacionOutput
        {
            Id = x.Id,
            Folio = x.Folio,
            TramiteId = x.TramiteId,
            TramiteNumero = x.Tramite != null ? x.Tramite.NumeroConsecutivo : null,
            ClienteId = x.ClienteId,
            ClienteNombre = x.Cliente?.NombreCompleto ?? x.Cliente?.Nombre,
            ClienteApodo = x.Cliente?.Apodo,
            ClienteTelefono = x.Cliente?.Telefono,
            ClienteEmail = x.Cliente?.Email,
            CategoriaAmparoOverride = x.CategoriaAmparoSeleccionada,
            PrecioEstimadoSeleccionadoId = x.PrecioEstimadoSeleccionadoId,
            Estado = x.EstadoLogistico ?? "BORRADOR",
            Vin = x.Vin,
            MarcaId = x.MarcaId,
            Marca = x.MarcaTexto,
            Modelo = x.Modelo,
            Anno = x.AnnoModelo,
            CilindradaCm3 = x.CilindradaCm3,
            Categoria = x.Categoria ?? "",
            Fraccion = x.Fraccion ?? "",
            RegimenFiscal = x.RegimenFiscal ?? "",
            FuentePrecio = x.FuentePrecio ?? "",
            PrecioCatalogoMarca = x.PrecioCatalogoMarca,
            PrecioCatalogoModelo = x.PrecioCatalogoModelo,
            PrecioCatalogoOrigen = x.PrecioCatalogoOrigen,
            PrecioAntiguedadAnios = x.PrecioAntiguedadAnios,
            PrecioMatchTipo = x.PrecioMatchTipo,
            PrecioMatchScore = x.PrecioMatchScore,
            PrecioAdvertencia = x.PrecioAdvertencia,
            ValorAduanaUsd = x.ValorAduanaUsd,
            ValorPesos = x.ValorPesos ?? 0m,
            TipoCambioReferencia = x.TipoCambioReferencia,
            TipoCambioAplicado = x.TipoCambioAplicado,
            TipoCambioContexto = x.TipoCambioContexto,
            TipoCambioNota = x.TipoCambioNota,
            IgiPorcentaje = x.IgiPorcentaje ?? 0m,
            Igi = x.Igi ?? 0m,
            Dta = x.Dta ?? 0m,
            Iva = x.Iva ?? 0m,
            Prev = x.Prev ?? 0m,
            Prv = x.Prv ?? 0m,
            ImpuestosTotal = x.TotalContribuciones ?? 0m,
            Honorarios = x.TotalHonorarios ?? 0m,
            CargoExpress = x.CargoExpress ?? 0m,
            Total = x.TotalGeneral ?? 0m,
            Notas = x.Notas,
            FechaExpiracion = x.FechaExpiracion,
            FechaEnvio = x.FechaEnvio,
            EnviadoPor = x.EnviadoPor,
            EnviadoA = x.EnviadoA,
        };
    }

    private void AddDetails(Cotizacion entity, CotizacionOutput output)
    {
        var details = new (string Concepto, string Tipo, decimal Monto)[]
        {
            ("Valor en pesos", "BASE", output.ValorPesos),
            ("IGI", "IMPUESTO", output.Igi),
            ("DTA", "IMPUESTO", output.Dta),
            ("IVA", "IMPUESTO", output.Iva),
            ("PREV", "IMPUESTO", output.Prev),
            ("PRV", "IMPUESTO", output.Prv),
            ("Honorarios", "HONORARIO", output.Honorarios),
            ("Cargo express", "CARGO", output.CargoExpress),
        };

        var order = 1;
        foreach (var d in details.Where(x => x.Monto != 0m))
        {
            entity.Detalles.Add(new CotizacionDetalle
            {
                Id = Guid.NewGuid(),
                Concepto = d.Concepto,
                Tipo = d.Tipo,
                Monto = d.Monto,
                Orden = order++,
            });
        }
    }
}
