namespace RR.Application.DTOs.Reportes;

public class ConversionCotizacionesDto
{
    public int TotalEmitidas { get; set; }
    public int TotalAceptadas { get; set; }
    public int TotalRechazadas { get; set; }
    public int TotalExpiradas { get; set; }
    public decimal TasaConversionGlobal { get; set; }
    public decimal TiempoPromedioAceptacionDias { get; set; }
    public List<TopClienteCotizacionesDto> TopClientes { get; set; } = [];
}

public class TopClienteCotizacionesDto
{
    public Guid? ClienteId { get; set; }
    public string Cliente { get; set; } = "Sin cliente";
    public int TotalCotizaciones { get; set; }
}
