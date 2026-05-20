namespace RR.Application.DTOs.Tramites;

public class AgregarPedimentoRequest
{
    public string NumeroPedimento { get; set; } = string.Empty;
    public string Tipo { get; set; } = "ORIGINAL";
    public DateTime? FechaEntrada { get; set; }
    public DateTime? FechaPago { get; set; }
    public string? Patente { get; set; }
    public decimal? Igi { get; set; }
    public decimal? Dta { get; set; }
    public decimal? Iva { get; set; }
    public decimal? TotalContribuciones { get; set; }
    public string? MotivoRectificacion { get; set; }
    public string? ResponsableError { get; set; }
    public decimal CobroAdicional { get; set; }
}
