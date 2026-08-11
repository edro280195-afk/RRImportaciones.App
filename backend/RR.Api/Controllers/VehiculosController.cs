using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Api.Auth;
using RR.Application.DTOs.Vehiculos;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/vehiculos")]
[Authorize]
public class VehiculosController : ControllerBase
{
    private readonly IVehiculoService _vehiculoService;

    public VehiculosController(IVehiculoService vehiculoService)
    {
        _vehiculoService = vehiculoService;
    }

    [HttpGet]
    [RequierePermiso(Permisos.TramitesVer)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] Guid? clienteId,
        [FromQuery] string? clienteNombre,
        [FromQuery] Guid? marcaId,
        [FromQuery] int? annoMin,
        [FromQuery] int? annoMax,
        [FromQuery] bool? enPatio,
        [FromQuery] string? estado,
        [FromQuery] string? orderBy,
        [FromQuery] string? orderDir,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _vehiculoService.GetListAsync(search, clienteId, clienteNombre, marcaId, annoMin, annoMax, enPatio, estado, orderBy, orderDir, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    // Cotizaciones también lo consulta: al cotizar desde un vehículo ya
    // registrado se cargan sus datos, y oficina cotiza sin tener TRAMITES_VER.
    [RequierePermiso(Permisos.TramitesVer, Permisos.CotizacionesVer, Permisos.CotizacionesCrear)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var vehiculo = await _vehiculoService.GetByIdAsync(id);
        if (vehiculo == null)
            return NotFound(new { message = "Vehículo no encontrado" });
        return Ok(vehiculo);
    }

    // CampoUsar también entra: registrar un vehículo que llega a la yarda es
    // trabajo de yardero/chofer, no solo de quien crea trámites.
    [HttpPost]
    [RequierePermiso(Permisos.TramitesCrear, Permisos.CampoUsar)]
    public async Task<IActionResult> Create([FromBody] CreateVehiculoRequest request)
    {
        try
        {
            var vehiculo = await _vehiculoService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = vehiculo.Id }, vehiculo);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // Igual que Create: corregir los datos de un vehículo en yarda (color,
    // cliente, etc.) lo hace yardero/chofer, no solo trámites.
    [HttpPut("{id:guid}")]
    [RequierePermiso(Permisos.TramitesEditar, Permisos.CampoUsar)]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateVehiculoRequest request)
    {
        try
        {
            var vehiculo = await _vehiculoService.UpdateAsync(id, request);
            return Ok(vehiculo);
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
    [RequierePermiso(Permisos.TramitesBorrar)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _vehiculoService.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // Actualizar inventario (ubicación, sello, requisitos) es la tarea
    // diaria del yardero en la yarda — sin CampoUsar aquí, YARDERO se queda
    // sin poder hacer justo lo que su rol describe.
    [HttpPatch("{id:guid}/inventario")]
    [RequierePermiso(Permisos.TramitesEditar, Permisos.CampoUsar)]
    public async Task<IActionResult> UpdateInventario(Guid id, [FromBody] UpdateInventarioRequest request)
    {
        try
        {
            await _vehiculoService.UpdateInventarioAsync(id, request);
            return Ok(new { message = "Inventario actualizado" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("inventario")]
    [RequierePermiso(Permisos.TramitesVer)]
    public async Task<IActionResult> GetInventarioActual()
    {
        var result = await _vehiculoService.GetInventarioActualAsync();
        return Ok(result);
    }
}
