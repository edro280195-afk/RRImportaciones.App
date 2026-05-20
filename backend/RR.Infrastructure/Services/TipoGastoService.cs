using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.TiposGasto;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class TipoGastoService : ITipoGastoService
{
    private readonly AppDbContext _db;

    public TipoGastoService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<TipoGastoDto>> GetAllAsync()
    {
        return await _db.TiposGastoHormiga
            .OrderBy(t => t.Categoria)
            .ThenBy(t => t.Nombre)
            .Select(t => new TipoGastoDto
            {
                Id = t.Id,
                Categoria = t.Categoria,
                Nombre = t.Nombre,
                Activo = t.Activo,
            })
            .ToListAsync();
    }

    public async Task<TipoGastoDto?> GetByIdAsync(Guid id)
    {
        return await _db.TiposGastoHormiga
            .Where(t => t.Id == id)
            .Select(t => new TipoGastoDto
            {
                Id = t.Id,
                Categoria = t.Categoria,
                Nombre = t.Nombre,
                Activo = t.Activo,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<TipoGastoDto> CreateAsync(CreateTipoGastoRequest request)
    {
        var entity = new TipoGastoHormiga
        {
            Id = Guid.NewGuid(),
            Categoria = request.Categoria,
            Nombre = request.Nombre,
        };

        _db.TiposGastoHormiga.Add(entity);
        await _db.SaveChangesAsync();

        return new TipoGastoDto { Id = entity.Id, Categoria = entity.Categoria, Nombre = entity.Nombre, Activo = entity.Activo };
    }

    public async Task<TipoGastoDto> UpdateAsync(Guid id, CreateTipoGastoRequest request)
    {
        var entity = await _db.TiposGastoHormiga.FindAsync(id)
            ?? throw new KeyNotFoundException("Tipo de gasto no encontrado");

        entity.Categoria = request.Categoria;
        entity.Nombre = request.Nombre;
        await _db.SaveChangesAsync();

        return new TipoGastoDto { Id = entity.Id, Categoria = entity.Categoria, Nombre = entity.Nombre, Activo = entity.Activo };
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.TiposGastoHormiga.FindAsync(id)
            ?? throw new KeyNotFoundException("Tipo de gasto no encontrado");

        _db.TiposGastoHormiga.Remove(entity);
        await _db.SaveChangesAsync();
    }
}
