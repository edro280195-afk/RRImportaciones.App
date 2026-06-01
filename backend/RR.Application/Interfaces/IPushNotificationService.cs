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

public interface IPushNotificationService
{
    string PublicKey { get; }

    Task SubscribeAsync(PushSubscribeRequest request, CancellationToken cancellationToken = default);
    Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken = default);

    /// <summary>Envía push a un usuario específico (por sus suscripciones registradas).</summary>
    Task SendToUserAsync(Guid userId, string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default);

    /// <summary>Envía push broadcast a todos los suscriptos con rol "admin" en el tenant actual.</summary>
    Task SendToAdminsAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default);

    /// <summary>Envía push broadcast a todos los suscriptos con rol "campo".</summary>
    Task SendToCampoAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default);
}
