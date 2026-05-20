using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RR.Infrastructure.Data;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/aduanas")]
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
