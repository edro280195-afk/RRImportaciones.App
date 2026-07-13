using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.Query;
using RR.Application.DTOs.Marcas;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class MarcaService : IMarcaService
{
    private readonly AppDbContext _db;

    public MarcaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<MarcaDto>> GetAllAsync(bool soloActivas = true)
    {
        var query = _db.Marcas.AsQueryable();
        if (soloActivas)
            query = query.Where(m => m.Activo);

        return await query
            .OrderByDescending(m => m.Activo)
            .ThenBy(m => m.Nombre)
            .Select(m => new MarcaDto
            {
                Id = m.Id,
                Nombre = m.Nombre,
                Aliases = m.Aliases,
                Activo = m.Activo,
            })
            .ToListAsync();
    }

    public async Task<MarcaDto?> GetByIdAsync(Guid id)
    {
        return await _db.Marcas
            .Where(m => m.Id == id)
            .Select(m => new MarcaDto
            {
                Id = m.Id,
                Nombre = m.Nombre,
                Aliases = m.Aliases,
                Activo = m.Activo,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MarcaDto> CreateAsync(SaveMarcaRequest request)
    {
        var nombre = request.Nombre.Trim();
        if (string.IsNullOrWhiteSpace(nombre))
            throw new InvalidOperationException("El nombre de la marca es obligatorio.");

        var aliases = NormalizeAliases(request.Aliases);
        var existe = await _db.Marcas.AnyAsync(m => m.Nombre.ToLower() == nombre.ToLower());
        if (existe)
            throw new InvalidOperationException($"Ya existe una marca con el nombre '{nombre}'.");

        var marca = new Marca
        {
            Id = Guid.NewGuid(),
            Nombre = nombre,
            Aliases = aliases,
            Activo = request.Activo,
        };

        _db.Marcas.Add(marca);
        await _db.SaveChangesAsync();

        return new MarcaDto { Id = marca.Id, Nombre = marca.Nombre, Aliases = marca.Aliases, Activo = marca.Activo };
    }

    public async Task<MarcaDto> UpdateAsync(Guid id, SaveMarcaRequest request)
    {
        var marca = await _db.Marcas.FindAsync(id)
            ?? throw new KeyNotFoundException("Marca no encontrada.");

        var nombre = request.Nombre.Trim();
        if (string.IsNullOrWhiteSpace(nombre))
            throw new InvalidOperationException("El nombre de la marca es obligatorio.");

        var existe = await _db.Marcas.AnyAsync(m => m.Id != id && m.Nombre.ToLower() == nombre.ToLower());
        if (existe)
            throw new InvalidOperationException($"Ya existe una marca con el nombre '{nombre}'.");

        marca.Nombre = nombre;
        marca.Aliases = NormalizeAliases(request.Aliases);
        marca.Activo = request.Activo;

        await _db.SaveChangesAsync();

        return new MarcaDto { Id = marca.Id, Nombre = marca.Nombre, Aliases = marca.Aliases, Activo = marca.Activo };
    }

    private static string[] NormalizeAliases(string[] aliases)
    {
        return aliases
            .Select(a => a.Trim().ToUpperInvariant())
            .Where(a => a.Length > 0)
            .Distinct()
            .ToArray();
    }

    public async Task<IEnumerable<MarcaDto>> SearchAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return await GetAllAsync();

        var term = query.ToLower();

        return await _db.Marcas
            .Where(m => m.Activo)
            .Where(m =>
                m.Nombre.ToLower().Contains(term) ||
                EF.Functions.ILike(m.Nombre, $"%{term}%") ||
                m.Aliases.Any(a => a.ToLower().Contains(term)))
            .OrderBy(m => m.Nombre)
            .Take(20)
            .Select(m => new MarcaDto
            {
                Id = m.Id,
                Nombre = m.Nombre,
                Aliases = m.Aliases,
                Activo = m.Activo,
            })
            .ToListAsync();
    }
}
