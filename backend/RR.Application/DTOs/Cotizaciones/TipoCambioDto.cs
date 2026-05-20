namespace RR.Application.DTOs.Cotizaciones;

public class TipoCambioDto
{
    public DateOnly Fecha { get; set; }
    public decimal TipoCambio { get; set; }
    public string Fuente { get; set; } = "BANXICO";
    public string Contexto { get; set; } = "FIX"; // FIX o DOF
    public string? Nota { get; set; }
    public DateTime FetchedAt { get; set; }
    public bool IsStale { get; set; }
}
