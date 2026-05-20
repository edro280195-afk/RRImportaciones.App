namespace RR.Application.DTOs.Cotizaciones;

public class EnviarEmailCotizacionRequest
{
    public string Destinatario { get; set; } = string.Empty;
    public string? MensajePersonalizado { get; set; }
}
