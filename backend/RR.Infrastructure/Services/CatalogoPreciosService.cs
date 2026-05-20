using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Admin;
using RR.Application.DTOs.Common;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class CatalogoPreciosService(AppDbContext db) : ICatalogoPreciosService
{
    public async Task<PagedResult<CatalogoPrecioListDto>> GetListAsync(
        string? search,
        string? fraccion,
        Guid? marcaId,
        string? tipoVehiculo,
        bool? esGenerico,
        int page,
        int pageSize)
    {
        var query = db.PreciosEstimados
            .Include(x => x.Fraccion)
            .Include(x => x.PreciosPorAntiguedad)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLowerInvariant();
            query = query.Where(x =>
                x.Modelo.ToLower().Contains(lower) ||
                x.MarcaTexto.ToLower().Contains(lower));
        }

        if (!string.IsNullOrWhiteSpace(fraccion))
            query = query.Where(x => x.Fraccion.Fraccion == fraccion);

        if (marcaId.HasValue)
            query = query.Where(x => x.MarcaId == marcaId);

        if (!string.IsNullOrWhiteSpace(tipoVehiculo))
            query = query.Where(x => x.Fraccion.TipoVehiculo == tipoVehiculo);

        if (esGenerico.HasValue)
            query = query.Where(x => x.EsGenerico == esGenerico.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(x => x.Fraccion.Fraccion)
            .ThenBy(x => x.MarcaTexto)
            .ThenBy(x => x.Modelo)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new CatalogoPrecioListDto
            {
                Id = x.Id,
                Fraccion = x.Fraccion.Fraccion,
                FraccionDescripcion = x.Fraccion.Descripcion,
                TipoVehiculo = x.Fraccion.TipoVehiculo,
                MarcaId = x.MarcaId,
                MarcaTexto = x.MarcaTexto,
                Modelo = x.Modelo,
                Categoria = x.Categoria,
                Inciso = x.Inciso,
                EsGenerico = x.EsGenerico,
                HojaOrigen = x.HojaOrigen,
                AniosDisponibles = x.PreciosPorAntiguedad
                    .OrderBy(p => p.AntiguedadAnios)
                    .Select(p => p.AntiguedadAnios)
                    .ToList(),
                PrecioMinUsd = x.PreciosPorAntiguedad.Any()
                    ? x.PreciosPorAntiguedad.Min(p => p.PrecioUsd)
                    : null,
                PrecioMaxUsd = x.PreciosPorAntiguedad.Any()
                    ? x.PreciosPorAntiguedad.Max(p => p.PrecioUsd)
                    : null,
            })
            .ToListAsync();

        return new PagedResult<CatalogoPrecioListDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<CatalogoPrecioDetailDto?> GetByIdAsync(Guid id)
    {
        var x = await db.PreciosEstimados
            .Include(x => x.Fraccion)
            .Include(x => x.PreciosPorAntiguedad)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (x is null) return null;

        return MapToDetail(x);
    }

    public async Task<CatalogoStatsDto> GetStatsAsync()
    {
        var total = await db.PreciosEstimados.CountAsync();
        var genericos = await db.PreciosEstimados.CountAsync(x => x.EsGenerico);
        var fracciones = await db.PreciosEstimados
            .Select(x => x.FraccionId)
            .Distinct()
            .CountAsync();

        return new CatalogoStatsDto
        {
            TotalEntradas = total,
            TotalFracciones = fracciones,
            EntradasGenericas = genericos,
            EntradasEspecificas = total - genericos,
        };
    }

    public async Task<CatalogoPrecioDetailDto> CreateAsync(CreateCatalogoPrecioRequest request)
    {
        var fraccion = await db.FraccionesArancelarias
            .FirstOrDefaultAsync(x => x.Fraccion == request.FraccionCodigo)
            ?? throw new InvalidOperationException(
                $"Fracción arancelaria '{request.FraccionCodigo}' no existe en la base de datos.");

        // Validar años únicos
        var aniosRepetidos = request.Precios
            .GroupBy(p => p.AntiguedadAnios)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (aniosRepetidos.Count > 0)
            throw new InvalidOperationException(
                $"Los años {string.Join(", ", aniosRepetidos)} están duplicados en la lista de precios.");

        var entry = new RR.Domain.Entities.PrecioEstimado
        {
            Id = Guid.NewGuid(),
            FraccionId = fraccion.Id,
            MarcaTexto = request.MarcaTexto,
            Modelo = request.Modelo,
            Categoria = request.Categoria,
            Inciso = request.Inciso,
            HojaOrigen = request.HojaOrigen,
            EsGenerico = request.EsGenerico,
        };

        db.PreciosEstimados.Add(entry);

        foreach (var item in request.Precios)
        {
            db.PreciosPorAntiguedad.Add(new RR.Domain.Entities.PrecioPorAntiguedad
            {
                Id = Guid.NewGuid(),
                PrecioEstimadoId = entry.Id,
                AntiguedadAnios = item.AntiguedadAnios,
                PrecioUsd = item.PrecioUsd,
            });
        }

        await db.SaveChangesAsync();

        // Recargar con todas las navegaciones para el mapeo
        var saved = await db.PreciosEstimados
            .Include(x => x.Fraccion)
            .Include(x => x.PreciosPorAntiguedad)
            .FirstAsync(x => x.Id == entry.Id);

        return MapToDetail(saved);
    }

    public async Task<CatalogoPrecioDetailDto> UpdateAsync(Guid id, UpdateCatalogoPrecioRequest request)
    {
        var entry = await db.PreciosEstimados
            .Include(x => x.Fraccion)
            .Include(x => x.PreciosPorAntiguedad)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException($"Entrada {id} no encontrada en el catálogo");

        entry.MarcaTexto = request.MarcaTexto;
        entry.Modelo = request.Modelo;
        entry.Categoria = request.Categoria;
        entry.Inciso = request.Inciso;
        entry.HojaOrigen = request.HojaOrigen;
        entry.EsGenerico = request.EsGenerico;

        // Actualizar precios por antigüedad existentes (no crea ni elimina filas)
        foreach (var item in request.Precios)
        {
            var precio = entry.PreciosPorAntiguedad.FirstOrDefault(p => p.Id == item.Id);
            if (precio is not null)
                precio.PrecioUsd = item.PrecioUsd;
        }

        await db.SaveChangesAsync();
        return MapToDetail(entry);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entry = await db.PreciosEstimados
            .Include(x => x.PreciosPorAntiguedad)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException($"Entrada {id} no encontrada en el catálogo");

        // EF Core elimina PreciosPorAntiguedad en cascada por la FK configurada
        db.PreciosEstimados.Remove(entry);
        await db.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CatalogoPrecioDetailDto MapToDetail(RR.Domain.Entities.PrecioEstimado x)
    {
        var precios = x.PreciosPorAntiguedad
            .OrderBy(p => p.AntiguedadAnios)
            .Select(p => new PrecioAntiguedadDto
            {
                Id = p.Id,
                AntiguedadAnios = p.AntiguedadAnios,
                PrecioUsd = p.PrecioUsd,
            })
            .ToList();

        return new CatalogoPrecioDetailDto
        {
            Id = x.Id,
            Fraccion = x.Fraccion.Fraccion,
            FraccionDescripcion = x.Fraccion.Descripcion,
            TipoVehiculo = x.Fraccion.TipoVehiculo,
            MarcaId = x.MarcaId,
            MarcaTexto = x.MarcaTexto,
            Modelo = x.Modelo,
            Categoria = x.Categoria,
            Inciso = x.Inciso,
            EsGenerico = x.EsGenerico,
            HojaOrigen = x.HojaOrigen,
            AniosDisponibles = precios.Select(p => p.AntiguedadAnios).ToList(),
            PrecioMinUsd = precios.Any() ? precios.Min(p => p.PrecioUsd) : null,
            PrecioMaxUsd = precios.Any() ? precios.Max(p => p.PrecioUsd) : null,
            Precios = precios,
        };
    }
}
