namespace RR.Domain.Entities;

public class Tramitador
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; } = true;
    public string ComisionTipo { get; set; } = "NA";
    public decimal ComisionValor { get; set; }
}
