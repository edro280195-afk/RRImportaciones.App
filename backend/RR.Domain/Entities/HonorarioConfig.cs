namespace RR.Domain.Entities;

public class HonorarioConfig
{
    public Guid Id { get; set; }
    public string TipoMercancia { get; set; } = "VEHICULO";
    public string Regimen { get; set; } = "POST_2017";
    public decimal Monto { get; set; }
    public bool Activo { get; set; } = true;
}
