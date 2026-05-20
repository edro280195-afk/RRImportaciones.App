namespace RR.Domain.Entities;

public class TabuladorAmparo
{
    public Guid Id { get; set; }
    public int AnnoModelo { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public decimal PrecioMxn { get; set; }
    public string? Notas { get; set; }
}
