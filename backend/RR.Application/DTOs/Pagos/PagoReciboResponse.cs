namespace RR.Application.DTOs.Pagos;

public class PagoReciboResponse
{
    public Guid PagoId { get; set; }
    public string FolioRecibo { get; set; } = string.Empty;
    public string ReciboPagoUrl { get; set; } = string.Empty;
    public DateTime ReciboGeneradoEn { get; set; }
    public string PhysicalPath { get; set; } = string.Empty;
}
