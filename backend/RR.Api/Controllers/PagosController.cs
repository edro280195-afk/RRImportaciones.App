using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Pagos;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/pagos")]
[Authorize]
public class PagosController : ControllerBase
{
    private readonly IPagoService _pagoService;
    private readonly IPagoReciboPdfService _reciboPdfService;
    private readonly ICurrentUserService _currentUser;
    private readonly IWebHostEnvironment _environment;
    private readonly IFileStorageService _fileStorageService;

    public PagosController(IPagoService pagoService, IPagoReciboPdfService reciboPdfService, ICurrentUserService currentUser, IWebHostEnvironment environment, IFileStorageService fileStorageService)
    {
        _pagoService = pagoService;
        _reciboPdfService = reciboPdfService;
        _currentUser = currentUser;
        _environment = environment;
        _fileStorageService = fileStorageService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? tramiteId,
        [FromQuery] string? search,
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta,
        [FromQuery] bool? verificado,
        [FromQuery] string? metodo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _pagoService.GetListAsync(tramiteId, search, fechaDesde, fechaHasta, verificado, metodo, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var pago = await _pagoService.GetByIdAsync(id);
        if (pago == null)
            return NotFound(new { message = "Pago no encontrado" });
        return Ok(pago);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePagoRequest request)
    {
        try
        {
            var pago = await _pagoService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = pago.Id }, pago);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("tipo de cambio", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("Banxico", StringComparison.OrdinalIgnoreCase))
            {
                return UnprocessableEntity(new { message = ex.Message });
            }
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePagoRequest request)
    {
        try
        {
            var pago = await _pagoService.UpdateAsync(id, request);
            return Ok(pago);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("tipo de cambio", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("Banxico", StringComparison.OrdinalIgnoreCase))
            {
                return UnprocessableEntity(new { message = ex.Message });
            }
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/verificar")]
    public async Task<IActionResult> Verificar(Guid id)
    {
        var role = _currentUser.Role;
        if (role != "ADMIN" && role != "GERENTE")
            return Forbid();

        try
        {
            var result = await _pagoService.VerificarAsync(id);
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

    [HttpPost("verificar-bulk")]
    public async Task<IActionResult> VerificarBulk([FromBody] BulkVerificarPagosRequest request)
    {
        var role = _currentUser.Role;
        if (role != "ADMIN" && role != "GERENTE")
            return Forbid();

        try
        {
            var result = await _pagoService.VerificarBulkAsync(request.PagoIds);
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

    [HttpPost("{id:guid}/comprobante")]
    [RequestSizeLimit(10_485_760)]
    public async Task<IActionResult> UploadComprobante(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "El comprobante es obligatorio" });

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "El comprobante no puede exceder 10 MB" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".pdf" };
        if (!allowed.Contains(extension))
            return BadRequest(new { message = "Formato no permitido. Use jpg, jpeg, png o pdf" });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _fileStorageService.UploadFileAsync("comprobantes", file.FileName, file.ContentType, stream, HttpContext.RequestAborted);
            var result = await _pagoService.ActualizarComprobanteAsync(id, url);
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

    [HttpGet("{id:guid}/recibo")]
    public async Task<IActionResult> GetRecibo(Guid id)
    {
        try
        {
            var recibo = await _reciboPdfService.GetOrGenerateAsync(id);
            Response.Headers.ContentDisposition = $"inline; filename=\"{recibo.FolioRecibo}.pdf\"";
            return PhysicalFile(recibo.PhysicalPath, "application/pdf");
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

    [HttpPost("{id:guid}/recibo/regenerar")]
    public async Task<IActionResult> RegenerarRecibo(Guid id)
    {
        var role = _currentUser.Role;
        if (role != "ADMIN" && role != "GERENTE")
            return Forbid();

        try
        {
            var recibo = await _pagoService.RegenerarReciboAsync(id);
            return Ok(new
            {
                pagoId = recibo.PagoId,
                folioRecibo = recibo.FolioRecibo,
                reciboPagoUrl = recibo.ReciboPagoUrl,
                reciboGeneradoEn = recibo.ReciboGeneradoEn,
            });
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
            await _pagoService.DeleteAsync(id);
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

    [HttpGet("resumen/{tramiteId:guid}")]
    public async Task<IActionResult> GetResumen(Guid tramiteId)
    {
        try
        {
            var resumen = await _pagoService.GetResumenByTramiteAsync(tramiteId);
            return Ok(resumen);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
