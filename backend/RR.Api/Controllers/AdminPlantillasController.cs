using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Plantillas;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/admin/plantillas")]
[Authorize]
public class AdminPlantillasController : ControllerBase
{
    private readonly IPlantillaMensajeService _service;

    public AdminPlantillasController(IPlantillaMensajeService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var plantilla = await _service.GetByIdAsync(id);
        return plantilla is null ? NotFound(new { message = "Plantilla no encontrada" }) : Ok(plantilla);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GuardarPlantillaMensajeRequest request)
    {
        try
        {
            var result = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] GuardarPlantillaMensajeRequest request)
    {
        try
        {
            return Ok(await _service.UpdateAsync(id, request));
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

    [HttpDelete("{id:guid}")]
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
