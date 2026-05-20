namespace RR.Application.DTOs.Cotizaciones;

public class ParametroFiscalDto
{
    public Guid Id { get; set; }
    public string Regimen { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public decimal? IgiPorcentaje { get; set; }
    public decimal? DtaPorcentaje { get; set; }
    public decimal? DtaFijo { get; set; }
    public decimal IvaPorcentaje { get; set; }
    public decimal? PrevFijo { get; set; }
    public decimal? PrvFijo { get; set; }
    public DateTime VigenteDesde { get; set; }
    public DateTime? VigenteHasta { get; set; }
    public bool Activo { get; set; }
}
