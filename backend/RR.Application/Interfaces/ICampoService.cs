using RR.Application.DTOs.Campo;

namespace RR.Application.Interfaces;

public interface ICampoService
{
    Task<List<TareaCampoDto>> GetTareasAsync(string? EstadoLogistico);
    Task<TareaCampoDto?> GetByIdAsync(Guid id);
    Task<TareaCampoDto> CrearAsync(CrearTareaCampoRequest request);
    Task<TareaCampoDto> CrearPreInspeccionAsync(CrearPreInspeccionRequest request);
    Task<TareaCampoDto> VincularTramiteAsync(Guid id, VincularPreInspeccionRequest request);
    Task<TareaCampoDto> TomarAsync(Guid id, TomarTareaCampoRequest request);
    Task<TareaCampoDto> CompletarAsync(Guid id, CompletarTareaCampoRequest request);
    Task<TareaCampoDto> AgregarFotoAsync(Guid id, string fotoUrl);
    Task<ExtractVinResponse> ExtractVinFromImageAsync(ExtractVinRequest request);
}
