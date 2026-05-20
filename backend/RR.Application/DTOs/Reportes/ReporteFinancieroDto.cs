namespace RR.Application.DTOs.Reportes;

public class ReporteFinancieroDto
{
    public DateTime Desde { get; set; }
    public DateTime Hasta { get; set; }
    public decimal CobradoTotal { get; set; }
    public decimal PorCobrarTotal { get; set; }
    public decimal GastosHormigaTotal { get; set; }
    public decimal GastosCargablesTotal { get; set; }
    public decimal MargenBruto { get; set; }
    public int TramitesCerradosPeriodo { get; set; }
    public int TramitesActivosActual { get; set; }
    public int PagosPendientesVerificacion { get; set; }
    public decimal PagosPendientesVerificacionMonto { get; set; }
    public List<CobradoMesDto> EvolucionMensual { get; set; } = [];
    public List<GastoCategoriaResumenDto> GastosPorCategoria { get; set; } = [];
}

public class CobradoMesDto
{
    public int Anno { get; set; }
    public int Mes { get; set; }
    public string MesNombre { get; set; } = "";
    public decimal CobradoVerificado { get; set; }
    public decimal GastosHormiga { get; set; }
    public int TramitesCerrados { get; set; }
}

public class GastoCategoriaResumenDto
{
    public string Categoria { get; set; } = "";
    public decimal Total { get; set; }
    public int Cantidad { get; set; }
}
