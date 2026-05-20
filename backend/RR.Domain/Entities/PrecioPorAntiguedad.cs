namespace RR.Domain.Entities;

public class PrecioPorAntiguedad
{
    public Guid Id { get; set; }
    public Guid PrecioEstimadoId { get; set; }
    public int AntiguedadAnios { get; set; }
    public decimal PrecioUsd { get; set; }

    public PrecioEstimado PrecioEstimado { get; set; } = null!;
}
