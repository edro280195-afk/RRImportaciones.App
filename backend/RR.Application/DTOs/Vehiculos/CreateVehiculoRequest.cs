namespace RR.Application.DTOs.Vehiculos;

public class CreateVehiculoRequest
{
    public string? Vin { get; set; }
    public Guid MarcaId { get; set; }
    public string? Modelo { get; set; }
    public int? Anno { get; set; }
    public int? CilindradaCm3 { get; set; }
    public string? Categoria { get; set; }
    public Guid ClienteId { get; set; }
    public string? Color { get; set; }
    public decimal? ValorFactura { get; set; }
    public string Moneda { get; set; } = "USD";
    public string? NumMotor { get; set; }
    public string? NumSerie { get; set; }
    public DateTime? FechaIngresoPatio { get; set; }
    public string? UbicacionActual { get; set; }
    public bool CumplioRequisitos { get; set; }
    public bool TieneSelloAduanal { get; set; }
}
