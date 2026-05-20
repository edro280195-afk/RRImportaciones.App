using RR.Application.DTOs.Common;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.DTOs.Reportes;
using RR.Application.DTOs.Tramites;

namespace RR.Application.Interfaces;

public interface ICotizadorService
{
    Task<CotizacionOutput> CalcularCotizacionAsync(CotizacionInput input);
    Task<CandidatosPrecioOutput> ObtenerCandidatosAsync(CotizacionInput input);
    Task<CotizacionOutput> CrearCotizacionAsync(GuardarCotizacionRequest request);
    Task<CotizacionOutput> ActualizarCotizacionAsync(Guid id, GuardarCotizacionRequest request);
    Task<PagedResult<CotizacionListDto>> GetListAsync(Guid? clienteId, string? estado, DateTime? fechaDesde, string? search, int page, int pageSize);
    Task<CotizacionOutput?> GetByIdAsync(Guid id);
    Task<CotizacionOutput> RecalcularAsync(Guid id);
    Task<TramiteDetailDto> ConvertirATramiteAsync(Guid id, ConvertirCotizacionRequest request);
    Task<CotizacionDashboardDto> GetDashboardAsync();
    Task<ConversionCotizacionesDto> GetReporteConversionAsync(DateTime? desde, DateTime? hasta);
    Task MarcarEnviadaAsync(Guid id, MarcarEnviadaRequest request);
    Task AceptarAsync(Guid id);
    Task RechazarAsync(Guid id, string motivo);
}
