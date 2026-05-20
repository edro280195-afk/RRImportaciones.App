using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.Query;
using RR.Application.DTOs.Marcas;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class MarcaService : IMarcaService
{
    private readonly AppDbContext _db;

    public MarcaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<MarcaDto>> GetAllAsync()
    {
        return await _db.Marcas
            .Where(m => m.Activo)
            .OrderBy(m => m.Nombre)
            .Select(m => new MarcaDto
            {
                Id = m.Id,
                Nombre = m.Nombre,
                Aliases = m.Aliases,
            })
            .ToListAsync();
    }

    public async Task<MarcaDto?> GetByIdAsync(Guid id)
    {
        return await _db.Marcas
            .Where(m => m.Activo)
            .Select(m => new MarcaDto
            {
                Id = m.Id,
                Nombre = m.Nombre,
                Aliases = m.Aliases,
            })
            .FirstOrDefaultAsync(m => m.Id == id);
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
            })
            .ToListAsync();
    }
}
