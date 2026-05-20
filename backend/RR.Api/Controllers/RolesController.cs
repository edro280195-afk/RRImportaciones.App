using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Roles;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RolesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _db.Roles
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .OrderBy(r => r.Nombre)
            .ToListAsync();

        var dtos = roles.Select(r => new RoleDto
        {
            Id = r.Id,
            Nombre = r.Nombre,
            Descripcion = r.Descripcion,
            EsSistema = r.EsSistema,
            Permisos = r.RolePermissions
                .Where(rp => rp.Permission != null)
                .Select(rp => new PermisoDto
                {
                    Id = rp.Permission!.Id,
                    Codigo = rp.Permission.Codigo,
                    Nombre = rp.Permission.Nombre,
                    Modulo = rp.Permission.Modulo,
                })
                .OrderBy(p => p.Modulo).ThenBy(p => p.Nombre)
                .ToList(),
        }).ToList();

        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var r = await _db.Roles
            .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r == null) return NotFound();

        return Ok(new RoleDto
        {
            Id = r.Id,
            Nombre = r.Nombre,
            Descripcion = r.Descripcion,
            EsSistema = r.EsSistema,
            Permisos = r.RolePermissions
                .Where(rp => rp.Permission != null)
                .Select(rp => new PermisoDto
                {
                    Id = rp.Permission!.Id,
                    Codigo = rp.Permission.Codigo,
                    Nombre = rp.Permission.Nombre,
                    Modulo = rp.Permission.Modulo,
                })
                .OrderBy(p => p.Modulo).ThenBy(p => p.Nombre)
                .ToList(),
        });
    }

    [HttpGet("permisos")]
    public async Task<IActionResult> GetAllPermisos()
    {
        var permisos = await _db.Permisos
            .OrderBy(p => p.Modulo).ThenBy(p => p.Nombre)
            .Select(p => new PermisoDto { Id = p.Id, Codigo = p.Codigo, Nombre = p.Nombre, Modulo = p.Modulo })
            .ToListAsync();
        return Ok(permisos);
    }

    [HttpPut("{id:guid}/permisos")]
    public async Task<IActionResult> UpdatePermisos(Guid id, [FromBody] UpdatePermisosRequest request)
    {
        var rol = await _db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (rol == null) return NotFound();

        _db.RolesPermisos.RemoveRange(rol.RolePermissions);

        var nuevos = request.PermisoIds.Select(pid => new RolePermission
        {
            RoleId = id,
            PermissionId = pid,
        }).ToList();

        _db.RolesPermisos.AddRange(nuevos);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

public record UpdatePermisosRequest(List<Guid> PermisoIds);
