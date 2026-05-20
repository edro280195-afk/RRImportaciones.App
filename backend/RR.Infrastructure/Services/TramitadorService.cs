using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Tramitadores;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class TramitadorService : ITramitadorService
{
    private readonly AppDbContext _db;

    public TramitadorService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TramitadorDto>> GetAllAsync(bool soloActivos = true)
    {
        var query = _db.Tramitadores.AsQueryable();
        if (soloActivos) query = query.Where(t => t.Activo);
        return await query.OrderBy(t => t.Nombre).Select(t => new TramitadorDto
        {
            Id = t.Id,
            Nombre = t.Nombre,
            Telefono = t.Telefono,
            Email = t.Email,
            Activo = t.Activo,
            ComisionTipo = t.ComisionTipo,
            ComisionValor = t.ComisionValor,
        }).ToListAsync();
    }

    public async Task<TramitadorDto?> GetByIdAsync(Guid id)
    {
        var t = await _db.Tramitadores.FindAsync(id);
        return t == null ? null : Map(t);
    }

    public async Task<TramitadorDto> CreateAsync(CreateTramitadorRequest request)
    {
        var entity = new Tramitador
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Telefono = request.Telefono,
            Email = request.Email,
            ComisionTipo = request.ComisionTipo,
            ComisionValor = request.ComisionValor,
            Activo = true,
        };
        _db.Tramitadores.Add(entity);
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task<TramitadorDto> UpdateAsync(Guid id, UpdateTramitadorRequest request)
    {
        var entity = await _db.Tramitadores.FindAsync(id)
            ?? throw new KeyNotFoundException($"Tramitador {id} no encontrado");
        entity.Nombre = request.Nombre;
        entity.Telefono = request.Telefono;
        entity.Email = request.Email;
        entity.Activo = request.Activo;
        entity.ComisionTipo = request.ComisionTipo;
        entity.ComisionValor = request.ComisionValor;
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.Tramitadores.FindAsync(id)
            ?? throw new KeyNotFoundException($"Tramitador {id} no encontrado");
        _db.Tramitadores.Remove(entity);
        await _db.SaveChangesAsync();
    }

    private static TramitadorDto Map(Tramitador t) => new()
    {
        Id = t.Id,
        Nombre = t.Nombre,
        Telefono = t.Telefono,
        Email = t.Email,
        Activo = t.Activo,
        ComisionTipo = t.ComisionTipo,
        ComisionValor = t.ComisionValor,
    };
}
