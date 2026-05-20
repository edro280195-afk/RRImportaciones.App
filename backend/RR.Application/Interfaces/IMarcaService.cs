using RR.Application.DTOs.Marcas;

namespace RR.Application.Interfaces;

public interface IMarcaService
{
    Task<IEnumerable<MarcaDto>> GetAllAsync();
    Task<MarcaDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<MarcaDto>> SearchAsync(string query);
}
