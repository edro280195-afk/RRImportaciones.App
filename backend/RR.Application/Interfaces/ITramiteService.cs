using RR.Application.DTOs.Common;
using RR.Application.DTOs.Entregas;
using RR.Application.DTOs.Tramites;

namespace RR.Application.Interfaces;

public interface ITramiteService
{
    Task<PagedResult<TramiteListDto>> GetListAsync(string? search, string? estado, Guid? tramitadorId, Guid? clienteId, Guid? aduanaId, DateTime? fechaDesde, DateTime? fechaHasta, string? orderBy, string? orderDir, int page, int pageSize, Guid? loteId = null);
    Task<TramiteDetailDto?> GetByIdAsync(Guid id);
    Task<TramiteDetailDto> CreateAsync(CreateTramiteRequest request);
    Task<TramiteDetailDto> UpdateAsync(Guid id, UpdateTramiteRequest request);
    Task<TramiteEventoDto?> CambiarEstadoAsync(Guid id, CambiarEstadoRequest request);
    Task<TramitePedimentoDto> AgregarPedimentoAsync(Guid tramiteId, AgregarPedimentoRequest request);
    Task<TramiteEntregaDto> AgregarEntregaAsync(Guid tramiteId, CreateEntregaRequest request);
    Task<TramiteEventoDto> AgregarNotaAsync(Guid tramiteId, AgregarNotaRequest request);
    Task<TramiteDocumentoDto> GuardarDocumentoAsync(Guid tramiteId, GuardarDocumentoTramiteRequest request);
    Task<TramiteDashboardDto> GetDashboardAsync();
}
