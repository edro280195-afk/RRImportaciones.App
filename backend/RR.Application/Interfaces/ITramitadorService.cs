using RR.Application.DTOs.Tramitadores;

namespace RR.Application.Interfaces;

public interface ITramitadorService
{
    Task<List<TramitadorDto>> GetAllAsync(bool soloActivos = true);
    Task<TramitadorDto?> GetByIdAsync(Guid id);
    Task<TramitadorDto> CreateAsync(CreateTramitadorRequest request);
    Task<TramitadorDto> UpdateAsync(Guid id, UpdateTramitadorRequest request);
    Task DeleteAsync(Guid id);
}
