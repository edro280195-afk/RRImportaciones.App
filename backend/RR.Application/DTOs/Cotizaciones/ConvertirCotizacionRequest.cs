namespace RR.Application.DTOs.Cotizaciones;

public class ConvertirCotizacionRequest
{
    public string AduanaCodigo { get; set; } = string.Empty;
    public Guid TramitadorId { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public string? NotasAdicionales { get; set; }
}
