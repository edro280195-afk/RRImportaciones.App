using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

/// <summary>
/// Token de dispositivo de Firebase Cloud Messaging. Es el canal nativo: el
/// navegador (o la app móvil) le pide un token a Firebase y nosotros lo
/// guardamos aquí para poder mandarle notificaciones aunque la app esté cerrada.
///
/// Convive con <see cref="PushSubscription"/> (Web Push con VAPID puro): cada
/// dispositivo se registra en UNO de los dos canales, nunca en ambos, así que
/// no llegan notificaciones duplicadas.
/// </summary>
public class PushDeviceToken : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    /// <summary>Registration token que devuelve Firebase. Único por dispositivo.</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>Plataforma de origen: "web", "android" o "ios".</summary>
    public string Platform { get; set; } = "web";

    /// <summary>Rol del propietario: "admin" o "campo".</summary>
    public string Role { get; set; } = "admin";

    /// <summary>Usuario al que pertenece el token. Permite envíos dirigidos.</summary>
    public Guid UserId { get; set; }

    /// <summary>User-Agent del navegador o modelo del teléfono, para diagnóstico.</summary>
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public User? User { get; set; }
}
