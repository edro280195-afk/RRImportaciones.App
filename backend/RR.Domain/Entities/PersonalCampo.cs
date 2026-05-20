namespace RR.Domain.Entities;

public class PersonalCampo
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = "ENTREGADOR";
    public string? Telefono { get; set; }
    public bool Activo { get; set; } = true;
}
