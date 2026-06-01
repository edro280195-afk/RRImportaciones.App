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

public class WebPushNotificationService : IPushNotificationService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<WebPushNotificationService> _logger;

    private readonly VapidDetails? _vapidDetails;
    private readonly string _publicKey;

    public WebPushNotificationService(
        AppDbContext db,
        ITenantContext tenantContext,
        ICurrentUserService currentUser,
        IConfiguration config,
        ILogger<WebPushNotificationService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _currentUser = currentUser;
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

    public async Task SendToUserAsync(Guid userId, string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default)
    {
        if (_vapidDetails == null) return;
        var subs = await _db.PushSubscriptions
            .IgnoreQueryFilters()
            .Where(s => s.UserId == userId)
            .ToListAsync(cancellationToken);
        await SendToManyAsync(subs, title, body, url, tag, cancellationToken);
    }

    public async Task SendToAdminsAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default)
    {
        if (_vapidDetails == null) return;
        var tenantId = _tenantContext.HasTenant ? _tenantContext.TenantId : (Guid?)null;
        var query = _db.PushSubscriptions.IgnoreQueryFilters().Where(s => s.Role == "admin");
        if (tenantId.HasValue) query = query.Where(s => s.TenantId == tenantId.Value);
        var subs = await query.ToListAsync(cancellationToken);
        await SendToManyAsync(subs, title, body, url, tag, cancellationToken);
    }

    public async Task SendToCampoAsync(string title, string body, string? url = null, string? tag = null, CancellationToken cancellationToken = default)
    {
        if (_vapidDetails == null) return;
        var tenantId = _tenantContext.HasTenant ? _tenantContext.TenantId : (Guid?)null;
        var query = _db.PushSubscriptions.IgnoreQueryFilters().Where(s => s.Role == "campo");
        if (tenantId.HasValue) query = query.Where(s => s.TenantId == tenantId.Value);
        var subs = await query.ToListAsync(cancellationToken);
        await SendToManyAsync(subs, title, body, url, tag, cancellationToken);
    }

    private async Task SendToManyAsync(List<DomainPushSubscription> subs, string title, string body, string? url, string? tag, CancellationToken cancellationToken)
    {
        if (subs.Count == 0 || _vapidDetails == null) return;

        var client = new WebPushClient();
        var payload = JsonSerializer.Serialize(new
        {
            title,
            body,
            url = url ?? "/",
            tag = tag ?? "rr-notification",
            timestamp = DateTime.UtcNow,
        });

        var toRemove = new List<DomainPushSubscription>();
        foreach (var sub in subs)
        {
            var webSub = new WebPushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
            try
            {
                await client.SendNotificationAsync(webSub, payload, _vapidDetails);
                sub.LastUsedAt = DateTime.UtcNow;
            }
            catch (WebPushException ex) when (ex.StatusCode == HttpStatusCode.Gone || ex.StatusCode == HttpStatusCode.NotFound)
            {
                _logger.LogInformation("Suscripción push expirada (HTTP {Status}); eliminando endpoint.", (int)ex.StatusCode);
                toRemove.Add(sub);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error enviando push a endpoint {Endpoint}", sub.Endpoint);
            }
        }

        if (toRemove.Count > 0)
        {
            _db.PushSubscriptions.RemoveRange(toRemove);
        }

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo persistir LastUsedAt/limpieza de suscripciones push.");
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
}
