using RR.Application.DTOs.Common;
using RR.Application.DTOs.GastosHormiga;

namespace RR.Application.Interfaces;

public interface IGastoHormigaService
{
    Task<PagedResult<GastoHormigaListDto>> GetListAsync(Guid? tramiteId, Guid? clienteId, Guid? vehiculoId, Guid? tipoGastoId, string? categoria, DateTime? fechaDesde, DateTime? fechaHasta, int page = 1, int pageSize = 20);
    Task<GastoHormigaListDto?> GetByIdAsync(Guid id);
    Task<GastoHormigaListDto> CreateAsync(CreateGastoHormigaRequest request);
    Task<GastoHormigaListDto> UpdateAsync(Guid id, UpdateGastoHormigaRequest request);
    Task DeleteAsync(Guid id);
    Task<GastoHormigaResumenDto> GetResumenAsync(DateTime? fechaDesde, DateTime? fechaHasta);
}
