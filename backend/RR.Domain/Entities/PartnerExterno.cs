namespace RR.Domain.Entities;

public class PartnerExterno
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string[] Aliases { get; set; } = [];
    public string Tipo { get; set; } = "OTRO";
    public string? Notas { get; set; }
    public bool Activo { get; set; } = true;
}
