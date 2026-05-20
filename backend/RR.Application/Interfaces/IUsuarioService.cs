using RR.Application.DTOs.Usuarios;

namespace RR.Application.Interfaces;

public interface IUsuarioService
{
    Task<List<UsuarioListDto>> GetAllAsync();
    Task<UsuarioListDto?> GetByIdAsync(Guid id);
    Task<UsuarioListDto> CreateAsync(CreateUsuarioRequest request);
    Task<UsuarioListDto> UpdateAsync(Guid id, UpdateUsuarioRequest request);
    Task DeleteAsync(Guid id);
}
