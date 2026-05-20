using RR.Application.DTOs.Pagos;

namespace RR.Application.Interfaces;

public interface IPagoReciboPdfService
{
    Task<PagoReciboResponse> GenerateAndSaveAsync(Guid pagoId, bool force = false);
    Task<PagoReciboResponse> GetOrGenerateAsync(Guid pagoId);
}
