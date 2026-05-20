namespace RR.Application.DTOs.GastosHormiga;

public class GastoHormigaListDto
{
    public Guid Id { get; set; }
    public Guid? TramiteId { get; set; }
    public Guid? ClienteId { get; set; }
    public Guid? VehiculoId { get; set; }
    public Guid TipoGastoId { get; set; }
    public string? NumeroConsecutivo { get; set; }
    public string? ClienteNombre { get; set; }
    public string? VehiculoVin { get; set; }
    public string TipoGasto { get; set; } = string.Empty;
    public string Concepto { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "MXN";
    public bool SeCargaAlCliente { get; set; }
    public string? ComprobanteUrl { get; set; }
    public DateTime FechaGasto { get; set; }
}
