using RR.Application.DTOs.TiposGasto;

namespace RR.Application.Interfaces;

public interface ITipoGastoService
{
    Task<IEnumerable<TipoGastoDto>> GetAllAsync();
    Task<TipoGastoDto?> GetByIdAsync(Guid id);
    Task<TipoGastoDto> CreateAsync(CreateTipoGastoRequest request);
    Task<TipoGastoDto> UpdateAsync(Guid id, CreateTipoGastoRequest request);
    Task DeleteAsync(Guid id);
}
