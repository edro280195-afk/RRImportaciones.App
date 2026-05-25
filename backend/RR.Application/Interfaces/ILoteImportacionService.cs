using RR.Application.DTOs.Common;
using RR.Application.DTOs.LotesImportacion;

namespace RR.Application.Interfaces;

public interface ILoteImportacionService
{
    Task<PagedResult<LoteListDto>> GetListAsync(string? search, string? estado, Guid? clienteId, int page, int pageSize);
    Task<LoteDetailDto?> GetByIdAsync(Guid id);
    Task<LoteDetailDto> CreateAsync(CreateLoteRequest request);
    Task<LoteDetailDto> UpdateAsync(Guid id, UpdateLoteRequest request);
    Task<LoteDetailDto> AgregarVehiculoAsync(Guid id, AgregarVehiculoALoteRequest request);
    Task CancelarLoteAsync(Guid id);
    Task RemoverVehiculoAsync(Guid loteId, Guid tramiteId);
}
