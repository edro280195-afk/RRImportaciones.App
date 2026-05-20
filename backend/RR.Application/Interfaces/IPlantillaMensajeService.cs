using RR.Application.DTOs.Plantillas;

namespace RR.Application.Interfaces;

public interface IPlantillaMensajeService
{
    Task<IReadOnlyList<PlantillaMensajeDto>> GetAllAsync();
    Task<PlantillaMensajeDto?> GetByIdAsync(Guid id);
    Task<PlantillaMensajeDto> CreateAsync(GuardarPlantillaMensajeRequest request);
    Task<PlantillaMensajeDto> UpdateAsync(Guid id, GuardarPlantillaMensajeRequest request);
    Task DeleteAsync(Guid id);
}
