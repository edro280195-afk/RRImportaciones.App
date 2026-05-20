namespace RR.Domain.Entities;

public class PatenteAduana
{
    public Guid Id { get; set; }
    public Guid AduanaId { get; set; }
    public string Patente { get; set; } = string.Empty;
    public string? Descripcion { get; set; }

    public Aduana Aduana { get; set; } = null!;
}
