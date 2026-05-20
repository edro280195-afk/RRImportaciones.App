namespace RR.Application.DTOs.Cotizaciones;

public class MarcarEnviadaRequest
{
    public string EnviadoPor { get; set; } = "WHATSAPP";
    public string EnviadoA { get; set; } = string.Empty;
    public string? MensajePersonalizado { get; set; }
}
