namespace RR.Application.DTOs.Tramites;

public class TramiteListDto
{
    public Guid Id { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public Guid? LoteId { get; set; }
    public string? FolioLote { get; set; }
    public DateTime FechaCreacion { get; set; }
    public string? ClienteApodo { get; set; }
    public string? ClienteNombre { get; set; }
    public string? VehiculoVinCorto { get; set; }
    public string? VehiculoMarcaModelo { get; set; }
    public string? AduanaNombre { get; set; }
    public string? TramitadorNombre { get; set; }
    public string EstadoLogistico { get; set; } = string.Empty;
    public string TipoTramite { get; set; } = "NORMAL";
    public decimal CobroTotal { get; set; }
    public decimal CargoExpress { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public DateTime? FechaEstadoActual { get; set; }
    public int DiasEnEstado { get; set; }
}
