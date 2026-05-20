using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class WhatsAppCotizacionService : IWhatsAppCotizacionService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ICotizacionPdfService _pdfService;
    private readonly PlantillaMensajeService _plantillas;

    public WhatsAppCotizacionService(
        AppDbContext db,
        IConfiguration configuration,
        ICotizacionPdfService pdfService,
        IPlantillaMensajeService plantillas)
    {
        _db = db;
        _configuration = configuration;
        _pdfService = pdfService;
        _plantillas = (PlantillaMensajeService)plantillas;
    }

    public async Task<WhatsAppLinkResponse> GenerateLinkAsync(Guid cotizacionId, WhatsAppLinkRequest request)
    {
        var telefono = OnlyDigits(request.Telefono);
        if (telefono.Length < 10)
            throw new InvalidOperationException("El telefono debe incluir lada y codigo de pais");

        var cotizacion = await _db.Cotizaciones
            .Include(x => x.Cliente)
            .FirstOrDefaultAsync(x => x.Id == cotizacionId)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada");

        var pdfUrl = await SavePublicPdfAsync(cotizacionId, cotizacion.Folio);
        var template = await _plantillas.GetOrCreateDefaultAsync("COTIZACION_WHATSAPP");
        var variables = PlantillaMensajeService.BuildVariables(cotizacion, pdfUrl, request.MensajePersonalizado);
        var message = PlantillaMensajeService.Render(template.Cuerpo, variables);
        if (!string.IsNullOrWhiteSpace(request.MensajePersonalizado))
            message = $"{request.MensajePersonalizado.Trim()}\n\n{message}";

        return new WhatsAppLinkResponse
        {
            PdfUrl = pdfUrl,
            Mensaje = message,
            WhatsappUrl = $"https://wa.me/{telefono}?text={Uri.EscapeDataString(message)}",
        };
    }

    private async Task<string> SavePublicPdfAsync(Guid cotizacionId, string? folio)
    {
        var pdf = await _pdfService.GeneratePdfAsync(cotizacionId);
        var root = ResolveStorageRoot();
        Directory.CreateDirectory(root);

        var token = Guid.NewGuid().ToString("N")[..12];
        var safeFolio = string.IsNullOrWhiteSpace(folio) ? cotizacionId.ToString("N")[..8] : SanitizeFileName(folio);
        var fileName = $"cotizacion-{safeFolio}-{token}.pdf";
        var path = Path.Combine(root, fileName);
        await File.WriteAllBytesAsync(path, pdf);

        var baseUrl = (_configuration["PublicApp:BaseUrl"] ?? "http://localhost:5198").TrimEnd('/');
        return $"{baseUrl}/storage/public/cotizaciones/{fileName}";
    }

    private static string ResolveStorageRoot()
    {
        var cwd = Directory.GetCurrentDirectory();
        var candidates = new[]
        {
            Path.Combine(cwd, "backend", "storage", "public", "cotizaciones"),
            Path.Combine(cwd, "..", "storage", "public", "cotizaciones"),
            Path.Combine(cwd, "storage", "public", "cotizaciones"),
        };

        var repoRootCandidate = candidates.FirstOrDefault(path => Directory.Exists(Path.GetFullPath(Path.Combine(path, "..", "..", ".."))));
        return Path.GetFullPath(repoRootCandidate ?? candidates[0]);
    }

    private static string SanitizeFileName(string value)
        => string.Join("-", value.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)).Trim('-');

    private static string OnlyDigits(string value)
        => new(value.Where(char.IsDigit).ToArray());
}
