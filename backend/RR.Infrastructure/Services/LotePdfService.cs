using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class LotePdfService : ILotePdfService
{
    private readonly AppDbContext _db;

    public LotePdfService(AppDbContext db)
    {
        _db = db;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> GeneratePdfAsync(Guid loteId)
    {
        var lote = await _db.LotesImportacion
            .Include(x => x.Cliente)
            .Include(x => x.Tenant)
            .Include(x => x.Aduana)
            .Include(x => x.Tramitador)
            .Include(x => x.Tramites).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(x => x.Tramites).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(x => x.Tramites).ThenInclude(t => t.Pagos)
            .Include(x => x.Tramites).ThenInclude(t => t.Pedimentos)
            .Include(x => x.Tramites).ThenInclude(t => t.GastosHormiga)
            .FirstOrDefaultAsync(x => x.Id == loteId)
            ?? throw new KeyNotFoundException("Lote no encontrado");

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(34);
                page.DefaultTextStyle(x => x.FontSize(8.5f).FontFamily("Arial").FontColor(Colors.Grey.Darken4));

                page.Header().Element(x => ComposeHeader(x, lote));
                page.Content().Element(x => ComposeContent(x, lote));
                page.Footer().Element(x => ComposeFooter(x, lote));
            });
        }).GeneratePdf();
    }

    private static void ComposeHeader(IContainer container, LoteImportacion lote)
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
                    info.Item().AlignRight().Text($"RFC: {lote.Tenant.Rfc ?? "N/D"}").FontSize(8);
                    info.Item().AlignRight().Text("ricardordz@importadoraryr.com").FontSize(8);
                    info.Item().AlignRight().Text("(867) 722 1596").FontSize(8);
                    info.Item().AlignRight().Text("Dr Mier 6909, Nuevo Laredo, Mexico, 88120").FontSize(7.5f);
                });
            });

            column.Item().PaddingTop(10).LineHorizontal(1.5f).LineColor("#C61D26");
        });
    }

    private static void ComposeContent(IContainer container, LoteImportacion lote)
    {
        container.PaddingTop(12).Column(column =>
        {
            column.Spacing(10);
            column.Item().AlignCenter().Text($"LOTE N° {lote.FolioLote}")
                .Bold().FontSize(16).FontColor("#0D1017");

            column.Item().Row(row =>
            {
                row.RelativeItem().Text($"Fecha de emision: {lote.FechaCreacion:dd/MM/yyyy}");
                row.RelativeItem().AlignRight().Text($"Vehiculos: {lote.Tramites.Count}");
            });

            column.Item().Element(x => ComposeCliente(x, lote));
            column.Item().Element(x => ComposeTablaVehiculos(x, lote));
            column.Item().Element(x => ComposeTotal(x, lote));
            column.Item().Element(x => ComposeDisclaimer(x, lote));
        });
    }

    private static void ComposeCliente(IContainer container, LoteImportacion lote)
    {
        container.Border(1).BorderColor("#E4E7EC").Padding(9).Column(column =>
        {
            column.Item().Text("Cliente").Bold().FontSize(11).FontColor("#0D1017");
            if (lote.Cliente is null)
            {
                column.Item().Text("Sin cliente vinculado").FontColor(Colors.Grey.Darken1);
                return;
            }

            column.Item().Text(lote.Cliente.NombreCompleto ?? lote.Cliente.Nombre ?? lote.Cliente.Apodo).SemiBold();
            if (!string.IsNullOrWhiteSpace(lote.Cliente.Email))
                column.Item().Text(lote.Cliente.Email);
            if (!string.IsNullOrWhiteSpace(lote.Cliente.Telefono))
                column.Item().Text(lote.Cliente.Telefono);
        });
    }

    private static void ComposeTablaVehiculos(IContainer container, LoteImportacion lote)
    {
        container.PaddingTop(10).Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(30); // #
                cols.ConstantColumn(120); // VIN
                cols.RelativeColumn(); // Descripcion
                cols.ConstantColumn(70); // Honorarios
                cols.ConstantColumn(70); // Cobro Aduana
                cols.ConstantColumn(75); // Subtotal
            });

            table.Header(header =>
            {
                header.Cell().Element(HeaderCell).Text("#");
                header.Cell().Element(HeaderCell).Text("VIN");
                header.Cell().Element(HeaderCell).Text("Vehiculo");
                header.Cell().Element(HeaderCell).AlignRight().Text("Honorarios");
                header.Cell().Element(HeaderCell).AlignRight().Text("Aduana");
                header.Cell().Element(HeaderCell).AlignRight().Text("Subtotal");

                static IContainer HeaderCell(IContainer c) => c.BorderBottom(1).BorderColor("#C61D26").PaddingBottom(5);
            });

            int index = 1;
            foreach (var t in lote.Tramites.OrderBy(x => x.NumeroConsecutivo))
            {
                var cobroAduana = t.CobroTotal + t.CargoExpress;
                var total = t.Honorarios + cobroAduana;
                
                var marcaModelo = t.Vehiculo != null ? $"{t.Vehiculo.Marca?.Nombre} {t.Vehiculo.Modelo?.Nombre} {t.Vehiculo.Anno}" : t.DescripcionMercancia;

                table.Cell().Element(Cell).Text(index.ToString());
                table.Cell().Element(Cell).Text(t.Vehiculo?.VinCorto ?? t.Vehiculo?.Vin ?? "Sin VIN");
                table.Cell().Element(Cell).Text(marcaModelo ?? "Vehiculo");
                table.Cell().Element(Cell).AlignRight().Text(Money(t.Honorarios));
                table.Cell().Element(Cell).AlignRight().Text(Money(cobroAduana));
                table.Cell().Element(Cell).AlignRight().Text(Money(total)).SemiBold();

                index++;
            }
        });

        static IContainer Cell(IContainer c) => c.BorderBottom(1).BorderColor("#EEF1F5").PaddingVertical(6);
    }

    private static void ComposeTotal(IContainer container, LoteImportacion lote)
    {
        var totalHonorarios = lote.Tramites.Sum(t => t.Honorarios);
        var totalAduana = lote.Tramites.Sum(t => t.CobroTotal + t.CargoExpress);
        var granTotal = totalHonorarios + totalAduana;

        container.PaddingTop(15).Column(column =>
        {
            column.Item().AlignRight().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(120);
                    cols.ConstantColumn(80);
                });

                Row(table, "Total Honorarios", Money(totalHonorarios));
                Row(table, "Total Aduana", Money(totalAduana));
            });

            column.Item().PaddingTop(8).Background("#0D1017").Padding(10).Row(row =>
            {
                row.RelativeItem().Text("TOTAL LOTE").Bold().FontSize(14).FontColor(Colors.White);
                row.RelativeItem().AlignRight().Text(Money(granTotal)).Bold().FontSize(16).FontColor(Colors.White);
            });
        });
    }

    private static void ComposeDisclaimer(IContainer container, LoteImportacion lote)
    {
        var texto = "Este documento ampara los costos totales de los vehiculos enlistados en el lote de importacion actual. Los montos expresados son en Moneda Nacional (MXN).";
        container.PaddingTop(15).Background("#FFF7ED").Border(1).BorderColor("#FDBA74").Padding(8).Text(texto).FontSize(7.2f).LineHeight(1.12f);
    }

    private static void ComposeFooter(IContainer container, LoteImportacion lote)
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

    private static void Row(TableDescriptor table, string label, string value)
    {
        table.Cell().PaddingVertical(3).Text(label).FontSize(9).SemiBold();
        table.Cell().PaddingVertical(3).AlignRight().Text(value).FontSize(9).SemiBold();
    }

    private static string Money(decimal value) => string.Format("{0:C2}", value);

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
