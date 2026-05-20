namespace RR.Application.DTOs.Pagos;

public class CreatePagoRequest
{
    public Guid TramiteId { get; set; }
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "MXN";
    public decimal? TipoCambio { get; set; }
    public string TipoMovimiento { get; set; } = "PAGO_CLIENTE";
    public string PagadoPor { get; set; } = "CLIENTE";
    public bool SeCobraAlCliente { get; set; }
    public string Metodo { get; set; } = "TRANSFERENCIA";
    public string? Banco { get; set; }
    public string? Referencia { get; set; }
    public string? ComprobanteUrl { get; set; }
    public string? Notas { get; set; }
    public DateTime FechaPago { get; set; }
}
