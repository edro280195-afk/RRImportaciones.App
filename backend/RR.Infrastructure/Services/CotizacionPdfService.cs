using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class CotizacionPdfService : ICotizacionPdfService
{
    private readonly AppDbContext _db;

    public CotizacionPdfService(AppDbContext db)
    {
        _db = db;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> GeneratePdfAsync(Guid cotizacionId)
    {
        var cotizacion = await _db.Cotizaciones
            .Include(x => x.Cliente)
            .Include(x => x.Tenant)
            .FirstOrDefaultAsync(x => x.Id == cotizacionId)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada");

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(34);
                page.DefaultTextStyle(x => x.FontSize(8.5f).FontFamily("Arial").FontColor(Colors.Grey.Darken4));

                page.Header().Element(x => ComposeHeader(x, cotizacion));
                page.Content().Element(x => ComposeContent(x, cotizacion));
                page.Footer().Element(x => ComposeFooter(x, cotizacion));
            });
        }).GeneratePdf();
    }

    private static void ComposeHeader(IContainer container, Cotizacion cotizacion)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                row.RelativeItem().Height(62).Element(x =>
                {
                    var logo = ResolveLogoPath();
                    if (logo is not null)
                        x.AlignLeft().Image(logo).FitHeight();
                    else
                        x.AlignMiddle().Text("R&R IMPORTACIONES").Bold().FontSize(16).FontColor("#C61D26");
                });

                row.RelativeItem().AlignRight().Column(info =>
                {
                    info.Item().AlignRight().Text("R&R Importaciones").Bold().FontSize(10);
                    info.Item().AlignRight().Text($"RFC: {cotizacion.Tenant.Rfc ?? "N/D"}").FontSize(8);
                    info.Item().AlignRight().Text("ricardordz@importadoraryr.com").FontSize(8);
                    info.Item().AlignRight().Text("(867) 722 1596").FontSize(8);
                    info.Item().AlignRight().Text("Dr Mier 6909, Nuevo Laredo, Mexico, 88120").FontSize(7.5f);
                });
            });

            column.Item().PaddingTop(10).LineHorizontal(1.5f).LineColor("#C61D26");
        });
    }

    private static void ComposeContent(IContainer container, Cotizacion c)
    {
        container.PaddingTop(12).Column(column =>
        {
            column.Spacing(10);
            column.Item().AlignCenter().Text($"COTIZACION N° {c.Folio ?? c.Id.ToString("N")[..8].ToUpperInvariant()}")
                .Bold().FontSize(16).FontColor("#0D1017");

            column.Item().Row(row =>
            {
                row.RelativeItem().Text($"Fecha de emision: {c.FechaCreacion:dd/MM/yyyy}");
                row.RelativeItem().AlignRight().Text($"Vence: {(c.FechaExpiracion ?? DateTime.UtcNow.Date.AddDays(7)):dd/MM/yyyy}");
            });

            column.Item().Element(x => ComposeCliente(x, c));
            column.Item().Element(x => ComposeVehiculo(x, c));
            column.Item().Element(x => ComposeDesglose(x, c));
            column.Item().Element(x => ComposeDisclaimer(x, c));
        });
    }

    private static void ComposeCliente(IContainer container, Cotizacion c)
    {
        container.Border(1).BorderColor("#E4E7EC").Padding(9).Column(column =>
        {
            column.Item().Text("Cliente").Bold().FontSize(11).FontColor("#0D1017");
            if (c.Cliente is null)
            {
                column.Item().Text("Sin cliente vinculado").FontColor(Colors.Grey.Darken1);
                return;
            }

            column.Item().Text(c.Cliente.NombreCompleto ?? c.Cliente.Nombre ?? c.Cliente.Apodo).SemiBold();
            if (!string.IsNullOrWhiteSpace(c.Cliente.Email))
                column.Item().Text(c.Cliente.Email);
            if (!string.IsNullOrWhiteSpace(c.Cliente.Telefono))
                column.Item().Text(c.Cliente.Telefono);
        });
    }

    private static void ComposeVehiculo(IContainer container, Cotizacion c)
    {
        container.Border(1).BorderColor("#E4E7EC").Padding(9).Column(column =>
        {
            column.Item().Text("Datos del vehiculo").Bold().FontSize(11).FontColor("#0D1017");
            column.Item().PaddingTop(6).Text($"{c.MarcaTexto} {c.Modelo} {c.AnnoModelo}".Trim())
                .Bold().FontSize(14).FontColor("#0D1017");
            column.Item().Text($"VIN: {c.Vin ?? "Sin VIN"}").FontFamily("Courier New").FontSize(10);
            column.Item().Text($"Categoria: {c.Categoria ?? "N/D"}   Fraccion: {c.Fraccion ?? "N/D"}   Regimen: {c.RegimenFiscal ?? "N/D"}");
            column.Item().Text($"Fuente precio: {c.FuentePrecio ?? "N/D"} / {c.PrecioCatalogoMarca ?? c.MarcaTexto} / {c.PrecioCatalogoModelo ?? "Sin modelo catalogo"}").FontSize(8);
        });
    }

    private static void ComposeDesglose(IContainer container, Cotizacion c)
    {
        var tcAplicado = c.TipoCambioAplicado ?? 0m;

        container.Column(column =>
        {
            column.Item().Text("Desglose del calculo").Bold().FontSize(12).FontColor("#0D1017");
            column.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn();
                    cols.ConstantColumn(180);
                });

                Row(table, "Valor en aduana (USD)", MoneyUsd(c.ValorAduanaUsd ?? 0m));
                Row(table, "Tipo de cambio aplicado", $"{tcAplicado:N4}");
                Row(table, "Valor en pesos", Money(c.ValorPesos ?? 0m));
                Row(table, $"IGI ({(c.IgiPorcentaje ?? 0m) * 100m:N2}%)", Money(c.Igi ?? 0m));
                Row(table, "DTA", Money(c.Dta ?? 0m));
                if ((c.Prev ?? 0m) != 0m)
                    Row(table, "Prev", Money(c.Prev ?? 0m));
                Row(table, "IVA", Money(c.Iva ?? 0m));
                if ((c.Prv ?? 0m) != 0m)
                    Row(table, "Prv", Money(c.Prv ?? 0m));
                Row(table, "Subtotal impuestos", Money(c.TotalContribuciones ?? 0m), true);
                Row(table, "Honorarios", Money(c.TotalHonorarios ?? 0m));
                if ((c.CargoExpress ?? 0m) > 0m)
                    Row(table, "Cargo express", Money(c.CargoExpress ?? 0m));
            });

            column.Item().PaddingTop(8).Background("#0D1017").Padding(10).Row(row =>
            {
                row.RelativeItem().Text("TOTAL").Bold().FontSize(14).FontColor(Colors.White);
                row.RelativeItem().AlignRight().Text(Money(c.TotalGeneral ?? 0m)).Bold().FontSize(16).FontColor(Colors.White);
            });
        });
    }

    private static void ComposeDisclaimer(IContainer container, Cotizacion c)
    {
        var refTc = c.TipoCambioReferencia ?? 0m;
        var fechaVence = c.FechaExpiracion ?? DateTime.UtcNow.Date.AddDays(7);
        var texto =
            $"Esta cotizacion es valida unicamente al tipo de cambio de referencia de {refTc:N4} pesos por dolar, vigente al dia {c.FechaCreacion:dd/MM/yyyy}. " +
            $"El monto final puede variar conforme al tipo de cambio vigente al momento de realizar el pago. Esta cotizacion tiene validez de 7 dias naturales y vence el {fechaVence:dd/MM/yyyy}. " +
            "Los precios estimados estan basados en el Anexo 2 de la Resolucion de Precios Estimados publicada por la Secretaria de Hacienda y Credito Publico.";

        container.Background("#FFF7ED").Border(1).BorderColor("#FDBA74").Padding(8).Text(texto).FontSize(7.2f).LineHeight(1.12f);
    }

    private static void ComposeFooter(IContainer container, Cotizacion c)
    {
        container.BorderTop(1).BorderColor("#E4E7EC").PaddingTop(8).Row(row =>
        {
            row.RelativeItem().Text("R&R Importaciones | ricardordz@importadoraryr.com | (867) 722 1596 | Dr Mier 6909, Nuevo Laredo, Mexico, 88120").FontSize(6.8f).FontColor(Colors.Grey.Darken1);
            row.ConstantItem(90).AlignRight().Text(text =>
            {
                text.DefaultTextStyle(x => x.FontSize(8).FontColor(Colors.Grey.Darken1));
                text.Span("Pagina ");
                text.CurrentPageNumber();
                text.Span(" de ");
                text.TotalPages();
            });
        });
    }

    private static void Row(TableDescriptor table, string label, string value, bool bold = false)
    {
        static IContainer Cell(IContainer c) => c.BorderBottom(1).BorderColor("#EEF1F5").PaddingVertical(4);

        table.Cell().Element(Cell).Text(label).FontSize(8.5f).SemiBold();
        var valueText = table.Cell().Element(Cell).AlignRight().Text(value).FontSize(8.5f);
        if (bold)
            valueText.SemiBold();
    }

    private static string Money(decimal value) => string.Format("{0:C2}", value);
    private static string MoneyUsd(decimal value) => string.Format("{0:N2} USD", value);

    private static string? ResolveLogoPath()
    {
        var cwd = Directory.GetCurrentDirectory();
        var baseDir = AppContext.BaseDirectory;
        var candidates = new[]
        {
            Path.Combine(cwd, "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(cwd, "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(cwd, "..", "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(baseDir, "..", "..", "..", "..", "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
            Path.Combine(baseDir, "..", "..", "..", "..", "..", "..", "frontend", "public", "assets", "imagenes", "rr_logo.png"),
        };

        return candidates.Select(Path.GetFullPath).FirstOrDefault(File.Exists);
    }
}
