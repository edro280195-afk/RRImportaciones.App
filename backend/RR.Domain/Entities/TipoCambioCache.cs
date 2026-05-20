namespace RR.Domain.Entities;

public class TipoCambioCache
{
    public DateOnly Fecha { get; set; }
    public decimal Tc { get; set; }
    public string Fuente { get; set; } = "BANXICO";
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
}
