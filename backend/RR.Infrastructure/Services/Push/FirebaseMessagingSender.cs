using System.Text;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RR.Application.Interfaces;

namespace RR.Infrastructure.Services.Push;

/// <summary>
/// Canal nativo de Firebase Cloud Messaging. Habla con la API HTTP v1 a través
/// del SDK de administrador, así que no hay que firmar tokens OAuth a mano.
///
/// Es singleton porque FirebaseApp se inicializa una sola vez por proceso: crear
/// dos instancias con el mismo nombre truena.
/// </summary>
public interface IFirebaseMessagingSender
{
    /// <summary>True cuando hay credenciales cargadas y se puede enviar.</summary>
    bool Enabled { get; }

    /// <summary>
    /// Envía la notificación a los tokens indicados y devuelve los que Firebase
    /// rechazó por estar muertos (desinstalados, permisos revocados, caducados),
    /// para que el llamador los borre de la base.
    /// </summary>
    Task<IReadOnlyCollection<string>> SendAsync(
        IReadOnlyList<string> tokens,
        PushPayload payload,
        CancellationToken cancellationToken = default);
}

public class FirebaseMessagingSender : IFirebaseMessagingSender
{
    /// <summary>Límite duro de la API multicast de FCM.</summary>
    private const int MaxTokensPorLote = 500;

    private const string AppName = "rr-importaciones";

    private readonly ILogger<FirebaseMessagingSender> _logger;
    private readonly FirebaseMessaging? _messaging;
    private readonly string _appBaseUrl;
    private readonly string _iconUrl;

    public FirebaseMessagingSender(IConfiguration config, ILogger<FirebaseMessagingSender> logger)
    {
        _logger = logger;
        _appBaseUrl = (config["AppBaseUrl"] ?? string.Empty).TrimEnd('/');
        _iconUrl = string.IsNullOrEmpty(_appBaseUrl) ? "/icons/campo-192.png" : _appBaseUrl + "/icons/campo-192.png";

        var credential = ResolveCredential(config, logger);
        if (credential == null) return;

        try
        {
            var app = GetOrCreateApp(config, credential);

            _messaging = FirebaseMessaging.GetMessaging(app);
            logger.LogInformation("Firebase Cloud Messaging inicializado (proyecto {ProjectId}).", app.Options.ProjectId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "No se pudo inicializar Firebase; el push caerá al canal Web Push VAPID.");
        }
    }

    internal static FirebaseApp GetOrCreateApp(
        IConfiguration config,
        GoogleCredential credential,
        string appName = AppName)
    {
        var app = FirebaseApp.GetInstance(appName);
        if (app != null)
            return app;

        app = FirebaseApp.Create(new AppOptions
        {
            Credential = credential,
            ProjectId = config["Firebase:ProjectId"],
        }, appName);

        return app ?? throw new InvalidOperationException("FirebaseApp no pudo ser creada.");
    }

    public bool Enabled => _messaging != null;

    public async Task<IReadOnlyCollection<string>> SendAsync(
        IReadOnlyList<string> tokens,
        PushPayload payload,
        CancellationToken cancellationToken = default)
    {
        if (_messaging == null || tokens.Count == 0) return [];

        var invalidos = new List<string>();

        for (var offset = 0; offset < tokens.Count; offset += MaxTokensPorLote)
        {
            var lote = tokens.Skip(offset).Take(MaxTokensPorLote).ToList();
            var mensaje = BuildMessage(lote, payload);

            try
            {
                var respuesta = await _messaging.SendEachForMulticastAsync(mensaje, cancellationToken);

                for (var i = 0; i < respuesta.Responses.Count; i++)
                {
                    var item = respuesta.Responses[i];
                    if (item.IsSuccess) continue;

                    if (EsTokenMuerto(item.Exception))
                    {
                        invalidos.Add(lote[i]);
                    }
                    else
                    {
                        _logger.LogWarning(item.Exception, "FCM rechazó un envío ({Codigo}).",
                            item.Exception?.MessagingErrorCode?.ToString() ?? "desconocido");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error enviando lote de {Total} notificaciones por FCM.", lote.Count);
            }
        }

        return invalidos;
    }

    private MulticastMessage BuildMessage(List<string> tokens, PushPayload payload)
    {
        var ruta = string.IsNullOrWhiteSpace(payload.Url) ? "/" : payload.Url!;
        var tag = string.IsNullOrWhiteSpace(payload.Tag) ? "rr-notification" : payload.Tag!;

        var data = new Dictionary<string, string>
        {
            ["url"] = ruta,
            ["tag"] = tag,
            ["tipo"] = payload.Tipo ?? "generico",
            ["title"] = payload.Title,
            ["body"] = payload.Body,
            ["fecha"] = DateTime.UtcNow.ToString("O"),
        };

        if (payload.Data != null)
        {
            foreach (var (clave, valor) in payload.Data)
            {
                if (!string.IsNullOrWhiteSpace(valor)) data[clave] = valor;
            }
        }

        var webpush = new WebpushConfig
        {
            Headers = new Dictionary<string, string> { ["Urgency"] = "high" },
            Notification = new WebpushNotification
            {
                Title = payload.Title,
                Body = payload.Body,
                Icon = _iconUrl,
                Badge = _iconUrl,
                Tag = tag,
                Renotify = true,
                Vibrate = [120, 60, 120],
            },
        };

        // El link del click solo lo acepta FCM si es absoluto y https.
        var linkAbsoluto = BuildAbsoluteUrl(ruta);
        if (linkAbsoluto != null)
        {
            webpush.FcmOptions = new WebpushFcmOptions { Link = linkAbsoluto };
        }

        return new MulticastMessage
        {
            // El SDK marca Tokens como obsoleto y empuja hacia Fids, pero los FID
            // son installation IDs, otra cosa: lo que guardamos es el registration
            // token que devuelve getToken() en el navegador, y ese va aquí.
#pragma warning disable CS0618
            Tokens = tokens,
#pragma warning restore CS0618
            Notification = new Notification { Title = payload.Title, Body = payload.Body },
            Data = data,
            Webpush = webpush,
            Android = new AndroidConfig
            {
                Priority = Priority.High,
                Notification = new AndroidNotification
                {
                    ChannelId = "rr_notificaciones",
                    Tag = tag,
                    Sound = "default",
                },
            },
            Apns = new ApnsConfig
            {
                Aps = new Aps { Sound = "default", ContentAvailable = true },
                Headers = new Dictionary<string, string> { ["apns-priority"] = "10" },
            },
        };
    }

    private string? BuildAbsoluteUrl(string ruta)
    {
        if (ruta.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) return ruta;
        if (string.IsNullOrEmpty(_appBaseUrl) || !_appBaseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return null;
        return _appBaseUrl + (ruta.StartsWith('/') ? ruta : "/" + ruta);
    }

    private static bool EsTokenMuerto(FirebaseMessagingException? ex)
    {
        if (ex == null) return false;
        return ex.MessagingErrorCode is MessagingErrorCode.Unregistered
            or MessagingErrorCode.SenderIdMismatch
            or MessagingErrorCode.InvalidArgument;
    }

    /// <summary>
    /// Busca las credenciales en este orden: JSON pegado en configuración, JSON
    /// en base64 (lo cómodo para Render, que no lleva bien los saltos de línea),
    /// ruta a un archivo, y por último las credenciales por defecto de Google.
    /// </summary>
    private static GoogleCredential? ResolveCredential(IConfiguration config, ILogger logger)
    {
        var json = config["Firebase:ServiceAccountJson"];
        if (!string.IsNullOrWhiteSpace(json))
        {
            try { return GoogleCredential.FromJson(json); }
            catch (Exception ex) { logger.LogError(ex, "Firebase:ServiceAccountJson no es un JSON de cuenta de servicio válido."); }
        }

        var base64 = config["Firebase:ServiceAccountJsonBase64"];
        if (!string.IsNullOrWhiteSpace(base64))
        {
            try
            {
                var decodificado = Encoding.UTF8.GetString(Convert.FromBase64String(base64));
                return GoogleCredential.FromJson(decodificado);
            }
            catch (Exception ex) { logger.LogError(ex, "Firebase:ServiceAccountJsonBase64 no se pudo decodificar."); }
        }

        var path = config["Firebase:ServiceAccountPath"];
        if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
        {
            try { return GoogleCredential.FromFile(path); }
            catch (Exception ex) { logger.LogError(ex, "No se pudo leer el archivo de credenciales de Firebase en {Path}.", path); }
        }

        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS")))
        {
            try { return GoogleCredential.GetApplicationDefault(); }
            catch (Exception ex) { logger.LogError(ex, "No se pudieron cargar las credenciales por defecto de Google."); }
        }

        logger.LogInformation("Sin credenciales de Firebase: las notificaciones usarán el canal Web Push VAPID.");
        return null;
    }
}
