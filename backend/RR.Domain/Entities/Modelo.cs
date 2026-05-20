namespace RR.Domain.Entities;

public class Modelo
{
    public Guid Id { get; set; }
    public Guid MarcaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;

    public Marca Marca { get; set; } = null!;
}
