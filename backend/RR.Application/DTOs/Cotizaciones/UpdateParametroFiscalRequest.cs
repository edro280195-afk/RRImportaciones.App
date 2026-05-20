namespace RR.Application.DTOs.Cotizaciones;

public class UpdateParametroFiscalRequest
{
    public decimal? IgiPorcentaje { get; set; }
    public decimal? DtaPorcentaje { get; set; }
    public decimal? DtaFijo { get; set; }
    public decimal IvaPorcentaje { get; set; } = 0.16m;
    public decimal? PrevFijo { get; set; }
    public decimal? PrvFijo { get; set; }
    public DateTime? VigenteDesde { get; set; }
}
