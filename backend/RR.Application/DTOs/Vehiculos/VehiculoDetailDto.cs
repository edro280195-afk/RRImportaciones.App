using RR.Application.DTOs.Clientes;

namespace RR.Application.DTOs.Vehiculos;

public class VehiculoDetailDto : VehiculoListDto
{
    public int? CilindradaCm3 { get; set; }
    public string? Categoria { get; set; }
    public string? FraccionArancelaria { get; set; }
    public string? Color { get; set; }
    public string? NumMotor { get; set; }
    public decimal? ValorFactura { get; set; }
    public string Moneda { get; set; } = "USD";
    public DateTime? FechaPedimentoProforma { get; set; }
    public DateTime FechaRegistro { get; set; }
    public List<TramiteSimpleDto> HistorialTramites { get; set; } = [];
}
