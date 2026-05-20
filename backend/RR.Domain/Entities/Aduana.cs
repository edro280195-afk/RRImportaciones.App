namespace RR.Domain.Entities;

public class Aduana
{
    public Guid Id { get; set; }
    public string ClaveAduana { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Ciudad { get; set; }
    public string? Estado { get; set; }

    public ICollection<PatenteAduana> Patentes { get; set; } = new List<PatenteAduana>();
}
