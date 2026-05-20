using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.PartnersExternos;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class PartnerExternoService : IPartnerExternoService
{
    private readonly AppDbContext _db;

    public PartnerExternoService(AppDbContext db) => _db = db;

    public async Task<List<PartnerExternoDto>> GetAllAsync(bool soloActivos = true)
    {
        var query = _db.PartnersExternos.AsQueryable();
        if (soloActivos) query = query.Where(p => p.Activo);
        return await query.OrderBy(p => p.Nombre).Select(p => new PartnerExternoDto
        {
            Id = p.Id,
            Nombre = p.Nombre,
            Aliases = p.Aliases,
            Tipo = p.Tipo,
            Notas = p.Notas,
            Activo = p.Activo,
        }).ToListAsync();
    }

    public async Task<PartnerExternoDto?> GetByIdAsync(Guid id)
    {
        var p = await _db.PartnersExternos.FindAsync(id);
        return p == null ? null : Map(p);
    }

    public async Task<PartnerExternoDto> CreateAsync(CreatePartnerExternoRequest request)
    {
        var entity = new PartnerExterno
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Aliases = request.Aliases ?? [],
            Tipo = request.Tipo,
            Notas = request.Notas,
            Activo = true,
        };
        _db.PartnersExternos.Add(entity);
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task<PartnerExternoDto> UpdateAsync(Guid id, UpdatePartnerExternoRequest request)
    {
        var entity = await _db.PartnersExternos.FindAsync(id)
            ?? throw new KeyNotFoundException($"Partner externo {id} no encontrado");
        entity.Nombre = request.Nombre;
        entity.Aliases = request.Aliases ?? [];
        entity.Tipo = request.Tipo;
        entity.Notas = request.Notas;
        entity.Activo = request.Activo;
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.PartnersExternos.FindAsync(id)
            ?? throw new KeyNotFoundException($"Partner externo {id} no encontrado");
        _db.PartnersExternos.Remove(entity);
        await _db.SaveChangesAsync();
    }

    private static PartnerExternoDto Map(PartnerExterno p) => new()
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Aliases = p.Aliases,
        Tipo = p.Tipo,
        Notas = p.Notas,
        Activo = p.Activo,
    };
}
