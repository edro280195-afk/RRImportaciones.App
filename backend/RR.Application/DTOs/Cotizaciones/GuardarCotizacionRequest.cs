namespace RR.Application.DTOs.Cotizaciones;

public class GuardarCotizacionRequest : CotizacionInput
{
    public string? Folio { get; set; }
    public Guid? ClienteId { get; set; }
    public string? Notas { get; set; }
    public DateTime? FechaExpiracion { get; set; }
}
