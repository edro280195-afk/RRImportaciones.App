using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Usuarios;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class UsuarioService : IUsuarioService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public UsuarioService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<List<UsuarioListDto>> GetAllAsync()
    {
        return await _db.Usuarios
            .Include(u => u.Role)
            .OrderBy(u => u.Nombre)
            .Select(u => ToDto(u))
            .ToListAsync();
    }

    public async Task<UsuarioListDto?> GetByIdAsync(Guid id)
    {
        var u = await _db.Usuarios.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        return u == null ? null : ToDto(u);
    }

    public async Task<UsuarioListDto> CreateAsync(CreateUsuarioRequest request)
    {
        var existe = await _db.Usuarios.AnyAsync(u => u.Username == request.Username.ToLower().Trim());
        if (existe)
            throw new InvalidOperationException($"El username '{request.Username}' ya existe en este tenant.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = _tenantContext.TenantId,
            Username = request.Username.ToLower().Trim(),
            Nombre = request.Nombre,
            Apellidos = request.Apellidos,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId,
            Activo = request.Activo,
            FechaCreacion = DateTime.UtcNow,
        };

        _db.Usuarios.Add(user);
        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Role).LoadAsync();
        return ToDto(user);
    }

    public async Task<UsuarioListDto> UpdateAsync(Guid id, UpdateUsuarioRequest request)
    {
        var user = await _db.Usuarios.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new KeyNotFoundException($"Usuario {id} no encontrado.");

        user.Nombre = request.Nombre;
        user.Apellidos = request.Apellidos;
        user.Email = request.Email;
        user.RoleId = request.RoleId;
        user.Activo = request.Activo;

        if (!string.IsNullOrWhiteSpace(request.NuevoPassword))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NuevoPassword);

        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Role).LoadAsync();
        return ToDto(user);
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new KeyNotFoundException($"Usuario {id} no encontrado.");

        // Desactivar en lugar de borrar (tienen refresh tokens y auditoría)
        user.Activo = false;
        await _db.SaveChangesAsync();
    }

    private static UsuarioListDto ToDto(User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        Nombre = u.Nombre,
        Apellidos = u.Apellidos,
        Email = u.Email,
        RoleId = u.RoleId,
        RolNombre = u.Role?.Nombre ?? string.Empty,
        Activo = u.Activo,
        UltimoAcceso = u.UltimoAcceso,
        FechaCreacion = u.FechaCreacion,
    };
}
