using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class PushSubscription : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    /// <summary>Endpoint del push service (ej. https://fcm.googleapis.com/...). Único.</summary>
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>Clave pública del cliente (p256dh).</summary>
    public string P256dh { get; set; } = string.Empty;

    /// <summary>Auth secret del cliente.</summary>
    public string Auth { get; set; } = string.Empty;

    /// <summary>Rol del propietario: "admin" o "campo".</summary>
    public string Role { get; set; } = "admin";

    /// <summary>Usuario al que pertenece esta suscripción. Permite envíos dirigidos.</summary>
    public Guid UserId { get; set; }

    /// <summary>User-Agent del navegador para diagnóstico.</summary>
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public User? User { get; set; }
}
