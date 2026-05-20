using RR.Application.DTOs.PartnersExternos;

namespace RR.Application.Interfaces;

public interface IPartnerExternoService
{
    Task<List<PartnerExternoDto>> GetAllAsync(bool soloActivos = true);
    Task<PartnerExternoDto?> GetByIdAsync(Guid id);
    Task<PartnerExternoDto> CreateAsync(CreatePartnerExternoRequest request);
    Task<PartnerExternoDto> UpdateAsync(Guid id, UpdatePartnerExternoRequest request);
    Task DeleteAsync(Guid id);
}
