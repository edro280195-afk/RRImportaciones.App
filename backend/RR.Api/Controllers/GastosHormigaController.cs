using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.GastosHormiga;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/gastos-hormiga")]
[Authorize]
public class GastosHormigaController : ControllerBase
{
    private readonly IGastoHormigaService _gastoService;

    public GastosHormigaController(IGastoHormigaService gastoService)
    {
        _gastoService = gastoService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? tramiteId,
        [FromQuery] Guid? clienteId,
        [FromQuery] Guid? vehiculoId,
        [FromQuery] Guid? tipoGastoId,
        [FromQuery] string? categoria,
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _gastoService.GetListAsync(tramiteId, clienteId, vehiculoId, tipoGastoId, categoria, fechaDesde, fechaHasta, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var gasto = await _gastoService.GetByIdAsync(id);
        if (gasto == null)
            return NotFound(new { message = "Gasto no encontrado" });
        return Ok(gasto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGastoHormigaRequest request)
    {
        try
        {
            var gasto = await _gastoService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = gasto.Id }, gasto);
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
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGastoHormigaRequest request)
    {
        try
        {
            var gasto = await _gastoService.UpdateAsync(id, request);
            return Ok(gasto);
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
            await _gastoService.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen(
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta)
    {
        var resumen = await _gastoService.GetResumenAsync(fechaDesde, fechaHasta);
        return Ok(resumen);
    }
}
