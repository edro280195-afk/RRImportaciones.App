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
    private readonly IFileStorageService _fileStorage;
    private readonly PlantillaMensajeService _plantillas;

    public WhatsAppCotizacionService(
        AppDbContext db,
        IConfiguration configuration,
        ICotizacionPdfService pdfService,
        IFileStorageService fileStorage,
        IPlantillaMensajeService plantillas)
    {
        _db = db;
        _configuration = configuration;
        _pdfService = pdfService;
        _fileStorage = fileStorage;
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

        if (string.Equals(cotizacion.EstadoLogistico, "ACEPTADA", StringComparison.OrdinalIgnoreCase)
            || string.Equals(cotizacion.EstadoLogistico, "RECHAZADA", StringComparison.OrdinalIgnoreCase)
            || string.Equals(cotizacion.EstadoLogistico, "CONVERTIDA", StringComparison.OrdinalIgnoreCase)
            || string.Equals(cotizacion.EstadoLogistico, "EXPIRADA", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"No se puede generar link de WhatsApp para una cotizacion en estado {cotizacion.EstadoLogistico}.");

        var pdfUrl = await SavePublicPdfAsync(cotizacionId, cotizacion.Folio);
        var template = await _plantillas.GetOrCreateDefaultAsync("COTIZACION_WHATSAPP");
        var variables = PlantillaMensajeService.BuildVariables(cotizacion, pdfUrl, request.MensajePersonalizado);
        var messageTemplate = string.IsNullOrWhiteSpace(request.MensajePersonalizado)
            ? template.Cuerpo
            : request.MensajePersonalizado.Trim();
        var message = PlantillaMensajeService.Render(messageTemplate, variables);

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
        var token = Guid.NewGuid().ToString("N")[..12];
        var safeFolio = string.IsNullOrWhiteSpace(folio) ? cotizacionId.ToString("N")[..8] : SanitizeFileName(folio);
        var fileName = $"cotizacion-{safeFolio}-{token}.pdf";

        using var stream = new MemoryStream(pdf);
        var storageUrl = await _fileStorage.UploadFileAsync("public/cotizaciones", fileName, "application/pdf", stream);

        if (storageUrl.StartsWith("/"))
        {
            var baseUrl = _configuration["PublicApp:BaseUrl"]
                ?? _configuration["AppBaseUrl"]
                ?? "http://localhost:5198";
            return $"{baseUrl.TrimEnd('/')}{storageUrl}";
        }

        return storageUrl;
    }

    private static string SanitizeFileName(string value)
        => string.Join("-", value.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)).Trim('-');

    private static string OnlyDigits(string value)
        => new(value.Where(char.IsDigit).ToArray());
}
