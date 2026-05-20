using RR.Application.DTOs.GastosHormiga;
using RR.Application.DTOs.Reportes;

namespace RR.Application.Interfaces;

public interface IReporteService
{
    Task<ReporteFinancieroDto> GetReporteFinancieroAsync(DateTime desde, DateTime hasta);
    Task<EstadoCuentaClienteDto> GetEstadoCuentaClienteAsync(Guid clienteId);
    Task<ReportePipelineDto> GetReportePipelineAsync();
    Task<ReporteProductividadDto> GetReporteProductividadAsync(DateTime desde, DateTime hasta);
    Task<GastoHormigaResumenDto> GetReporteGastosHormigaAsync(DateTime desde, DateTime hasta);
}
