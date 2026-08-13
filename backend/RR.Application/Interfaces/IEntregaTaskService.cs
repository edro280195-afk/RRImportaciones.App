using RR.Application.DTOs.Entregas;

namespace RR.Application.Interfaces;

public interface IEntregaTaskService
{
    Task<List<TareaEntregaDto>> GetTareasAsync(Guid? choferUserId = null, string? estado = null);
    Task<List<RR.Application.DTOs.Auth.CampoUserDto>> GetChoferesDisponiblesAsync();
    Task<TareaEntregaDto?> GetByIdAsync(Guid id);
    Task<TareaEntregaDto> CrearAsync(CrearTareaEntregaRequest request);
    Task<EntregaLinkResponseDto> AsignarVehiculoAsync(AsignarVehiculoEntregaRequest request);
    Task<EntregaLinkResponseDto> RegenerarEnlaceAsync(Guid tareaId);
    Task<EntregaAccesoDto> ObtenerAccesoAsync(string token);
    Task<TareaEntregaDto> TomarPorEnlaceAsync(string token);
    Task<TareaEntregaDto> TomarAsync(Guid id);
    Task<TareaEntregaDto> RegistrarEntregaAsync(Guid id, RegistrarEntregaRequest request);
    Task<List<VehiculoEntregaLookupDto>> BuscarVehiculosAsync(string query);
    Task<TareaEntregaDto> RegistrarEntregaVehiculoAsync(RegistrarEntregaVehiculoRequest request);
    Task<TareaEntregaDto> AgregarFotoAsync(Guid id, string fotoUrl);
}
