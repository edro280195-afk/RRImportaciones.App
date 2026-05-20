namespace RR.Application.DTOs.Cotizaciones;

public class CotizacionDashboardDto
{
    public int PendientesRespuesta { get; set; }
    public int PorExpirar { get; set; }
    public List<CotizacionListDto> AceptadasListas { get; set; } = [];
}
