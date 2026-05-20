using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MimeKit;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ICotizacionPdfService _pdfService;
    private readonly ICotizadorService _cotizadorService;
    private readonly PlantillaMensajeService _plantillas;

    public EmailService(
        AppDbContext db,
        IConfiguration configuration,
        ICotizacionPdfService pdfService,
        ICotizadorService cotizadorService,
        IPlantillaMensajeService plantillas)
    {
        _db = db;
        _configuration = configuration;
        _pdfService = pdfService;
        _cotizadorService = cotizadorService;
        _plantillas = (PlantillaMensajeService)plantillas;
    }

    public async Task SendCotizacionAsync(Guid cotizacionId, string destinatario, string? mensajePersonalizado)
    {
        if (string.IsNullOrWhiteSpace(destinatario))
            throw new InvalidOperationException("El destinatario es obligatorio");

        var cotizacion = await _db.Cotizaciones
            .Include(x => x.Cliente)
            .Include(x => x.Tenant)
            .FirstOrDefaultAsync(x => x.Id == cotizacionId)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada");

        var settings = LoadSettings();
        var template = await _plantillas.GetOrCreateDefaultAsync("COTIZACION_EMAIL");
        var variables = PlantillaMensajeService.BuildVariables(cotizacion, mensajePersonalizado: mensajePersonalizado);
        var subject = PlantillaMensajeService.Render(template.Asunto ?? "Cotizacion R&R Importaciones", variables);
        var body = PlantillaMensajeService.Render(template.Cuerpo, variables);
        var pdf = await _pdfService.GeneratePdfAsync(cotizacionId);

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(destinatario.Trim()));
        message.Subject = subject;

        var builder = new BodyBuilder { HtmlBody = body };
        builder.Attachments.Add($"cotizacion-{cotizacion.Folio ?? cotizacion.Id.ToString("N")}.pdf", pdf, ContentType.Parse("application/pdf"));
        message.Body = builder.ToMessageBody();

        using var smtp = new SmtpClient();
        var secure = settings.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await smtp.ConnectAsync(settings.Host, settings.Port, secure);
        if (!string.IsNullOrWhiteSpace(settings.Username))
            await smtp.AuthenticateAsync(settings.Username, settings.Password ?? string.Empty);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);

        await _cotizadorService.MarcarEnviadaAsync(cotizacionId, new MarcarEnviadaRequest
        {
            EnviadoPor = "EMAIL",
            EnviadoA = destinatario.Trim(),
            MensajePersonalizado = mensajePersonalizado,
        });
    }

    public async Task SendCampoCompletadoAsync(
        string destinatario,
        string numeroConsecutivo,
        string vehiculoResumen,
        string? vinConfirmado,
        string? ubicacion,
        string? incidencia,
        IReadOnlyList<string> fotosUrls,
        string operadorNombre,
        string appBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(destinatario)) return;

        SmtpSettings settings;
        try { settings = LoadSettings(); }
        catch { return; } // Si SMTP no está configurado, no fallamos el proceso principal

        var tieneIncidencia = !string.IsNullOrWhiteSpace(incidencia);
        var accentColor = tieneIncidencia ? "#D97706" : "#16A34A";
        var estadoBadge = tieneIncidencia ? "INCIDENCIA" : "COMPLETADA";
        var subject = tieneIncidencia
            ? $"⚠️ Incidencia en campo — {vehiculoResumen} ({numeroConsecutivo})"
            : $"✅ Captura completada — {vehiculoResumen} ({numeroConsecutivo})";

        // Construir galería de fotos
        var fotosHtml = string.Empty;
        if (fotosUrls.Count > 0)
        {
            var imgs = string.Concat(fotosUrls.Take(6).Select(url =>
            {
                var fullUrl = url.StartsWith("http") ? url : $"{appBaseUrl.TrimEnd('/')}{url}";
                return $"""<img src="{fullUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" alt="Foto">""";
            }));
            fotosHtml = $"""
                <div style="margin-top:16px;">
                  <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;">EVIDENCIA FOTOGRÁFICA ({fotosUrls.Count} foto{(fotosUrls.Count != 1 ? "s" : "")})</p>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">{imgs}</div>
                </div>
            """;
        }

        var incidenciaHtml = tieneIncidencia
            ? $"""
              <tr>
                <td style="padding:10px 16px;background:#FEF3C7;border-radius:8px;margin-top:8px;">
                  <span style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;">⚠ Incidencia</span>
                  <p style="margin:4px 0 0;font-size:13px;color:#78350F;">{incidencia}</p>
                </td>
              </tr>
            """
            : string.Empty;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="es">
            <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
              <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <div style="background:{accentColor};padding:20px 24px;">
                  <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.7);">R&amp;R Importaciones · Módulo de Campo</p>
                  <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;">{vehiculoResumen}</h1>
                </div>
                <div style="padding:24px;">
                  <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Trámite</span>
                      <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#111827;">{numeroConsecutivo}</p>
                    </td></tr>
                    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Operador</span>
                      <p style="margin:2px 0 0;font-size:14px;color:#374151;">{operadorNombre}</p>
                    </td></tr>
                    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">VIN Confirmado</span>
                      <p style="margin:2px 0 0;font-size:14px;font-family:monospace;color:#374151;">{vinConfirmado ?? "—"}</p>
                    </td></tr>
                    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Ubicación en yarda</span>
                      <p style="margin:2px 0 0;font-size:14px;color:#374151;">{ubicacion ?? "—"}</p>
                    </td></tr>
                    <tr><td style="padding:8px 0;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Estado</span>
                      <p style="margin:4px 0 0;"><span style="background:{accentColor};color:#fff;border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700;">{estadoBadge}</span></p>
                    </td></tr>
                    {incidenciaHtml}
                  </table>
                  {fotosHtml}
                </div>
                <div style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;">R&amp;R Importaciones · Notificación automática del Módulo de Campo</p>
                </div>
              </div>
            </body>
            </html>
        """;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(destinatario.Trim()));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var smtpClient = new SmtpClient();
        var secureMode = settings.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await smtpClient.ConnectAsync(settings.Host, settings.Port, secureMode);
        if (!string.IsNullOrWhiteSpace(settings.Username))
            await smtpClient.AuthenticateAsync(settings.Username, settings.Password ?? string.Empty);
        await smtpClient.SendAsync(message);
        await smtpClient.DisconnectAsync(true);
    }

    public async Task SendPinResetRequestedAsync(
        string destinatario,
        string operadorNombre,
        string username,
        string appBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(destinatario)) return;

        SmtpSettings settings;
        try { settings = LoadSettings(); }
        catch { return; }

        var accentColor = "#D97706";
        var subject = $"⚠️ Solicitud de Restablecimiento de PIN — {operadorNombre}";

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="es">
            <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
              <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <div style="background:{accentColor};padding:20px 24px;">
                  <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.7);">R&amp;R Importaciones · Soporte de Acceso</p>
                  <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;">Solicitud de Restablecimiento de PIN</h1>
                </div>
                <div style="padding:24px;">
                  <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.5;">
                    Un operador del personal de campo ha reportado que olvidó su PIN de acceso y requiere un restablecimiento:
                  </p>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Nombre del Operador</span>
                      <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#111827;">{operadorNombre}</p>
                    </td></tr>
                    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Nombre de Usuario</span>
                      <p style="margin:2px 0 0;font-size:14px;color:#374151;font-family:monospace;">{username}</p>
                    </td></tr>
                    <tr><td style="padding:8px 0;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Fecha y Hora</span>
                      <p style="margin:2px 0 0;font-size:14px;color:#374151;">{DateTime.UtcNow.AddHours(-6).ToString("dd/MM/yyyy hh:mm tt")} (Centro de México)</p>
                    </td></tr>
                  </table>
                  <div style="text-align:center;margin-top:24px;">
                    <a href="{appBaseUrl.TrimEnd('/')}/usuarios" style="display:inline-block;background:#C61D26;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:700;border-radius:10px;box-shadow:0 2px 4px rgba(198,29,38,0.2);">
                      Ir a Gestión de Usuarios
                    </a>
                  </div>
                </div>
                <div style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;">R&amp;R Importaciones · Notificación de Seguridad en Tiempo Real</p>
                </div>
              </div>
            </body>
            </html>
        """;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(destinatario.Trim()));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var smtpClient = new SmtpClient();
        var secureMode = settings.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await smtpClient.ConnectAsync(settings.Host, settings.Port, secureMode);
        if (!string.IsNullOrWhiteSpace(settings.Username))
            await smtpClient.AuthenticateAsync(settings.Username, settings.Password ?? string.Empty);
        await smtpClient.SendAsync(message);
        await smtpClient.DisconnectAsync(true);
    }

    private SmtpSettings LoadSettings()
    {
        var settings = _configuration.GetSection("Smtp").Get<SmtpSettings>() ?? new SmtpSettings();
        if (string.IsNullOrWhiteSpace(settings.Host) || settings.Port <= 0 || string.IsNullOrWhiteSpace(settings.FromEmail))
            throw new InvalidOperationException("SMTP no esta configurado. Revisa la seccion Smtp en appsettings.json.");

        return settings;
    }

    private sealed class SmtpSettings
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 2525;
        public string? Username { get; set; }
        public string? Password { get; set; }
        public string FromEmail { get; set; } = string.Empty;
        public string FromName { get; set; } = "R&R Importaciones";
        public bool UseSsl { get; set; }
    }
}
