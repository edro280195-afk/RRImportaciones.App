using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.TiposGasto;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/tipos-gasto")]
[Authorize]
public class TiposGastoController : ControllerBase
{
    private readonly ITipoGastoService _service;

    public TiposGastoController(ITipoGastoService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tipos = await _service.GetAllAsync();
        return Ok(tipos);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tipo = await _service.GetByIdAsync(id);
        if (tipo == null)
            return NotFound(new { message = "Tipo de gasto no encontrado" });
        return Ok(tipo);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Create([FromBody] CreateTipoGastoRequest request)
    {
        try
        {
            var tipo = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = tipo.Id }, tipo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateTipoGastoRequest request)
    {
        try
        {
            var tipo = await _service.UpdateAsync(id, request);
            return Ok(tipo);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
