using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Api.Auth;
using RR.Application.DTOs.LotesImportacion;
using RR.Application.Interfaces;
using RR.Application.DTOs.Cotizaciones;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/lotes")]
[Authorize]
public class LotesImportacionController : ControllerBase
{
    private readonly ILoteImportacionService _loteService;
    private readonly ILotePdfService _pdfService;
    private readonly IWhatsAppLoteService _whatsappService;
    private readonly IPermisosUsuario _permisos;

    public LotesImportacionController(
        ILoteImportacionService loteService,
        ILotePdfService pdfService,
        IWhatsAppLoteService whatsappService,
        IPermisosUsuario permisos)
    {
        _loteService = loteService;
        _pdfService = pdfService;
        _whatsappService = whatsappService;
        _permisos = permisos;
    }

    [HttpGet]
    [RequierePermiso(Permisos.TramitesVer)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? estado,
        [FromQuery] Guid? clienteId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _loteService.GetListAsync(search, estado, clienteId, page, pageSize);
        return Ok(await FiltroDinero.AplicarAsync(_permisos, User, result));
    }

    [HttpGet("{id:guid}")]
    [RequierePermiso(Permisos.TramitesVer)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _loteService.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Lote no encontrado" });
        return Ok(await FiltroDinero.AplicarAsync(_permisos, User, result));
    }

    [HttpPost]
    [RequierePermiso(Permisos.TramitesCrear)]
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
    [RequierePermiso(Permisos.TramitesEditar)]
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
    [RequierePermiso(Permisos.TramitesEditar)]
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

    [HttpDelete("{id:guid}")]
    [RequierePermiso(Permisos.TramitesBorrar)]
    public async Task<IActionResult> CancelarLote(Guid id)
    {
        try
        {
            await _loteService.CancelarLoteAsync(id);
            return NoContent();
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

    [HttpDelete("{id:guid}/vehiculos/{tramiteId:guid}")]
    [RequierePermiso(Permisos.TramitesEditar)]
    public async Task<IActionResult> RemoverVehiculo(Guid id, Guid tramiteId)
    {
        try
        {
            await _loteService.RemoverVehiculoAsync(id, tramiteId);
            return NoContent();
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

    [HttpGet("{id:guid}/pdf")]
    [AllowAnonymous]
    public async Task<IActionResult> DescargarPdf(Guid id)
    {
        try
        {
            var pdfBytes = await _pdfService.GeneratePdfAsync(id);
            return File(pdfBytes, "application/pdf", $"lote-{id}.pdf");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/whatsapp")]
    [RequierePermiso(Permisos.TramitesVer)]
    public async Task<IActionResult> EnviarWhatsApp(Guid id, [FromBody] WhatsAppLinkRequest request)
    {
        try
        {
            var link = await _whatsappService.GenerateLinkAsync(id, request);
            return Ok(link);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
    }
}
