namespace RR.Application.DTOs.LotesImportacion;

public class LoteListDto
{
    public Guid Id { get; set; }
    public string FolioLote { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public Guid ClienteId { get; set; }
    public string? ClienteApodo { get; set; }
    public string? ClienteNombre { get; set; }
    public string? AduanaNombre { get; set; }
    public string? TramitadorNombre { get; set; }
    public int TotalTramites { get; set; }
    public int TramitesCompletados { get; set; }
    public int TramitesPendientes { get; set; }
    public decimal MontoTotal { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public DateTime? FechaCruce { get; set; }
    public DateTime FechaCreacion { get; set; }
}
