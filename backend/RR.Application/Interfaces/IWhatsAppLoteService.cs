using RR.Application.DTOs.Cotizaciones;

namespace RR.Application.Interfaces;

public interface IWhatsAppLoteService
{
    Task<WhatsAppLinkResponse> GenerateLinkAsync(Guid loteId, WhatsAppLinkRequest request);
}
