using RR.Application.DTOs.Cotizaciones;

namespace RR.Application.Interfaces;

public interface IWhatsAppCotizacionService
{
    Task<WhatsAppLinkResponse> GenerateLinkAsync(Guid cotizacionId, WhatsAppLinkRequest request);
}
