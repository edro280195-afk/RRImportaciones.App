using RR.Application.DTOs.Common;
using RR.Application.DTOs.Pagos;

namespace RR.Application.Interfaces;

public interface IPagoService
{
    Task<PagedResult<PagoListDto>> GetListAsync(Guid? tramiteId, string? search, DateTime? fechaDesde, DateTime? fechaHasta, bool? verificado, string? metodo, int page = 1, int pageSize = 20);
    Task<PagoDetailDto?> GetByIdAsync(Guid id);
    Task<PagoDetailDto> CreateAsync(CreatePagoRequest request);
    Task<PagoDetailDto> UpdateAsync(Guid id, UpdatePagoRequest request);
    Task<PagoVerificarResponse> VerificarAsync(Guid id);
    Task<PagoVerificarResponse> VerificarBulkAsync(IEnumerable<Guid> ids);
    Task<PagoComprobanteResponse> ActualizarComprobanteAsync(Guid id, string comprobanteUrl);
    Task<PagoReciboResponse> RegenerarReciboAsync(Guid id);
    Task DeleteAsync(Guid id);
    Task<PagoResumenDto> GetResumenByTramiteAsync(Guid tramiteId);
}
