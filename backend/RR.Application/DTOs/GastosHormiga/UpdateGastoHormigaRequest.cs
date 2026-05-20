namespace RR.Application.DTOs.GastosHormiga;

public class UpdateGastoHormigaRequest
{
    public Guid? TramiteId { get; set; }
    public Guid? ClienteId { get; set; }
    public Guid? VehiculoId { get; set; }
    public Guid TipoGastoId { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "MXN";
    public decimal? GastoUsd { get; set; }
    public string? ComprobanteUrl { get; set; }
    public bool SeCargaAlCliente { get; set; }
    public DateTime FechaGasto { get; set; }
}
