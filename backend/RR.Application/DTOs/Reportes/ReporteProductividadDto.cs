namespace RR.Application.DTOs.Reportes;

public class ReporteProductividadDto
{
    public DateTime Desde { get; set; }
    public DateTime Hasta { get; set; }
    public List<TramitadorProductividadDto> Tramitadores { get; set; } = [];
}

public class TramitadorProductividadDto
{
    public Guid? TramitadorId { get; set; }
    public string Nombre { get; set; } = "";
    public int TramitesActivos { get; set; }
    public int TramitesCerradosPeriodo { get; set; }
    public decimal MontoTotalCobrado { get; set; }
    public decimal MontoTotalVerificado { get; set; }
    public double DiasPromedioResolucion { get; set; }
}
