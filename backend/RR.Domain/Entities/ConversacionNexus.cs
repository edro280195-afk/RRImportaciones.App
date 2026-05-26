using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class ConversacionNexus : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string? Titulo { get; set; }
    public string? Resumen { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaUltimaActividad { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<MensajeNexus> Mensajes { get; set; } = new List<MensajeNexus>();
}
