using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class WhatsAppLoteService : IWhatsAppLoteService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILotePdfService _pdfService;
    private readonly PlantillaMensajeService _plantillas;

    public WhatsAppLoteService(
        AppDbContext db,
        IConfiguration configuration,
        ILotePdfService pdfService,
        IPlantillaMensajeService plantillas)
    {
        _db = db;
        _configuration = configuration;
        _pdfService = pdfService;
        _plantillas = (PlantillaMensajeService)plantillas;
    }

    public async Task<WhatsAppLinkResponse> GenerateLinkAsync(Guid loteId, WhatsAppLinkRequest request)
    {
        var telefono = OnlyDigits(request.Telefono);
        if (telefono.Length < 10)
            throw new InvalidOperationException("El telefono debe incluir lada y codigo de pais");

        var lote = await _db.LotesImportacion
            .Include(x => x.Cliente)
            .Include(x => x.Tramites)
            .FirstOrDefaultAsync(x => x.Id == loteId)
            ?? throw new KeyNotFoundException("Lote no encontrado");

        var pdfUrl = await SavePublicPdfAsync(loteId, lote.FolioLote);
        
        // Render custom template for Lotes (fallback to a basic message if no template)
        var total = lote.Tramites.Sum(t => t.Honorarios + t.CobroTotal + t.CargoExpress);
        
        var message = $"Hola {lote.Cliente.Apodo}, te compartimos el resumen de tu Lote de importacion {lote.FolioLote} con {lote.Tramites.Count} vehiculos.\n\nTotal estimado: {total:C2} MXN.\n\nPuedes revisar el desglose en el siguiente enlace:\n{pdfUrl}";

        if (!string.IsNullOrWhiteSpace(request.MensajePersonalizado))
            message = $"{request.MensajePersonalizado.Trim()}\n\n{message}";

        return new WhatsAppLinkResponse
        {
            PdfUrl = pdfUrl,
            Mensaje = message,
            WhatsappUrl = $"https://wa.me/{telefono}?text={Uri.EscapeDataString(message)}",
        };
    }

    private async Task<string> SavePublicPdfAsync(Guid loteId, string folio)
    {
        var pdf = await _pdfService.GeneratePdfAsync(loteId);
        var root = ResolveStorageRoot();
        Directory.CreateDirectory(root);

        var token = Guid.NewGuid().ToString("N")[..12];
        var safeFolio = SanitizeFileName(folio);
        var fileName = $"lote-{safeFolio}-{token}.pdf";
        var path = Path.Combine(root, fileName);
        await File.WriteAllBytesAsync(path, pdf);

        var baseUrl = (_configuration["PublicApp:BaseUrl"] ?? "http://localhost:5198").TrimEnd('/');
        return $"{baseUrl}/storage/public/lotes/{fileName}";
    }

    private static string ResolveStorageRoot()
    {
        var cwd = Directory.GetCurrentDirectory();
        var candidates = new[]
        {
            Path.Combine(cwd, "backend", "storage", "public", "lotes"),
            Path.Combine(cwd, "..", "storage", "public", "lotes"),
            Path.Combine(cwd, "storage", "public", "lotes"),
        };

        var repoRootCandidate = candidates.FirstOrDefault(path => Directory.Exists(Path.GetFullPath(Path.Combine(path, "..", "..", ".."))));
        return Path.GetFullPath(repoRootCandidate ?? candidates[0]);
    }

    private static string SanitizeFileName(string value)
        => string.Join("-", value.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)).Trim('-');

    private static string OnlyDigits(string value)
        => new(value.Where(char.IsDigit).ToArray());
}
