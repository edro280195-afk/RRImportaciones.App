using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RR.Infrastructure.Data;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/aduanas")]
// Sin permiso específico a propósito: es el catálogo oficial de aduanas (clave
// y nombre), dato público del SAT que llenan los selectores de cotizaciones,
// lotes y trámites. Pedir CATALOGOS_VER aquí rompería esos formularios para los
// roles de oficina, que no lo tienen, sin proteger nada que sea del negocio.
[Authorize]
public class AduanasController : ControllerBase
{
    private readonly AppDbContext _db;

    public AduanasController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _db.Aduanas
            .OrderBy(x => x.ClaveAduana)
            .Select(x => new
            {
                x.Id,
                x.ClaveAduana,
                x.Nombre,
                x.Ciudad,
                x.Estado,
            })
            .ToListAsync());
    }
}
