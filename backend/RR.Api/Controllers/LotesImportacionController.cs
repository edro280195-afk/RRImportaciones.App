using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.LotesImportacion;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/lotes")]
[Authorize]
public class LotesImportacionController : ControllerBase
{
    private readonly ILoteImportacionService _loteService;

    public LotesImportacionController(ILoteImportacionService loteService)
    {
        _loteService = loteService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? estado,
        [FromQuery] Guid? clienteId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _loteService.GetListAsync(search, estado, clienteId, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _loteService.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Lote no encontrado" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLoteRequest request)
    {
        try
        {
            var result = await _loteService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
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

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLoteRequest request)
    {
        try
        {
            return Ok(await _loteService.UpdateAsync(id, request));
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

    [HttpPost("{id:guid}/vehiculos")]
    public async Task<IActionResult> AgregarVehiculo(Guid id, [FromBody] AgregarVehiculoALoteRequest request)
    {
        try
        {
            return Ok(await _loteService.AgregarVehiculoAsync(id, request));
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
