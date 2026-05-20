namespace RR.Application.DTOs.Cotizaciones;

public class CotizacionListDto
{
    public Guid Id { get; set; }
    public string? Folio { get; set; }
    public string Estado { get; set; } = "BORRADOR";
    public string? ClienteNombre { get; set; }
    public string? Vin { get; set; }
    public string? Vehiculo { get; set; }
    public int? Anno { get; set; }
    public decimal Total { get; set; }
    public Guid? TramiteId { get; set; }
    public string? TramiteNumero { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaExpiracion { get; set; }
}
