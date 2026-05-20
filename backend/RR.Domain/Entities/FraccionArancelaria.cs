namespace RR.Domain.Entities;

public class FraccionArancelaria
{
    public Guid Id { get; set; }
    public string Fraccion { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public decimal? Igi { get; set; }
    public decimal Iva { get; set; } = 0.16m;
    public string? TipoVehiculo { get; set; }
    public bool Activo { get; set; } = true;
}
