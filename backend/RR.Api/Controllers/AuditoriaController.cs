using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Auditoria;
using RR.Infrastructure.Data;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/auditoria")]
[Authorize]
public class AuditoriaController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditoriaController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? entidad = null,
        [FromQuery] string? accion = null,
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null,
        [FromQuery] string? usuarioNombre = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.AuditoriaLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entidad))
            query = query.Where(l => l.Entidad == entidad);

        if (!string.IsNullOrWhiteSpace(accion))
            query = query.Where(l => l.Accion == accion);

        if (desde.HasValue)
            query = query.Where(l => l.Fecha >= desde.Value.ToUniversalTime());

        if (hasta.HasValue)
            query = query.Where(l => l.Fecha <= hasta.Value.ToUniversalTime());

        if (!string.IsNullOrWhiteSpace(usuarioNombre))
        {
            var nameLower = usuarioNombre.ToLower();
            var matchingUserIds = await _db.Usuarios
                .Where(u => u.Nombre.ToLower().Contains(nameLower) ||
                            (u.Apellidos != null && u.Apellidos.ToLower().Contains(nameLower)))
                .Select(u => (Guid?)u.Id)
                .ToListAsync();
            query = query.Where(l => l.UsuarioId.HasValue && matchingUserIds.Contains(l.UsuarioId));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(l => l.Fecha)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Cargar nombres de usuario en batch
        var userIds = items.Where(l => l.UsuarioId.HasValue).Select(l => l.UsuarioId!.Value).Distinct().ToList();
        var usuarios = await _db.Usuarios
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, Nombre = u.Nombre + (u.Apellidos != null ? " " + u.Apellidos : "") })
            .ToDictionaryAsync(u => u.Id, u => u.Nombre);

        var dtos = items.Select(l => new AuditoriaLogDto
        {
            Id = l.Id,
            UsuarioId = l.UsuarioId,
            UsuarioNombre = l.UsuarioId.HasValue && usuarios.TryGetValue(l.UsuarioId.Value, out var n) ? n : null,
            Accion = l.Accion,
            Entidad = l.Entidad,
            EntidadId = l.EntidadId,
            ValoresAnteriores = l.ValoresAnteriores,
            ValoresNuevos = l.ValoresNuevos,
            IpAddress = l.IpAddress,
            Fecha = l.Fecha,
        }).ToList();

        return Ok(new { total, page, pageSize, items = dtos });
    }
}
