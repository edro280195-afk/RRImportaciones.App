namespace RR.Domain.Entities;

public class ParametroFiscal
{
    public Guid Id { get; set; }
    public string Regimen { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public decimal? Igi { get; set; }
    public decimal? Dta { get; set; }
    public decimal? DtaFijo { get; set; }
    public decimal Iva { get; set; } = 0.16m;
    public decimal? PrevFijo { get; set; }
    public decimal? PrvFijo { get; set; }
    public DateTime VigenteDesde { get; set; } = DateTime.UtcNow.Date;
    public DateTime? VigenteHasta { get; set; }
    public bool Activo { get; set; } = true;
}
