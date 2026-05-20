namespace RR.Application.DTOs.Pagos;

public class PagoComprobanteResponse
{
    public Guid PagoId { get; set; }
    public string ComprobanteUrl { get; set; } = string.Empty;
}
