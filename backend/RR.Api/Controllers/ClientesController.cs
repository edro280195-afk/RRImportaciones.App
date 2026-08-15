using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Api.Auth;
using RR.Application.DTOs.Clientes;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/clientes")]
[Authorize]
public class ClientesController : ControllerBase
{
    private readonly IClienteService _clienteService;

    public ClientesController(IClienteService clienteService)
    {
        _clienteService = clienteService;
    }

    [HttpGet]
    [RequierePermiso(Permisos.ClientesVer, Permisos.CampoUsar)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? procedencia,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? orderBy = null)
    {
        var result = await _clienteService.GetListAsync(search, procedencia, page, pageSize, orderBy);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequierePermiso(Permisos.ClientesVer, Permisos.CampoUsar)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var cliente = await _clienteService.GetByIdAsync(id);
        if (cliente == null)
            return NotFound(new { message = "Cliente no encontrado" });
        return Ok(cliente);
    }

    [HttpPost]
    [RequierePermiso(Permisos.ClientesCrear)]
    public async Task<IActionResult> Create([FromBody] CreateClienteRequest request)
    {
        try
        {
            var cliente = await _clienteService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = cliente.Id }, cliente);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso(Permisos.ClientesEditar)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateClienteRequest request)
    {
        try
        {
            var cliente = await _clienteService.UpdateAsync(id, request);
            return Ok(cliente);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso(Permisos.ClientesEditar)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _clienteService.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("search")]
    [RequierePermiso(Permisos.ClientesVer, Permisos.CampoUsar)]
    public async Task<IActionResult> SearchAutocomplete([FromQuery] string q)
    {
        var results = await _clienteService.SearchAutocompleteAsync(q);
        return Ok(results);
    }

    [HttpGet("temporales")]
    [RequierePermiso(Permisos.ClientesVer)]
    public async Task<IActionResult> GetTemporales([FromQuery] string? estado = "PENDIENTE")
    {
        return Ok(await _clienteService.GetTemporalesAsync(estado));
    }

    [HttpPost("temporales/{id:guid}/aprobar")]
    [RequierePermiso(Permisos.ClientesCrear)]
    public async Task<IActionResult> AprobarTemporal(
        Guid id,
        [FromBody] AprobarClienteTemporalRequest request)
    {
        try
        {
            return Ok(await _clienteService.AprobarTemporalAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("temporales/{id:guid}/rechazar")]
    [RequierePermiso(Permisos.ClientesCrear)]
    public async Task<IActionResult> RechazarTemporal(
        Guid id,
        [FromBody] RechazarClienteTemporalRequest request)
    {
        try
        {
            return Ok(await _clienteService.RechazarTemporalAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
