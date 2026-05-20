namespace RR.Application.DTOs.Tramites;

public class TramiteDashboardDto
{
    public int Activos { get; set; }
    public int VerdesEsteMes { get; set; }
    public int AmarillosPendientePago { get; set; }
    public decimal CobradoMes { get; set; }
    public decimal PorCobrar { get; set; }
    public int VehiculosEnPatio { get; set; }
}
