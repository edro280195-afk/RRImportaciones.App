using RR.Application.DTOs.Clientes;
using RR.Application.DTOs.Common;

namespace RR.Application.Interfaces;

public interface IClienteService
{
    Task<PagedResult<ClienteListDto>> GetListAsync(string? search, string? procedencia, int page, int pageSize, string? orderBy);
    Task<ClienteDetailDto?> GetByIdAsync(Guid id);
    Task<ClienteDetailDto> CreateAsync(CreateClienteRequest request);
    Task<ClienteDetailDto> UpdateAsync(Guid id, UpdateClienteRequest request);
    Task DeleteAsync(Guid id);
    Task<IEnumerable<ClienteListDto>> SearchAutocompleteAsync(string query);
}
