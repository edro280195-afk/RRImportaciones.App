namespace RR.Application.DTOs.Cotizaciones;

public class WhatsAppLinkRequest
{
    public string Telefono { get; set; } = string.Empty;
    public string? MensajePersonalizado { get; set; }
}
