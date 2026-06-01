using System.Net.Http.Headers;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Domain.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.WhatsApp;

/// <summary>
/// Implementación de IWhatsAppService usando la API REST de Twilio WhatsApp.
/// Funciona en modo "best effort": cualquier fallo se registra pero no rompe el flujo del caller.
/// Si la configuración no está activa, todos los métodos hacen no-op.
/// </summary>
public class TwilioWhatsAppService : IWhatsAppService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<TwilioWhatsAppService> _logger;

    private readonly bool _enabled;
    private readonly string? _accountSid;
    private readonly string? _authToken;
    private readonly string? _fromNumber;
    private readonly string[] _adminsNumbers;
    private readonly string _appBaseUrl;

    public TwilioWhatsAppService(
        IHttpClientFactory httpFactory,
        AppDbContext db,
        ITenantContext tenantContext,
        IConfiguration config,
        ILogger<TwilioWhatsAppService> logger)
    {
        _httpFactory = httpFactory;
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;

        _enabled = string.Equals(config["WhatsApp:Enabled"], "true", StringComparison.OrdinalIgnoreCase);
        _accountSid = config["WhatsApp:Twilio:AccountSid"];
        _authToken = config["WhatsApp:Twilio:AuthToken"];
        _fromNumber = config["WhatsApp:Twilio:FromNumber"];
        _adminsNumbers = config.GetSection("WhatsApp:AdminsNumbers").Get<string[]>() ?? Array.Empty<string>();
        _appBaseUrl = config["AppBaseUrl"] ?? string.Empty;
    }

    public bool IsEnabled =>
        _enabled
        && !string.IsNullOrWhiteSpace(_accountSid)
        && !string.IsNullOrWhiteSpace(_authToken)
        && !string.IsNullOrWhiteSpace(_fromNumber);

    public async Task EnviarPreInspeccionAdminsAsync(
        Guid tareaCampoId,
        string vehiculoResumen,
        string? vin,
        string? operadorNombre,
        string? clienteSugerido,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _adminsNumbers.Length == 0) return;

        var linkBandeja = string.IsNullOrWhiteSpace(_appBaseUrl)
            ? "/campo/bandeja-admin"
            : $"{_appBaseUrl.TrimEnd('/')}/campo/bandeja-admin";

        var partes = new List<string>
        {
            $"🚗 Pre-inspección nueva en yarda",
            $"Vehículo: {vehiculoResumen}",
        };
        if (!string.IsNullOrWhiteSpace(vin)) partes.Add($"VIN: {vin}");
        if (!string.IsNullOrWhiteSpace(clienteSugerido)) partes.Add($"Cliente sugerido: {clienteSugerido}");
        if (!string.IsNullOrWhiteSpace(operadorNombre)) partes.Add($"Capturó: {operadorNombre}");
        partes.Add($"Revisar: {linkBandeja}");

        var body = string.Join("\n", partes);

        foreach (var numero in _adminsNumbers)
        {
            await SendAsync(numero, "PRE_INSPECCION_ADMIN", body, tareaCampoId, cancellationToken);
        }
    }

    public async Task EnviarCotizacionClienteAsync(
        string clienteTelefono,
        string clienteNombre,
        Guid cotizacionId,
        string folioCotizacion,
        decimal totalCotizacion,
        string linkCotizacion,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled) return;
        if (string.IsNullOrWhiteSpace(clienteTelefono)) return;

        var nombre = string.IsNullOrWhiteSpace(clienteNombre) ? "cliente" : clienteNombre;
        var body =
            $"Hola {nombre}, te compartimos tu cotización de R&R Importaciones.\n" +
            $"Folio: {folioCotizacion}\n" +
            $"Total estimado: ${totalCotizacion:N2} MXN\n" +
            $"Revísala aquí: {linkCotizacion}\n" +
            $"Cualquier duda, contáctanos por este medio.";

        await SendAsync(clienteTelefono, "COTIZACION_CLIENTE", body, cotizacionId, cancellationToken);
    }

    public async Task EnviarSolicitudFotosYarderoAsync(
        string operadorTelefono,
        string vehiculoResumen,
        string mensaje,
        Guid tareaCampoId,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled) return;
        if (string.IsNullOrWhiteSpace(operadorTelefono)) return;

        var body =
            $"📸 Admin pide más fotos\n" +
            $"Vehículo: {vehiculoResumen}\n" +
            $"Detalle: {mensaje}";

        await SendAsync(operadorTelefono, "SOLICITUD_FOTOS", body, tareaCampoId, cancellationToken);
    }

    private async Task SendAsync(
        string toNumber,
        string template,
        string body,
        Guid? refId,
        CancellationToken cancellationToken)
    {
        var to = NormalizeNumber(toNumber);
        var tenantId = _tenantContext.HasTenant ? _tenantContext.TenantId : Guid.Empty;

        var record = new WhatsAppMessage
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            To = to,
            Template = template,
            Body = body,
            Status = "PENDING",
            RefEntityId = refId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.WhatsAppMessages.Add(record);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo persistir el WhatsAppMessage previo al envío. Se continúa con el envío.");
        }

        try
        {
            var client = _httpFactory.CreateClient("twilio");
            var url = $"https://api.twilio.com/2010-04-01/Accounts/{_accountSid}/Messages.json";

            var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_accountSid}:{_authToken}"));
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);

            var form = new Dictionary<string, string>
            {
                ["To"] = $"whatsapp:{to}",
                ["From"] = _fromNumber!.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase) ? _fromNumber : $"whatsapp:{_fromNumber}",
                ["Body"] = body,
            };
            request.Content = new FormUrlEncodedContent(form);

            using var response = await client.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                record.Status = "SENT";
                record.SentAt = DateTime.UtcNow;
                record.ExternalId = TryExtractSid(responseBody);
            }
            else
            {
                record.Status = "FAILED";
                record.Error = Truncate(responseBody, 900);
                _logger.LogWarning("Envío WhatsApp falló ({Status}): {Body}", (int)response.StatusCode, record.Error);
            }
        }
        catch (Exception ex)
        {
            record.Status = "FAILED";
            record.Error = Truncate(ex.Message, 900);
            _logger.LogWarning(ex, "Excepción enviando WhatsApp a {To}", to);
        }

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo actualizar estado final del WhatsAppMessage.");
        }
    }

    private static string NormalizeNumber(string raw)
    {
        var clean = new string(raw.Where(c => char.IsDigit(c) || c == '+').ToArray());
        if (!clean.StartsWith('+'))
        {
            // Asumimos México si no trae código de país.
            if (clean.Length == 10) clean = "+52" + clean;
            else if (clean.Length == 12 && clean.StartsWith("52")) clean = "+" + clean;
            else clean = "+" + clean;
        }
        return clean;
    }

    private static string? TryExtractSid(string responseBody)
    {
        // Twilio devuelve JSON: { "sid": "SMxxxx", ... }
        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(responseBody);
            if (doc.RootElement.TryGetProperty("sid", out var sid))
                return sid.GetString();
        }
        catch { /* ignore */ }
        return null;
    }

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s.Substring(0, max));
}
