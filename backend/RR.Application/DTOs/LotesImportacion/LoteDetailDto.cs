namespace RR.Application.DTOs.LotesImportacion;

public class LoteDetailDto
{
    public Guid Id { get; set; }
    public string FolioLote { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public Guid ClienteId { get; set; }
    public string? ClienteApodo { get; set; }
    public string? ClienteNombre { get; set; }
    public Guid? AduanaId { get; set; }
    public string? AduanaNombre { get; set; }
    public Guid? TramitadorId { get; set; }
    public string? TramitadorNombre { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public decimal MontoTotal { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public DateTime? FechaCruce { get; set; }
    public string? Notas { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaModificacion { get; set; }
    public List<LoteTramiteItemDto> Tramites { get; set; } = [];
}

public class LoteTramiteItemDto
{
    public Guid Id { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public Guid? VehiculoId { get; set; }
    public string? VehiculoVin { get; set; }
    public string? VehiculoVinCorto { get; set; }
    public string? VehiculoMarcaModelo { get; set; }
    public string? DescripcionMercancia { get; set; }
    public string EstadoLogistico { get; set; } = string.Empty;
    public decimal CobroTotal { get; set; }
    public decimal CargoExpress { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public DateTime FechaCreacion { get; set; }
}
