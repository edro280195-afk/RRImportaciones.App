namespace RR.Application.DTOs.Pagos;

public class PagoResumenDto
{
    public decimal CobroTotal { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal TotalVerificado { get; set; }
    public decimal SaldoPendiente { get; set; }
}
