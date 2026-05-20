using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/marcas")]
[Authorize]
public class MarcasController : ControllerBase
{
    private readonly IMarcaService _marcaService;

    public MarcasController(IMarcaService marcaService)
    {
        _marcaService = marcaService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var marcas = await _marcaService.GetAllAsync();
        return Ok(marcas);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var marca = await _marcaService.GetByIdAsync(id);
        if (marca == null)
            return NotFound(new { message = "Marca no encontrada" });
        return Ok(marca);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        var results = await _marcaService.SearchAsync(q);
        return Ok(results);
    }
}
