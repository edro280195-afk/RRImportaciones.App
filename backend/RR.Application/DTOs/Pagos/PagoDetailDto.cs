namespace RR.Application.DTOs.Pagos;

public class PagoDetailDto
{
    public Guid Id { get; set; }
    public Guid TramiteId { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public string? ClienteNombre { get; set; }
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
    public string? FolioRecibo { get; set; }
    public string? ReciboPagoUrl { get; set; }
    public DateTime? ReciboGeneradoEn { get; set; }
    public string? Notas { get; set; }
    public DateTime FechaPago { get; set; }
    public bool Verificado { get; set; }
    public string? VerificadoPorNombre { get; set; }
    public DateTime? VerificadoEn { get; set; }
    public DateTime FechaRegistro { get; set; }
    public Guid RegistradoPor { get; set; }
}
