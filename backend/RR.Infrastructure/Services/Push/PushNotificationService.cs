using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using WebPush;
using DomainPushSubscription = RR.Domain.Entities.PushSubscription;
using WebPushSubscription = WebPush.PushSubscription;

namespace RR.Infrastructure.Services.Push;

/// <summary>
/// Punto único de salida de las notificaciones push. Maneja dos canales:
///
///   1. Firebase Cloud Messaging — el nativo. Cada dispositivo guarda un token
///      en <c>PushDeviceTokens</c>.
///   2. Web Push con VAPID — el que ya existía. Sigue vivo como respaldo para
///      navegadores que quedaron suscritos antes de Firebase, o para cuando el
///      backend no trae credenciales de Firebase.
///
/// Un mismo dispositivo se registra en UNO solo de los dos (el frontend elige
/// Firebase si está configurado), así que nadie recibe la misma notificación
/// dos veces.
/// </summary>
public class PushNotificationService : IPushNotificationService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IFirebaseMessagingSender _firebase;
    private readonly ILogger<PushNotificationService> _logger;

    private readonly VapidDetails? _vapidDetails;
    private readonly string _publicKey;

    public PushNotificationService(
        AppDbContext db,
        ITenantContext tenantContext,
        ICurrentUserService currentUser,
        IFirebaseMessagingSender firebase,
        IConfiguration config,
        ILogger<PushNotificationService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _currentUser = currentUser;
        _firebase = firebase;
        _logger = logger;

        var subject = config["VapidDetails:Subject"];
        _publicKey = config["VapidDetails:PublicKey"] ?? string.Empty;
        var privateKey = config["VapidDetails:PrivateKey"] ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(subject)
            && !string.IsNullOrWhiteSpace(_publicKey)
            && !string.IsNullOrWhiteSpace(privateKey))
        {
            _vapidDetails = new VapidDetails(subject, _publicKey, privateKey);
        }
    }

    public string PublicKey => _publicKey;

    public bool FirebaseEnabled => _firebase.Enabled;

    // ── Web Push (VAPID) ──────────────────────────────────────────────────

    public async Task SubscribeAsync(PushSubscribeRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Endpoint))
            throw new InvalidOperationException("Endpoint requerido");
        if (string.IsNullOrWhiteSpace(request.Keys.P256dh) || string.IsNullOrWhiteSpace(request.Keys.Auth))
            throw new InvalidOperationException("Claves p256dh/auth requeridas");

        var userId = _currentUser.UserId
            ?? throw new InvalidOperationException("Usuario no autenticado");
        var tenantId = _tenantContext.HasTenant ? _tenantContext.TenantId : Guid.Empty;

        // Si existe la suscripción (mismo endpoint), actualizamos. Si no, creamos.
        var existing = await _db.PushSubscriptions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint, cancellationToken);

        if (existing != null)
        {
            existing.UserId = userId;
            existing.TenantId = tenantId;
            existing.P256dh = request.Keys.P256dh;
            existing.Auth = request.Keys.Auth;
            existing.Role = NormalizeRole(request.Role);
            existing.UserAgent = request.UserAgent;
            existing.LastUsedAt = DateTime.UtcNow;
        }
        else
        {
            _db.PushSubscriptions.Add(new DomainPushSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                Endpoint = request.Endpoint,
                P256dh = request.Keys.P256dh,
                Auth = request.Keys.Auth,
                Role = NormalizeRole(request.Role),
                UserAgent = request.UserAgent,
                CreatedAt = DateTime.UtcNow,
                LastUsedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken = default)
    {
        var sub = await _db.PushSubscriptions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Endpoint == endpoint, cancellationToken);
        if (sub == null) return;
        _db.PushSubscriptions.Remove(sub);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // ── Firebase Cloud Messaging ──────────────────────────────────────────

    public async Task RegisterDeviceTokenAsync(RegisterDeviceTokenRequest request, CancellationToken cancellationToken = default)
    {
        var token = request.Token?.Trim();
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException("Token requerido");

        var userId = _currentUser.UserId
            ?? throw new InvalidOperationException("Usuario no autenticado");
        var tenantId = _tenantContext.HasTenant ? _tenantContext.TenantId : Guid.Empty;

        var existente = await _db.PushDeviceTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Token == token, cancellationToken);

        if (existente != null)
        {
            // El mismo dispositivo puede cambiar de usuario (varios yarderos con
            // un solo teléfono), así que reasignamos en lugar de duplicar.
            existente.UserId = userId;
            existente.TenantId = tenantId;
            existente.Role = NormalizeRole(request.Role);
            existente.Platform = NormalizePlatform(request.Platform);
            existente.UserAgent = Truncate(request.UserAgent, 500);
            existente.LastUsedAt = DateTime.UtcNow;
        }
        else
        {
            _db.PushDeviceTokens.Add(new PushDeviceToken
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                Token = token,
                Role = NormalizeRole(request.Role),
                Platform = NormalizePlatform(request.Platform),
                UserAgent = Truncate(request.UserAgent, 500),
                CreatedAt = DateTime.UtcNow,
                LastUsedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UnregisterDeviceTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token)) return;
        var registro = await _db.PushDeviceTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Token == token, cancellationToken);
        if (registro == null) return;
        _db.PushDeviceTokens.Remove(registro);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // ── Envíos ────────────────────────────────────────────────────────────

    public Task SendToUserAsync(Guid userId, string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default)
        => SendToUsersAsync([userId], new PushPayload { Title = title, Body = body, Url = url, Tag = tag }, cancellationToken);

    public Task SendToAdminsAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default)
        => SendToRoleAsync("admin", new PushPayload { Title = title, Body = body, Url = url, Tag = tag }, cancellationToken);

    public Task SendToCampoAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default)
        => SendToRoleAsync("campo", new PushPayload { Title = title, Body = body, Url = url, Tag = tag }, cancellationToken);

    public async Task SendToUsersAsync(IEnumerable<Guid> userIds, PushPayload payload, CancellationToken cancellationToken = default)
    {
        var ids = userIds.Where(id => id != Guid.Empty).Distinct().ToList();
        if (ids.Count == 0) return;

        var tokens = await _db.PushDeviceTokens
            .IgnoreQueryFilters()
            .Where(t => ids.Contains(t.UserId))
            .ToListAsync(cancellationToken);

        var subs = await _db.PushSubscriptions
            .IgnoreQueryFilters()
            .Where(s => ids.Contains(s.UserId))
            .ToListAsync(cancellationToken);

        await DespacharAsync(tokens, subs, payload, cancellationToken);
    }

    public async Task SendToRoleAsync(string role, PushPayload payload, CancellationToken cancellationToken = default)
    {
        var rol = NormalizeRole(role);
        var tenantId = _tenantContext.HasTenant ? _tenantContext.TenantId : (Guid?)null;

        var tokensQuery = _db.PushDeviceTokens.IgnoreQueryFilters().Where(t => t.Role == rol);
        var subsQuery = _db.PushSubscriptions.IgnoreQueryFilters().Where(s => s.Role == rol);

        if (tenantId.HasValue)
        {
            tokensQuery = tokensQuery.Where(t => t.TenantId == tenantId.Value);
            subsQuery = subsQuery.Where(s => s.TenantId == tenantId.Value);
        }

        var tokens = await tokensQuery.ToListAsync(cancellationToken);
        var subs = await subsQuery.ToListAsync(cancellationToken);

        await DespacharAsync(tokens, subs, payload, cancellationToken);
    }

    private async Task DespacharAsync(
        List<PushDeviceToken> tokens,
        List<DomainPushSubscription> subs,
        PushPayload payload,
        CancellationToken cancellationToken)
    {
        var huboCambios = false;

        if (tokens.Count > 0 && _firebase.Enabled)
        {
            var invalidos = await _firebase.SendAsync(
                tokens.Select(t => t.Token).ToList(), payload, cancellationToken);

            var ahora = DateTime.UtcNow;
            var muertos = new HashSet<string>(invalidos, StringComparer.Ordinal);

            foreach (var registro in tokens)
            {
                if (muertos.Contains(registro.Token))
                    _db.PushDeviceTokens.Remove(registro);
                else
                    registro.LastUsedAt = ahora;
            }

            huboCambios = tokens.Count > 0;
        }

        if (subs.Count > 0)
        {
            await EnviarWebPushAsync(subs, payload, cancellationToken);
            huboCambios = true;
        }

        if (!huboCambios) return;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo persistir la limpieza de destinos push.");
        }
    }

    private async Task EnviarWebPushAsync(
        List<DomainPushSubscription> subs,
        PushPayload payload,
        CancellationToken cancellationToken)
    {
        if (_vapidDetails == null) return;

        var client = new WebPushClient();
        var contenido = JsonSerializer.Serialize(new
        {
            title = payload.Title,
            body = payload.Body,
            url = payload.Url ?? "/",
            tag = payload.Tag ?? "rr-notification",
            tipo = payload.Tipo ?? "generico",
            data = payload.Data,
            timestamp = DateTime.UtcNow,
        });

        foreach (var sub in subs)
        {
            var webSub = new WebPushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
            try
            {
                await client.SendNotificationAsync(webSub, contenido, _vapidDetails);
                sub.LastUsedAt = DateTime.UtcNow;
            }
            catch (WebPushException ex) when (ex.StatusCode == HttpStatusCode.Gone || ex.StatusCode == HttpStatusCode.NotFound)
            {
                _logger.LogInformation("Suscripción push expirada (HTTP {Status}); eliminando endpoint.", (int)ex.StatusCode);
                _db.PushSubscriptions.Remove(sub);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error enviando push a endpoint {Endpoint}", sub.Endpoint);
            }
        }
    }

    private static string NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return "admin";
        var lower = role.Trim().ToLowerInvariant();
        return lower switch
        {
            "campo" or "yardero" or "driver" => "campo",
            _ => "admin",
        };
    }

    private static string NormalizePlatform(string? platform)
    {
        if (string.IsNullOrWhiteSpace(platform)) return "web";
        var lower = platform.Trim().ToLowerInvariant();
        return lower switch
        {
            "android" => "android",
            "ios" => "ios",
            _ => "web",
        };
    }

    private static string? Truncate(string? value, int max)
        => string.IsNullOrEmpty(value) || value.Length <= max ? value : value[..max];
}
