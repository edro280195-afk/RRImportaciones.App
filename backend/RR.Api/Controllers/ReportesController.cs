using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Reportes;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/reportes")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly IReporteService _reportes;
    private readonly ICotizadorService _cotizador;
    private readonly IGastoHormigaService _gastos;

    public ReportesController(
        IReporteService reportes,
        ICotizadorService cotizador,
        IGastoHormigaService gastos)
    {
        _reportes = reportes;
        _cotizador = cotizador;
        _gastos = gastos;
    }

    /// <summary>Resumen financiero del periodo: cobrado, por cobrar, gastos, margen.</summary>
    [HttpGet("financiero")]
    public async Task<IActionResult> Financiero(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta)
    {
        var d = desde ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var h = hasta ?? DateTime.Now;
        return Ok(await _reportes.GetReporteFinancieroAsync(d, h));
    }

    /// <summary>Estado de cuenta de un cliente: todos sus trámites, pagos y saldo.</summary>
    [HttpGet("clientes/{clienteId:guid}/estado-cuenta")]
    public async Task<IActionResult> EstadoCuentaCliente(Guid clienteId)
    {
        try
        {
            return Ok(await _reportes.GetEstadoCuentaClienteAsync(clienteId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Pipeline de trámites activos por estado con días promedio en cada etapa.</summary>
    [HttpGet("pipeline")]
    public async Task<IActionResult> Pipeline()
        => Ok(await _reportes.GetReportePipelineAsync());

    /// <summary>Productividad por tramitador: trámites activos, cerrados en periodo, monto y días promedio.</summary>
    [HttpGet("tramitadores")]
    public async Task<IActionResult> Tramitadores(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta)
    {
        var d = desde ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var h = hasta ?? DateTime.Now;
        return Ok(await _reportes.GetReporteProductividadAsync(d, h));
    }

    /// <summary>Gastos hormiga del periodo agrupados por categoría, cliente y tramitador.</summary>
    [HttpGet("gastos-hormiga")]
    public async Task<IActionResult> GastosHormiga(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta)
    {
        var d = desde ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var h = hasta ?? DateTime.Now;
        return Ok(await _reportes.GetReporteGastosHormigaAsync(d, h));
    }

    /// <summary>Conversión de cotizaciones (endpoint original).</summary>
    [HttpGet("cotizaciones")]
    public async Task<IActionResult> Cotizaciones(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta)
        => Ok(await _cotizador.GetReporteConversionAsync(desde, hasta));
}
