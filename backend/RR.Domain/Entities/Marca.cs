namespace RR.Domain.Entities;

public class Marca
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string[] Aliases { get; set; } = [];
    public bool Activo { get; set; } = true;

    public ICollection<Modelo> Modelos { get; set; } = new List<Modelo>();
}
