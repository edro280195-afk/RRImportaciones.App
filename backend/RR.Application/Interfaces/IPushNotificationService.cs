namespace RR.Application.Interfaces;

public class PushSubscribeRequest
{
    public string Endpoint { get; set; } = string.Empty;
    public PushKeys Keys { get; set; } = new();
    public string Role { get; set; } = "admin";
    public string? UserAgent { get; set; }
}

public class PushKeys
{
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
}

/// <summary>Alta de un token de dispositivo de Firebase Cloud Messaging.</summary>
public class RegisterDeviceTokenRequest
{
    public string Token { get; set; } = string.Empty;
    public string Role { get; set; } = "admin";
    /// <summary>"web", "android" o "ios".</summary>
    public string Platform { get; set; } = "web";
    public string? UserAgent { get; set; }
}

/// <summary>
/// Contenido de una notificación push, ya listo para mandarse por cualquiera de
/// los dos canales (FCM o Web Push).
/// </summary>
public class PushPayload
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    /// <summary>Ruta interna de la app a la que lleva el click. Ej. "/tramites/123".</summary>
    public string? Url { get; set; }
    /// <summary>Agrupador: dos notificaciones con el mismo tag se reemplazan.</summary>
    public string? Tag { get; set; }
    /// <summary>Clave del evento de negocio ("pago_registrado", "campo_incidencia"...).</summary>
    public string? Tipo { get; set; }
    /// <summary>Datos extra que viajan al cliente (ids para navegar, contadores...).</summary>
    public Dictionary<string, string>? Data { get; set; }
}

public interface IPushNotificationService
{
    /// <summary>Clave pública VAPID del canal Web Push (respaldo cuando no hay Firebase).</summary>
    string PublicKey { get; }

    /// <summary>True cuando el backend tiene credenciales de Firebase cargadas.</summary>
    bool FirebaseEnabled { get; }

    Task SubscribeAsync(PushSubscribeRequest request, CancellationToken cancellationToken = default);
    Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken = default);

    /// <summary>Registra (o refresca) el token FCM del dispositivo del usuario actual.</summary>
    Task RegisterDeviceTokenAsync(RegisterDeviceTokenRequest request, CancellationToken cancellationToken = default);

    /// <summary>Da de baja un token FCM (logout o cambio de usuario en el dispositivo).</summary>
    Task UnregisterDeviceTokenAsync(string token, CancellationToken cancellationToken = default);

    /// <summary>Envía push a un usuario específico (por sus dispositivos registrados).</summary>
    Task SendToUserAsync(Guid userId, string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default);

    /// <summary>Envía push broadcast a todos los suscriptos con rol "admin" en el tenant actual.</summary>
    Task SendToAdminsAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default);

    /// <summary>Envía push broadcast a todos los suscriptos con rol "campo".</summary>
    Task SendToCampoAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default);

    /// <summary>Envía a varios usuarios concretos. Ignora la lista vacía.</summary>
    Task SendToUsersAsync(IEnumerable<Guid> userIds, PushPayload payload, CancellationToken cancellationToken = default);

    /// <summary>Envía a todos los dispositivos de un rol ("admin" o "campo") del tenant actual.</summary>
    Task SendToRoleAsync(string role, PushPayload payload, CancellationToken cancellationToken = default);
}
