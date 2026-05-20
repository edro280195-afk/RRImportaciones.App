using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/cotizaciones")]
[Authorize]
public class CotizacionesController : ControllerBase
{
    private readonly ICotizadorService _cotizador;
    private readonly INhtsaService _nhtsa;
    private readonly IBanxicoService _banxico;
    private readonly ICotizacionPdfService _pdfService;
    private readonly IEmailService _emailService;
    private readonly IWhatsAppCotizacionService _whatsAppService;

    public CotizacionesController(
        ICotizadorService cotizador,
        INhtsaService nhtsa,
        IBanxicoService banxico,
        ICotizacionPdfService pdfService,
        IEmailService emailService,
        IWhatsAppCotizacionService whatsAppService)
    {
        _cotizador = cotizador;
        _nhtsa = nhtsa;
        _banxico = banxico;
        _pdfService = pdfService;
        _emailService = emailService;
        _whatsAppService = whatsAppService;
    }

    [HttpPost("calcular")]
    public async Task<IActionResult> Calcular([FromBody] CotizacionInput input)
    {
        try
        {
            return Ok(await _cotizador.CalcularCotizacionAsync(input));
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Devuelve los candidatos del catálogo Anexo 2 para que el admin elija cuál usar.
    /// Llamar antes de /calcular cuando el vehículo tiene múltiples coincidencias.
    /// </summary>
    [HttpPost("candidatos")]
    public async Task<IActionResult> ObtenerCandidatos([FromBody] CotizacionInput input)
    {
        try
        {
            return Ok(await _cotizador.ObtenerCandidatosAsync(input));
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
    }

    [HttpGet("decode-vin/{vin}")]
    public async Task<IActionResult> DecodeVin(string vin)
    {
        var decoded = await _nhtsa.DecodeVinAsync(vin);
        return decoded is null ? NotFound(new { message = "No se pudo decodificar el VIN" }) : Ok(decoded);
    }

    [HttpGet("tipo-cambio")]
    public async Task<IActionResult> TipoCambio([FromQuery] DateTime? fecha, [FromQuery] string contexto = "FIX")
    {
        TipoCambioDto? tc;
        if (contexto.ToUpperInvariant() == "DOF")
            tc = await _banxico.GetTipoCambioDofAsync(fecha);
        else
            tc = await _banxico.GetTipoCambioFixAsync(fecha);

        return tc is null ? UnprocessableEntity(new { message = "No se pudo obtener tipo de cambio" }) : Ok(tc);
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? clienteId,
        [FromQuery] string? estado,
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _cotizador.GetListAsync(clienteId, estado, fechaDesde, search, page, pageSize));
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        return Ok(await _cotizador.GetDashboardAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var cotizacion = await _cotizador.GetByIdAsync(id);
        return cotizacion is null ? NotFound(new { message = "Cotizacion no encontrada" }) : Ok(cotizacion);
    }

    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> Pdf(Guid id)
    {
        try
        {
            var cotizacion = await _cotizador.GetByIdAsync(id);
            if (cotizacion is null)
                return NotFound(new { message = "Cotizacion no encontrada" });

            var bytes = await _pdfService.GeneratePdfAsync(id);
            var fileName = $"cotizacion-{cotizacion.Folio ?? id.ToString("N")}.pdf";
            Response.Headers.ContentDisposition = $"inline; filename=\"{fileName}\"";
            return File(bytes, "application/pdf");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/pdf/download")]
    public async Task<IActionResult> PdfDownload(Guid id)
    {
        try
        {
            var cotizacion = await _cotizador.GetByIdAsync(id);
            if (cotizacion is null)
                return NotFound(new { message = "Cotizacion no encontrada" });

            var bytes = await _pdfService.GeneratePdfAsync(id);
            var fileName = $"cotizacion-{cotizacion.Folio ?? id.ToString("N")}.pdf";
            return File(bytes, "application/pdf", fileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GuardarCotizacionRequest request)
    {
        try
        {
            var result = await _cotizador.CrearCotizacionAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] GuardarCotizacionRequest request)
    {
        try
        {
            return Ok(await _cotizador.ActualizarCotizacionAsync(id, request));
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

    [HttpPost("{id:guid}/marcar-enviada")]
    public async Task<IActionResult> MarcarEnviada(Guid id, [FromBody] MarcarEnviadaRequest request)
    {
        try
        {
            await _cotizador.MarcarEnviadaAsync(id, request);
            return Ok(new { message = "Cotizacion marcada como enviada" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/recalcular")]
    public async Task<IActionResult> Recalcular(Guid id)
    {
        try
        {
            return Ok(await _cotizador.RecalcularAsync(id));
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

    [HttpPost("{id:guid}/convertir-a-tramite")]
    public async Task<IActionResult> ConvertirATramite(Guid id, [FromBody] ConvertirCotizacionRequest request)
    {
        try
        {
            return Ok(await _cotizador.ConvertirATramiteAsync(id, request));
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

    [HttpPost("{id:guid}/enviar-email")]
    public async Task<IActionResult> EnviarEmail(Guid id, [FromBody] EnviarEmailCotizacionRequest request)
    {
        try
        {
            await _emailService.SendCotizacionAsync(id, request.Destinatario, request.MensajePersonalizado);
            return Ok(new { message = "Cotizacion enviada por correo" });
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

    [HttpPost("{id:guid}/whatsapp-link")]
    public async Task<IActionResult> WhatsAppLink(Guid id, [FromBody] WhatsAppLinkRequest request)
    {
        try
        {
            return Ok(await _whatsAppService.GenerateLinkAsync(id, request));
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

    [HttpPost("{id:guid}/aceptar")]
    public async Task<IActionResult> Aceptar(Guid id)
    {
        try
        {
            await _cotizador.AceptarAsync(id);
            return Ok(new { message = "Cotizacion aceptada" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/rechazar")]
    public async Task<IActionResult> Rechazar(Guid id, [FromBody] RechazarCotizacionRequest request)
    {
        try
        {
            await _cotizador.RechazarAsync(id, request.Motivo);
            return Ok(new { message = "Cotizacion rechazada" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
