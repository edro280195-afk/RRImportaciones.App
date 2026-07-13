using RR.Application.DTOs.Marcas;

namespace RR.Application.Interfaces;

public interface IMarcaService
{
    Task<IEnumerable<MarcaDto>> GetAllAsync(bool soloActivas = true);
    Task<MarcaDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<MarcaDto>> SearchAsync(string query);
    Task<MarcaDto> CreateAsync(SaveMarcaRequest request);
    Task<MarcaDto> UpdateAsync(Guid id, SaveMarcaRequest request);
}

public class SaveMarcaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string[] Aliases { get; set; } = [];
    public bool Activo { get; set; } = true;
}
