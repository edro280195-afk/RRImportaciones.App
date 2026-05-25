using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RR.Application.DTOs.Pagos;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class PagoReciboPdfService : IPagoReciboPdfService
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;

    public PagoReciboPdfService(AppDbContext db, IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // Siempre regenera con los datos mas recientes; no hay cache de archivo.
    public Task<PagoReciboResponse> GetOrGenerateAsync(Guid pagoId)
        => GenerateAndSaveAsync(pagoId, force: true);

    public async Task<PagoReciboResponse> GenerateAndSaveAsync(Guid pagoId, bool force = false)
    {
        var pago = await _db.Pagos
            .Include(p => p.Tenant)
            .Include(p => p.Tramite).ThenInclude(t => t.Cliente)
            .Include(p => p.Tramite).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(p => p.Tramite).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .FirstOrDefaultAsync(p => p.Id == pagoId)
            ?? throw new KeyNotFoundException("Pago no encontrado");

        pago.FolioRecibo ??= BuildFolioRecibo(pago);

        var pdf = await BuildPdfAsync(pago);
        var storagePath = GetReceiptStoragePath();
        Directory.CreateDirectory(storagePath);

        var safeFolio = pago.FolioRecibo.Replace("/", "-").Replace("\\", "-");
        var fileName = $"recibo-pago-{safeFolio}.pdf";
        var fullPath = Path.Combine(storagePath, fileName);
        await File.WriteAllBytesAsync(fullPath, pdf);

        pago.ReciboPagoUrl = $"/storage/public/pagos/recibos/{fileName}";
        pago.ReciboGeneradoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new PagoReciboResponse
        {
            PagoId = pago.Id,
            FolioRecibo = pago.FolioRecibo,
            ReciboPagoUrl = pago.ReciboPagoUrl,
            ReciboGeneradoEn = pago.ReciboGeneradoEn.Value,
            PhysicalPath = fullPath,
        };
    }

    private async Task<byte[]> BuildPdfAsync(Pago pago)
    {
        var totalRequerido = await GetTotalRequeridoMxnAsync(pago.TramiteId);
        var logo = ResolveLogoPath();

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(7.8f).FontFamily("Arial").FontColor("#252A33"));

                page.Content().Element(x => ComposeReceiptSheet(x, pago, totalRequerido, logo));
            });
        }).GeneratePdf();
    }

    private static void ComposeReceiptSheet(IContainer container, Pago pago, decimal totalRequerido, string? logo)
    {
        container.Column(column =>
        {
            column.Spacing(12);
            
            column.Item().Element(x => ComposeReceiptCopy(x, pago, totalRequerido, logo, "COPIA CLIENTE"));
            
            column.Item().BorderBottom(1).BorderColor("#9CA3AF").BorderDashPattern(new float[] { 4, 4 }).Padding(0);
            
            column.Item().Element(x => ComposeReceiptCopy(x, pago, totalRequerido, logo, "COPIA ARCHIVO"));
        });
    }

    private static void ComposeReceiptCopy(IContainer container, Pago pago, decimal totalRequerido, string? logo, string tipoCopia)
    {
        container.Border(1).BorderColor("#D7DCE4").Padding(10).Column(column =>
        {
            column.Spacing(6);
            
            column.Item().Row(row =>
            {
                row.RelativeItem().Element(x => ComposeHeader(x, pago, logo));
                
                row.ConstantItem(80).AlignMiddle().AlignRight()
                    .Background("#F3F4F6").Border(1).BorderColor("#D1D5DB")
                    .Padding(4, 2)
                    .Text(tipoCopia)
                    .Bold().FontSize(8.5f).FontColor("#374151");
            });
            
            column.Item().Element(x => ComposeContent(x, pago, totalRequerido));
            column.Item().Element(x => ComposeFooter(x, pago));
        });
    }

    private static void ComposeHeader(IContainer container, Pago pago, string? logo)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                row.ConstantItem(76).Height(36).Element(x =>
                {
                    if (logo is not null)
                        x.AlignLeft().Image(logo).FitHeight();
                    else
                        x.AlignMiddle().Text("R&R").Bold().FontSize(12).FontColor("#C61D26");
                });

                row.RelativeItem().Column(info =>
                {
                    info.Item().Text("R&R Importaciones").Bold().FontSize(12).FontColor("#0D1017");
                    info.Item().Text("DR. MIER 6909 Col. Buenavista").FontSize(6.7f);
                    info.Item().Text("Nuevo Laredo, Tam. C.P. 88120").FontSize(6.7f);
                    info.Item().Text("TEL. (867) 722-1596, (867) 100-5928").FontSize(6.7f);
                });

                row.ConstantItem(110).Column(folio =>
                {
                    folio.Item().AlignRight().Text($"Folio: {pago.FolioRecibo}").FontSize(6.8f).FontColor("#6B717F");
                });
            });

            column.Item().PaddingTop(4).LineHorizontal(1.2f).LineColor("#C61D26");
        });
    }

    private static void ComposeContent(IContainer container, Pago pago, decimal totalRequerido)
    {
        var tramite = pago.Tramite;
        var vehiculo = tramite.Vehiculo;
        var marca = vehiculo?.Marca?.Nombre ?? "N/D";
        var modelo = vehiculo?.Modelo?.Nombre ?? "N/D";
        var vin = vehiculo?.Vin ?? vehiculo?.VinCorto ?? "N/D";
        var vinUltimos = vin.Length > 6 ? vin[^6..] : vin;

        container.Column(column =>
        {
            column.Spacing(6);
            column.Item().Row(row =>
            {
                row.RelativeItem().Column(title =>
                {
                    title.Item().Text("COMPROBANTE DE PAGO").Bold().FontSize(12).FontColor("#0D1017");
                    title.Item().Text($"Tramite: {tramite.NumeroConsecutivo}").FontSize(7).FontColor("#6B717F");
                });
                row.ConstantItem(128).AlignRight().Column(date =>
                {
                    date.Item().Text($"Emision: {DateTime.UtcNow:dd/MM/yyyy}").FontSize(6.8f);
                    date.Item().Text($"Pago: {pago.FechaPago:dd/MM/yyyy}").FontSize(6.8f);
                });
            });

            column.Item().Element(x => ComposeInfoGrid(x, marca, modelo, vehiculo?.Anno, vinUltimos, totalRequerido, pago.Moneda, FormatTipoCambio(pago)));
            column.Item().Element(x => ComposePaymentTable(x, pago));
            column.Item().PaddingTop(6).Element(ComposeSignatures);
            column.Item().Background("#F9FAFB").Border(1).BorderColor("#E4E7EC").Padding(5)
                .Text("Comprobante generado por R&R Importaciones.")
                .FontSize(6.4f).FontColor("#6B717F");
        });
    }

    private static void ComposeInfoGrid(IContainer container, string marca, string modelo, int? anno, string vinUltimos, decimal totalRequerido, string moneda, string tipoCambio)
    {
        container.Border(1).BorderColor("#E4E7EC").Padding(7).Column(column =>
        {
            column.Item().Text("Datos del tramite").Bold().FontSize(8).FontColor("#0D1017");
            column.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn();
                    cols.RelativeColumn();
                    cols.RelativeColumn();
                });
                InfoCell(table, "Marca", marca);
                InfoCell(table, "Modelo", modelo);
                InfoCell(table, "Ano", anno?.ToString() ?? "N/D");
                InfoCell(table, "VIN ultimos 6", vinUltimos);
                InfoCell(table, "Costo total", Money(totalRequerido, "MXN"));
                InfoCell(table, "Moneda", moneda);
                InfoCell(table, "Tipo de cambio", tipoCambio);
            });
        });
    }

    private static void ComposePaymentTable(IContainer container, Pago pago)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.RelativeColumn();
                cols.RelativeColumn();
                cols.RelativeColumn();
                cols.RelativeColumn();
            });

            Header(table, "Fecha de pago");
            Header(table, "Importe");
            Header(table, "Moneda");
            Header(table, "Tipo de cambio");
            Cell(table, pago.FechaPago.ToString("dd/MM/yyyy"));
            Cell(table, Money(pago.Monto, pago.Moneda));
            Cell(table, pago.Moneda);
            Cell(table, FormatTipoCambio(pago));
        });
    }

    private static void ComposeTotals(IContainer container, decimal totalRequerido, decimal totalPagado, decimal resto)
    {
        container.Row(row =>
        {
            TotalBox(row, "Costo total", totalRequerido);
            TotalBox(row, "Total pagado", totalPagado);
            TotalBox(row, "Resto a pagar", resto, true);
        });
    }

    private static void ComposeSignatures(IContainer container)
    {
        container.Row(row =>
        {
            Signature(row, "De conformidad");
            row.ConstantItem(24);
            Signature(row, "Recibido");
        });
    }

    private static void InfoCell(TableDescriptor table, string label, string value)
    {
        table.Cell().PaddingBottom(7).Column(column =>
        {
            column.Item().Text(label).FontSize(6).FontColor("#8B93A1");
            column.Item().Text(value).Bold().FontSize(7.4f).FontColor("#0D1017");
        });
    }

    private static void Header(TableDescriptor table, string text)
    {
        table.Cell().Background("#ECEFF3").Border(1).BorderColor("#D7DCE4").Padding(3).Text(text).Bold().FontSize(6.2f);
    }

    private static void Cell(TableDescriptor table, string text)
    {
        table.Cell().Border(1).BorderColor("#E4E7EC").Padding(4).Text(text).FontSize(6.8f);
    }

    private static void TotalBox(RowDescriptor row, string label, decimal value, bool accent = false)
    {
        row.RelativeItem().PaddingRight(5).Background(accent ? "#0D1017" : "#F9FAFB").Border(1).BorderColor(accent ? "#0D1017" : "#E4E7EC").Padding(6).Column(column =>
        {
            column.Item().Text(label).FontSize(6).FontColor(accent ? Colors.White : "#8B93A1");
            column.Item().Text(Money(value, "MXN")).Bold().FontSize(9).FontColor(accent ? Colors.White : "#0D1017");
        });
    }

    private static void Signature(RowDescriptor row, string label)
    {
        row.RelativeItem().Height(42).AlignBottom().Column(column =>
        {
            column.Item().LineHorizontal(1).LineColor("#0D1017");
            column.Item().PaddingTop(3).AlignCenter().Text(label).Bold().FontSize(7).FontColor("#0D1017");
            column.Item().AlignCenter().Text("NOMBRE Y FIRMA").FontSize(5.8f).FontColor("#6B717F");
        });
    }

    private static void ComposeFooter(IContainer container, Pago pago)
    {
        container.BorderTop(1).BorderColor("#E4E7EC").PaddingTop(4)
            .Text($"{pago.FolioRecibo} | {pago.Tramite.NumeroConsecutivo}")
            .FontSize(5.8f).FontColor("#6B717F");
    }

    private async Task<decimal> GetTotalRequeridoMxnAsync(Guid tramiteId)
    {
        var tramite = await _db.Tramites.FindAsync(tramiteId)
            ?? throw new KeyNotFoundException("Tramite no encontrado");
        var cobrosAdicionales = await _db.Pedimentos.Where(p => p.TramiteId == tramiteId).SumAsync(p => p.CobroAdicional);
        var gastosCargables = await _db.GastosHormiga
            .Where(g => g.TramiteId == tramiteId && g.SeCargaAlCliente)
            .ToListAsync();

        return tramite.CobroTotal + tramite.CargoExpress + cobrosAdicionales + gastosCargables.Sum(ConvertGastoToMxn);
    }

    private string GetReceiptStoragePath()
    {
        var backendRoot = Directory.GetParent(_environment.ContentRootPath)?.FullName ?? _environment.ContentRootPath;
        return Path.Combine(backendRoot, "storage", "public", "pagos", "recibos");
    }

    private string ResolveStoragePath(string url)
    {
        var backendRoot = Directory.GetParent(_environment.ContentRootPath)?.FullName ?? _environment.ContentRootPath;
        var relative = url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        if (relative.StartsWith($"storage{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase))
            relative = relative["storage".Length..].TrimStart(Path.DirectorySeparatorChar);
        return Path.Combine(backendRoot, "storage", relative);
    }

    private static decimal ConvertPagoToMxn(Pago pago)
    {
        return pago.Moneda == "USD" ? pago.Monto * (pago.TipoCambio ?? 0m) : pago.Monto;
    }

    private static decimal ConvertGastoToMxn(GastoHormiga gasto)
    {
        return gasto.Moneda == "USD" ? gasto.Monto * (gasto.GastoUsd ?? 0m) : gasto.Monto;
    }

    private static string Money(decimal value, string currency) => currency == "USD" ? $"{value:N2} USD" : string.Format("{0:C2}", value);

    private static string FormatTipoCambio(Pago pago)
    {
        return pago.Moneda == "USD" ? (pago.TipoCambio ?? 0m).ToString("N5") : "1.00000";
    }

    private static string BuildFolioRecibo(Pago pago)
    {
        return $"REC-{pago.FechaRegistro:yyyyMM}-{pago.Id.ToString("N")[..6].ToUpperInvariant()}";
    }

    private string? ResolveLogoPath()
    {
        var cwd = Directory.GetCurrentDirectory();
        var baseDir = AppContext.BaseDirectory;
        var contentRoot = _environment.ContentRootPath;
        var candidates = new[]
        {
            Path.Combine(contentRoot, "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(cwd, "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(cwd, "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(baseDir, "..", "..", "..", "..", "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(baseDir, "..", "..", "..", "..", "..", "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
        };

        return candidates.Select(Path.GetFullPath).FirstOrDefault(File.Exists);
    }
}
