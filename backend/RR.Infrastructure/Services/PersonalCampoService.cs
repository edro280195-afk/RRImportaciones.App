using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.PersonalCampo;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class PersonalCampoService : IPersonalCampoService
{
    private readonly AppDbContext _db;

    public PersonalCampoService(AppDbContext db) => _db = db;

    public async Task<List<PersonalCampoDto>> GetAllAsync(bool soloActivos = true)
    {
        var query = _db.PersonalCampo.AsQueryable();
        if (soloActivos) query = query.Where(p => p.Activo);
        return await query.OrderBy(p => p.Nombre).Select(p => new PersonalCampoDto
        {
            Id = p.Id,
            Nombre = p.Nombre,
            Rol = p.Rol,
            Telefono = p.Telefono,
            Activo = p.Activo,
        }).ToListAsync();
    }

    public async Task<PersonalCampoDto?> GetByIdAsync(Guid id)
    {
        var p = await _db.PersonalCampo.FindAsync(id);
        return p == null ? null : Map(p);
    }

    public async Task<PersonalCampoDto> CreateAsync(CreatePersonalCampoRequest request)
    {
        var entity = new PersonalCampo
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Rol = request.Rol,
            Telefono = request.Telefono,
            Activo = true,
        };
        _db.PersonalCampo.Add(entity);
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task<PersonalCampoDto> UpdateAsync(Guid id, UpdatePersonalCampoRequest request)
    {
        var entity = await _db.PersonalCampo.FindAsync(id)
            ?? throw new KeyNotFoundException($"Personal de campo {id} no encontrado");
        entity.Nombre = request.Nombre;
        entity.Rol = request.Rol;
        entity.Telefono = request.Telefono;
        entity.Activo = request.Activo;
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.PersonalCampo.FindAsync(id)
            ?? throw new KeyNotFoundException($"Personal de campo {id} no encontrado");
        _db.PersonalCampo.Remove(entity);
        await _db.SaveChangesAsync();
    }

    private static PersonalCampoDto Map(PersonalCampo p) => new()
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Rol = p.Rol,
        Telefono = p.Telefono,
        Activo = p.Activo,
    };
}
