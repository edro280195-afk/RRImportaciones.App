using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Api.Auth;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/marcas")]
// La lectura queda abierta a cualquier sesión: son nombres de marcas de auto y
// el yardero las necesita para registrar una unidad en la yarda sin tener
// CATALOGOS_VER. Escribir sí exige CATALOGOS_EDITAR (ver cada acción).
[Authorize]
public class MarcasController : ControllerBase
{
    private readonly IMarcaService _marcaService;

    public MarcasController(IMarcaService marcaService)
    {
        _marcaService = marcaService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool soloActivas = true)
    {
        var marcas = await _marcaService.GetAllAsync(soloActivas);
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

    [HttpPost]
    [RequierePermiso(Permisos.CatalogosEditar)]
    public async Task<IActionResult> Create([FromBody] SaveMarcaRequest request)
    {
        try
        {
            var result = await _marcaService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso(Permisos.CatalogosEditar)]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveMarcaRequest request)
    {
        try
        {
            var result = await _marcaService.UpdateAsync(id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
