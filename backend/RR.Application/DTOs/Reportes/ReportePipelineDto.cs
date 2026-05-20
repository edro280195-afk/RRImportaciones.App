namespace RR.Application.DTOs.Reportes;

public class ReportePipelineDto
{
    public int TotalActivos { get; set; }
    public List<PipelineEstadoDto> Estados { get; set; } = [];
}

public class PipelineEstadoDto
{
    public string Estado { get; set; } = "";
    public string EtiquetaCliente { get; set; } = "";
    public int Cantidad { get; set; }
    public decimal MontoTotal { get; set; }
    public double DiasPromedioEnEstado { get; set; }
}
