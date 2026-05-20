using RR.Application.DTOs.PersonalCampo;

namespace RR.Application.Interfaces;

public interface IPersonalCampoService
{
    Task<List<PersonalCampoDto>> GetAllAsync(bool soloActivos = true);
    Task<PersonalCampoDto?> GetByIdAsync(Guid id);
    Task<PersonalCampoDto> CreateAsync(CreatePersonalCampoRequest request);
    Task<PersonalCampoDto> UpdateAsync(Guid id, UpdatePersonalCampoRequest request);
    Task DeleteAsync(Guid id);
}
