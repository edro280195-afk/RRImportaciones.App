using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Importador;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;
using RR.Domain.Entities;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

if (args.Length == 0)
{
    PrintUsage();
    return 1;
}

var command = args[0].Trim().ToLowerInvariant();

if (command == "import-tramites")
{
    return await ImportTramitesAsync(args);
}

if (command == "import-tabuladores")
{
    return await ImportTabuladoresAsync(args);
}

if (command == "import-anexo2")
{
    return await ImportAnexo2Async(args);
}

PrintUsage();
return 1;

static async Task<int> ImportTramitesAsync(string[] args)
{
    var file = ReadArg(args, "--file");
    var tenantText = ReadArg(args, "--tenant");
    var dryRun = args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase);

    if (string.IsNullOrWhiteSpace(file) || string.IsNullOrWhiteSpace(tenantText) || !Guid.TryParse(tenantText, out var tenantId))
    {
        Console.WriteLine("Faltan argumentos obligatorios: --file y --tenant");
        return 1;
    }

    var connectionString = GetConnectionString(args);
    var tenantContext = new TenantContext();
    tenantContext.SetTenant(tenantId);
    var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options;

    await using var db = new AppDbContext(options, tenantContext);
    var importer = new DataImportService(db, tenantContext);

    try
    {
        var result = await importer.ImportTramitesAsync(new ImportTramitesRequest
        {
            FilePath = file,
            TenantId = tenantId,
            DryRun = dryRun,
        });

        Console.WriteLine($"Detectados: {result.RegistrosDetectados}");
        Console.WriteLine($"Insertados: {result.Insertados}");
        Console.WriteLine($"Saltados: {result.Saltados}");
        Console.WriteLine($"Rechazados: {result.Rechazados}");
        Console.WriteLine($"Log: {result.LogPath}");

        foreach (var warning in result.Warnings)
            Console.WriteLine($"WARNING: {warning}");
        foreach (var error in result.Errores)
            Console.WriteLine($"ERROR: {error}");

        return result.Errores.Count == 0 ? 0 : 2;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR: {ex.Message}");
        return 1;
    }
}

static async Task<int> ImportTabuladoresAsync(string[] args)
{
    var file = ReadArg(args, "--file");
    if (string.IsNullOrWhiteSpace(file) || !File.Exists(file))
    {
        Console.WriteLine("Falta archivo válido: --file \"ruta/al/TABULADOR_2026.xlsx\"");
        return 1;
    }

    var tenantContext = new TenantContext();
    var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(GetConnectionString(args)).Options;
    await using var db = new AppDbContext(options, tenantContext);

    using var workbook = new XLWorkbook(file);

    var oldPrices = await db.PreciosEstimados.Include(x => x.PreciosPorAntiguedad).ToListAsync();
    db.PreciosPorAntiguedad.RemoveRange(oldPrices.SelectMany(x => x.PreciosPorAntiguedad));
    db.PreciosEstimados.RemoveRange(oldPrices);
    db.TabuladoresAmparo.RemoveRange(await db.TabuladoresAmparo.ToListAsync());
    await db.SaveChangesAsync();

    var insertedModels = 0;
    var insertedPrices = 0;
    var insertedAmparo = 0;

    foreach (var ws in workbook.Worksheets)
    {
        var info = SheetInfo.FromName(ws.Name);
        if (info is null && !ws.Name.Equals("AMPARO", StringComparison.OrdinalIgnoreCase))
            continue;

        if (ws.Name.Equals("AMPARO", StringComparison.OrdinalIgnoreCase))
        {
            insertedAmparo += await ImportAmparoAsync(db, ws);
            continue;
        }

        var result = await ImportPriceSheetAsync(db, ws, info!);
        insertedModels += result.Models;
        insertedPrices += result.Prices;
    }

    await db.SaveChangesAsync();
    Console.WriteLine($"Modelos importados: {insertedModels}");
    Console.WriteLine($"Precios por antigüedad importados: {insertedPrices}");
    Console.WriteLine($"Entradas amparo importadas: {insertedAmparo}");
    Console.WriteLine($"Modelos en BD: {await db.PreciosEstimados.CountAsync()}");
    Console.WriteLine($"Precios por antigüedad en BD: {await db.PreciosPorAntiguedad.CountAsync()}");
    return 0;
}

static async Task<int> ImportAnexo2Async(string[] args)
{
    var file = ReadArg(args, "--file");
    var genericsOnly = args.Contains("--generics-only", StringComparer.OrdinalIgnoreCase);
    if (string.IsNullOrWhiteSpace(file) || !File.Exists(file))
    {
        Console.WriteLine("Falta archivo válido: --file \"ruta/al/anexo2_catalogo.pdf\"");
        return 1;
    }

    var tenantContext = new TenantContext();
    var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(GetConnectionString(args)).Options;
    await using var db = new AppDbContext(options, tenantContext);

    if (!genericsOnly)
    {
        var oldPrices = await db.PreciosEstimados.Include(x => x.PreciosPorAntiguedad).ToListAsync();
        db.PreciosPorAntiguedad.RemoveRange(oldPrices.SelectMany(x => x.PreciosPorAntiguedad));
        db.PreciosEstimados.RemoveRange(oldPrices);
        await db.SaveChangesAsync();
        Console.WriteLine("Modo completo: datos existentes eliminados.");
    }
    else
    {
        Console.WriteLine("Modo solo-genéricos: no se borrarán datos existentes.");
    }

    var knownBrands = await LoadKnownBrandsAsync(db);
    var marcaCache = await LoadMarcaCacheAsync(db);
    var insertedModels = 0;
    var insertedPrices = 0;
    var skippedRows = 0;
    var currentFraccion = "";
    var currentCategoria = "";
    var currentInciso = (string?)null;
    var currentBrand = "";

    using var document = PdfDocument.Open(file);
    for (var pageNumber = 1; pageNumber <= document.NumberOfPages; pageNumber++)
    {
        var page = document.GetPage(pageNumber);
        var lines = BuildPdfLines(page, knownBrands);

        foreach (var line in lines)
        {
            var fraccionInLine = line.Words.Select(x => x.Text).FirstOrDefault(IsFraccion);
            if (!string.IsNullOrWhiteSpace(fraccionInLine))
            {
                currentFraccion = fraccionInLine;
                currentCategoria = CategoriaFromFraccion(currentFraccion);
                currentInciso = null;
            }

            var upperLine = NormalizeForSearch(PdfLineText(line));
            if (upperLine.Contains("AAUTOMOVILES") || upperLine.Contains("AUTOMOVILES"))
            {
                currentCategoria = "AUTOMOVIL";
                currentInciso = "A";
            }
            else if (upperLine.Contains("BCAMIONETAS") || upperLine.Contains("CAMIONETAS"))
            {
                currentCategoria = "CAMIONETA";
                currentInciso = "B";
            }
            else if (upperLine.Contains("PICKUP") || upperLine.Contains("PICKUPS") || upperLine.Contains("PICKUP'S"))
            {
                currentCategoria = "PICKUP";
                currentInciso = null;
            }

            var brandCandidate = GetBrandCandidate(line);
            if (!string.IsNullOrWhiteSpace(brandCandidate) && knownBrands.Contains(Normalize(brandCandidate)))
            {
                currentBrand = brandCandidate;
            }

            if (!line.Words.Any(x => x.Text.Equals("Pza", StringComparison.OrdinalIgnoreCase)))
                continue;

            if (string.IsNullOrWhiteSpace(currentFraccion))
            {
                skippedRows++;
                continue;
            }

            var isGeneric = IsGenericPriceLine(line);

            if (genericsOnly && !isGeneric)
                continue;

            var modelText = isGeneric
                ? GenericModelText(currentInciso)
                : ExtractPdfModelText(line);

            if (string.IsNullOrWhiteSpace(modelText))
            {
                skippedRows++;
                continue;
            }

            var prices = ExtractPdfPrices(line);
            if (prices.Count == 0)
            {
                skippedRows++;
                continue;
            }

            var brandText = isGeneric ? "GENERICO" : currentBrand;
            var marca = isGeneric || string.IsNullOrWhiteSpace(brandText) ? null : GetOrCreateMarcaCached(db, marcaCache, brandText);
            var categoria = string.IsNullOrWhiteSpace(currentCategoria) ? CategoriaFromFraccion(currentFraccion) : currentCategoria;
            var fraccion = await GetOrCreateFraccionAsync(db, currentFraccion, categoria);

            var precio = new PrecioEstimado
            {
                Id = Guid.NewGuid(),
                FraccionId = fraccion.Id,
                MarcaId = marca?.Id,
                Categoria = categoria,
                Inciso = currentInciso,
                MarcaTexto = string.IsNullOrWhiteSpace(brandText) ? string.Empty : CleanText(brandText),
                Modelo = CleanText(modelText),
                EsGenerico = isGeneric,
                HojaOrigen = $"ANEXO2 PDF p{pageNumber}",
            };

            foreach (var price in prices)
            {
                precio.PreciosPorAntiguedad.Add(new PrecioPorAntiguedad
                {
                    Id = Guid.NewGuid(),
                    AntiguedadAnios = price.Age,
                    PrecioUsd = price.Value,
                });
                insertedPrices++;
            }

            db.PreciosEstimados.Add(precio);
            insertedModels++;
        }

        if (pageNumber % 10 == 0)
        {
            await db.SaveChangesAsync();
            Console.WriteLine($"Páginas procesadas: {pageNumber}/{document.NumberOfPages}");
        }
    }

    await db.SaveChangesAsync();
    Console.WriteLine($"Modelos importados desde Anexo 2: {insertedModels}");
    Console.WriteLine($"Precios por antigüedad importados: {insertedPrices}");
    Console.WriteLine($"Filas omitidas: {skippedRows}");
    Console.WriteLine($"Modelos en BD: {await db.PreciosEstimados.CountAsync()}");
    Console.WriteLine($"Precios por antigüedad en BD: {await db.PreciosPorAntiguedad.CountAsync()}");
    return 0;
}

static async Task<(int Models, int Prices)> ImportPriceSheetAsync(AppDbContext db, IXLWorksheet ws, SheetInfo info)
{
    var fraccion = await GetOrCreateFraccionAsync(db, info.Fraccion, info.Categoria);
    var headerRow = FindHeaderRow(ws);
    var ageColumns = BuildAgeColumns(ws, headerRow);
    var currentBrand = "";
    var models = 0;
    var prices = 0;

    var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
    for (var r = headerRow + 1; r <= lastRow; r++)
    {
        var name = CellText(ws, r, 3);
        if (string.IsNullOrWhiteSpace(name))
            continue;

        var rowPrices = ageColumns
            .Select(c => new { c.Age, Value = ParseMoney(CellText(ws, r, c.Column)) })
            .Where(x => x.Value.HasValue)
            .ToList();

        if (rowPrices.Count == 0)
        {
            currentBrand = CleanText(name);
            continue;
        }

        var isGeneric = name.Contains("PRECIOS ESTIMADOS APLICABLES", StringComparison.OrdinalIgnoreCase);
        var brand = isGeneric ? "GENERICO" : currentBrand;
        var marca = isGeneric || string.IsNullOrWhiteSpace(brand) ? null : await GetOrCreateMarcaAsync(db, brand);

        var precio = new PrecioEstimado
        {
            Id = Guid.NewGuid(),
            FraccionId = fraccion.Id,
            MarcaId = marca?.Id,
            Categoria = info.Categoria,
            Inciso = info.Inciso,
            MarcaTexto = brand,
            Modelo = CleanText(name),
            EsGenerico = isGeneric,
            HojaOrigen = ws.Name,
        };

        foreach (var item in rowPrices)
        {
            precio.PreciosPorAntiguedad.Add(new PrecioPorAntiguedad
            {
                Id = Guid.NewGuid(),
                AntiguedadAnios = item.Age,
                PrecioUsd = item.Value!.Value,
            });
            prices++;
        }

        db.PreciosEstimados.Add(precio);
        models++;
    }

    return (models, prices);
}

static async Task<int> ImportAmparoAsync(AppDbContext db, IXLWorksheet ws)
{
    var headerRow = 0;
    var yearColumn = 0;
    var lastColumn = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
    for (var r = 1; r <= (ws.LastRowUsed()?.RowNumber() ?? 0); r++)
    {
        for (var c = 1; c <= lastColumn; c++)
        {
            if (!CellText(ws, r, c).Equals("AÑO", StringComparison.OrdinalIgnoreCase))
                continue;

            headerRow = r;
            yearColumn = c;
            break;
        }

        if (headerRow > 0)
            break;
    }

    if (headerRow == 0)
    {
        headerRow = 48;
        yearColumn = 3;
    }

    var categories = new Dictionary<int, string>();
    for (var c = yearColumn + 1; c <= Math.Min(lastColumn, yearColumn + 5); c++)
    {
        var text = CellText(ws, headerRow, c).ToUpperInvariant();
        if (text.Contains("4 CIL")) categories[c] = "4_CIL";
        else if (text.Contains("6 CIL")) categories[c] = "6_CIL";
        else if (text.Contains("8 CIL")) categories[c] = "8_CIL";
        else if (text.Contains("PICK")) categories[c] = "PICKUP";
        else if (text.Contains("LUJO")) categories[c] = "LUJO";
    }

    var count = 0;
    var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
    for (var r = headerRow + 1; r <= lastRow; r++)
    {
        if (!int.TryParse(CellText(ws, r, yearColumn), out var year))
            continue;

        foreach (var pair in categories)
        {
            var price = ParseMoney(CellText(ws, r, pair.Key));
            if (!price.HasValue)
                continue;

            db.TabuladoresAmparo.Add(new TabuladorAmparo
            {
                Id = Guid.NewGuid(),
                AnnoModelo = year,
                Categoria = pair.Value,
                PrecioMxn = price.Value,
                Notas = ws.Name,
            });
            count++;
        }
    }

    await Task.CompletedTask;
    return count;
}

static int FindHeaderRow(IXLWorksheet ws)
{
    var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
    var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
    for (var r = 1; r <= lastRow; r++)
    {
        for (var c = 1; c <= lastCol; c++)
        {
            var text = CellText(ws, r, c).ToUpperInvariant();
            if (text.Contains("UNIDAD") || text.Contains("COMER-CIAL") || text.Contains("COMERCIAL"))
                return r;
        }
    }

    return 1;
}

// Columnas 5..13 del TABULADOR 2026 contienen edades en orden DESCENDENTE:
//   col 5 = "12 AÑOS O MAS", col 6 = "11 AÑOS", ..., col 13 = "4 AÑOS"
// Si el header está vacío (merge / fila desfasada) miramos la fila inmediata superior,
// donde suele estar el año modelo de referencia (ej. 2009, 2010, ... 2017).
// NUNCA inferimos por posición de columna — eso producía edades invertidas y caso 9→6.
static List<(int Column, int Age)> BuildAgeColumns(IXLWorksheet ws, int headerRow)
{
    var result = new List<(int Column, int Age)>();
    for (var c = 5; c <= 13; c++)
    {
        var text = CellText(ws, headerRow, c);
        var age = ParseAge(text);

        // Fallback seguro: la fila de arriba suele tener el año modelo (1900-2100).
        if (age == 0 && headerRow > 1)
        {
            var aboveText = CellText(ws, headerRow - 1, c);
            var aboveDigits = new string(aboveText.Where(char.IsDigit).ToArray());
            if (int.TryParse(aboveDigits, out var year) && year >= 1990 && year <= 2100)
                age = Math.Clamp(DateTime.Today.Year - year, 1, 20);
        }

        if (age > 0)
            result.Add((c, age));
        // Si no logramos resolver la edad, SE OMITE la columna. Mejor un dato faltante
        // que un dato mal etiquetado (que generaría errores silenciosos de $1,500 USD).
    }

    return result.GroupBy(x => x.Column).Select(g => g.First()).ToList();
}

static int ParseAge(string text)
{
    var digits = new string(text.Where(char.IsDigit).ToArray());
    if (!int.TryParse(digits, out var value))
        return 0;

    // Año modelo (ej. "2017") → calcular antigüedad
    if (value >= 1990 && value <= 2100)
        return Math.Clamp(DateTime.Today.Year - value, 1, 20);

    // Edad directa (ej. "12 AÑOS O MAS" → 12) — permitir hasta 20
    return Math.Clamp(value, 1, 20);
}

static async Task<FraccionArancelaria> GetOrCreateFraccionAsync(AppDbContext db, string fraccion, string categoria)
{
    var entity = await db.FraccionesArancelarias.FirstOrDefaultAsync(x => x.Fraccion == fraccion);
    if (entity is not null)
        return entity;

    entity = new FraccionArancelaria
    {
        Id = Guid.NewGuid(),
        Fraccion = fraccion,
        Descripcion = $"Tabulador {categoria}",
        TipoVehiculo = categoria,
        Activo = true,
    };
    db.FraccionesArancelarias.Add(entity);
    await db.SaveChangesAsync();
    return entity;
}

static async Task<Marca> GetOrCreateMarcaAsync(AppDbContext db, string name)
{
    var normalized = Normalize(name);
    var marcas = await db.Marcas.ToListAsync();
    var existing = marcas.FirstOrDefault(x => Normalize(x.Nombre) == normalized || x.Aliases.Any(a => Normalize(a) == normalized));
    if (existing is not null)
        return existing;

    var marca = new Marca { Id = Guid.NewGuid(), Nombre = CleanText(name).ToUpperInvariant(), Aliases = [CleanText(name).ToUpperInvariant()], Activo = true };
    db.Marcas.Add(marca);
    await db.SaveChangesAsync();
    return marca;
}

static async Task<Dictionary<string, Marca>> LoadMarcaCacheAsync(AppDbContext db)
{
    var result = new Dictionary<string, Marca>(StringComparer.OrdinalIgnoreCase);
    var marcas = await db.Marcas.ToListAsync();
    foreach (var marca in marcas)
    {
        AddMarcaCache(result, marca.Nombre, marca);
        foreach (var alias in marca.Aliases)
            AddMarcaCache(result, alias, marca);
    }

    return result;
}

static Marca GetOrCreateMarcaCached(AppDbContext db, Dictionary<string, Marca> cache, string name)
{
    var normalized = Normalize(name);
    if (cache.TryGetValue(normalized, out var existing))
        return existing;

    var clean = CleanText(name).ToUpperInvariant();
    var marca = new Marca
    {
        Id = Guid.NewGuid(),
        Nombre = clean,
        Aliases = [clean],
        Activo = true,
    };

    db.Marcas.Add(marca);
    AddMarcaCache(cache, clean, marca);
    return marca;
}

static void AddMarcaCache(Dictionary<string, Marca> cache, string? key, Marca marca)
{
    if (string.IsNullOrWhiteSpace(key))
        return;

    cache.TryAdd(Normalize(key), marca);
}

static decimal? ParseMoney(string text)
{
    if (string.IsNullOrWhiteSpace(text))
        return null;

    var clean = text.Replace("$", "").Replace(",", "").Trim();
    return decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var value) ? value : null;
}

static string CellText(IXLWorksheet ws, int row, int col)
{
    return ws.Cell(row, col).GetFormattedString().Trim();
}

static string CleanText(string text)
{
    return string.Join(" ", text.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));
}

static string Normalize(string value)
{
    return new string(value.Trim().ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());
}

static async Task<HashSet<string>> LoadKnownBrandsAsync(AppDbContext db)
{
    var brands = await db.Marcas.Select(x => new { x.Nombre, x.Aliases }).ToListAsync();
    var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var brand in brands)
    {
        AddBrand(result, brand.Nombre);
        foreach (var alias in brand.Aliases)
            AddBrand(result, alias);
    }

    foreach (var brand in new[]
    {
        "ACURA", "AUDI", "BMW", "BUICK", "CADILLAC", "CHEVROLET", "CHRYSLER", "DODGE", "FIAT", "FORD",
        "GMC", "HONDA", "HYUNDAI", "INFINITI", "ISUZU", "JEEP", "KIA", "LEXUS", "LINCOLN", "MAZDA",
        "MERCEDES BENZ", "MERCEDES-BENZ", "MINI", "MITSUBISHI", "NISSAN", "RAM", "SMART", "SUBARU",
        "TOYOTA", "VOLKSWAGEN", "VOLVO", "CATERPILLAR", "FREIGHTLINER", "INTERNATIONAL", "KENWORTH",
        "MACK", "PETERBILT", "STERLING", "AUTOCAR", "WESTERN STAR"
    })
    {
        AddBrand(result, brand);
    }

    return result;

    static void AddBrand(HashSet<string> set, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
            set.Add(Normalize(value));
    }
}

static List<PdfLine> BuildPdfLines(Page page, HashSet<string> knownBrands)
{
    var rawLines = page.GetWords()
        .GroupBy(w => Math.Round(w.BoundingBox.Bottom / 3.0) * 3.0)
        .Select(g => new PdfLine(
            g.Key,
            g.OrderBy(w => w.BoundingBox.Left).ToList()))
        .OrderByDescending(x => x.Y)
        .ToList();

    var rowLines = new List<PdfLine>();
    for (var index = 0; index < rawLines.Count; index++)
    {
        var line = rawLines[index];
        if (!line.Words.Any(w => w.Text.Equals("Pza", StringComparison.OrdinalIgnoreCase)))
        {
            rowLines.Add(line);
            continue;
        }

        var genericUpperLines = CollectGenericUpperLines(rawLines, index);
        var isGenericRow = genericUpperLines.Count > 0 || IsGenericLegalLine(line);
        var upper = !isGenericRow && index > 0 && IsDescriptionContinuation(rawLines[index - 1], knownBrands) ? rawLines[index - 1] : null;
        var lowerLines = new List<PdfLine>();
        for (var next = index + 1; !isGenericRow && next < rawLines.Count && lowerLines.Count < 4; next++)
        {
            if (!IsDescriptionContinuation(rawLines[next], knownBrands))
                break;
            lowerLines.Add(rawLines[next]);
        }

        var words = new List<Word>();
        foreach (var genericUpper in genericUpperLines)
            words.AddRange(genericUpper.Words);
        if (upper is not null)
            words.AddRange(upper.Words);
        words.AddRange(line.Words);
        foreach (var lower in lowerLines)
            words.AddRange(lower.Words);

        rowLines.Add(new PdfLine(line.Y, words.OrderBy(w => w.BoundingBox.Left).ThenByDescending(w => w.BoundingBox.Bottom).ToList()));
    }

    return rowLines;
}

static List<PdfLine> CollectGenericUpperLines(List<PdfLine> rawLines, int pzaLineIndex)
{
    var result = new List<PdfLine>();
    for (var previous = pzaLineIndex - 1; previous >= 0 && result.Count < 5; previous--)
    {
        var line = rawLines[previous];
        if (line.Words.Any(w => w.Text.Equals("Pza", StringComparison.OrdinalIgnoreCase)))
            break;

        if (!IsGenericLegalLine(line))
            break;

        result.Add(line);
    }

    result.Reverse();
    return result;
}

static bool IsGenericPriceLine(PdfLine line)
{
    return IsGenericLegalLine(line);
}

static bool IsGenericLegalLine(PdfLine line)
{
    var normalized = NormalizeForSearch(PdfLineText(line));
    return normalized.Contains("PRECIOSESTIMADOS") ||
           normalized.Contains("VEHICULOSENCUYOANOMODELO") ||
           (normalized.Contains("NOLISTADOS") && normalized.Contains("FRACCION"));
}

static string GenericModelText(string? inciso)
{
    var scope = string.IsNullOrWhiteSpace(inciso)
        ? "ESTA FRACCION ARANCELARIA"
        : $"EL INCISO {inciso} DE ESTA FRACCION ARANCELARIA";

    return $"PRECIOS ESTIMADOS APLICABLES A VEHICULOS EN CUYO ANO-MODELO NO SE ESTABLECE DICHO PRECIO, ASI COMO PARA OTROS MODELOS Y MARCAS DE VEHICULOS NO LISTADOS EN {scope}";
}

// Una línea cualifica como "continuación de la descripción del modelo" sólo si:
//   1. No contiene "Pza" (no es otra fila Pza)
//   2. Tiene palabras en x [140, 205] (zona de descripción)
//   3. No contiene precios en x ≥ 240 (la base bajó de 300 a 240 para capturar edades 11 y 12)
//   4. El texto consolidado NO es una marca conocida
//      (este es el fix clave del bug "CHEVROLET CRUZE-4 MERCEDES-BENZ CYL")
static bool IsDescriptionContinuation(PdfLine line, HashSet<string> knownBrands)
{
    if (line.Words.Any(w => w.Text.Equals("Pza", StringComparison.OrdinalIgnoreCase)))
        return false;

    if (IsGenericLegalLine(line))
        return false;

    var descriptionWords = line.Words
        .Where(w => w.BoundingBox.Left >= 140 && w.BoundingBox.Left <= 215)
        .Select(w => w.Text.Trim())
        .Where(w => !string.IsNullOrWhiteSpace(w))
        .ToList();

    if (descriptionWords.Count == 0)
        return false;

    var hasPriceWords = line.Words.Any(w => w.BoundingBox.Left >= 240 && ParseMoney(w.Text).HasValue);
    if (hasPriceWords)
        return false;

    // Si lo único que hay en esta línea es el nombre de una marca conocida (MERCEDES-BENZ, BUICK, etc.),
    // NO es continuación del modelo anterior — es el header de la siguiente marca.
    var combined = Normalize(string.Join("", descriptionWords));
    if (knownBrands.Contains(combined))
        return false;

    // También bloquear cuando es claramente una sola palabra que arranca con marca conocida
    if (descriptionWords.Count <= 2)
    {
        foreach (var brand in knownBrands)
        {
            if (brand.Length >= 3 && combined.StartsWith(brand, StringComparison.OrdinalIgnoreCase))
                return false;
        }
    }

    return true;
}

static string PdfLineText(PdfLine line)
{
    return CleanText(string.Join(" ", line.Words.OrderBy(w => w.BoundingBox.Left).ThenByDescending(w => w.BoundingBox.Bottom).Select(w => w.Text)));
}

static string? GetBrandCandidate(PdfLine line)
{
    if (line.Words.Any(w => w.Text.Equals("Pza", StringComparison.OrdinalIgnoreCase)))
        return null;

    var words = line.Words
        .Where(w => w.BoundingBox.Left >= 140 && w.BoundingBox.Left <= 205)
        .Select(w => w.Text.Trim())
        .Where(w => !string.IsNullOrWhiteSpace(w))
        .ToList();

    if (words.Count is 0 or > 3)
        return null;

    var text = CleanText(string.Join(" ", words));
    if (text.Any(char.IsDigit))
        return null;

    var normalized = NormalizeForSearch(text);
    if (normalized.Contains("CAB") || normalized.Contains("SERIES") || normalized.Contains("CLASS") || normalized.Contains("BBC"))
        return null;

    return text;
}

static string ExtractPdfModelText(PdfLine line)
{
    var words = line.Words
        .Where(w => w.BoundingBox.Left >= 140 && w.BoundingBox.Left < 215)
        .Select(w => w.Text.Trim())
        .Where(w => !string.IsNullOrWhiteSpace(w))
        .Where(w => !w.Equals("Pza", StringComparison.OrdinalIgnoreCase))
        .Where(w => !IsFraccion(w))
        .Where(w => !int.TryParse(w, NumberStyles.Integer, CultureInfo.InvariantCulture, out _))
        .ToList();

    var text = CleanText(string.Join(" ", words));
    return Regex.Replace(text, @"^\d+\s+", "", RegexOptions.CultureInvariant).Trim();
}

// Centros X de las 12 columnas de edad en el PDF Anexo 2 (medidos contra el archivo real).
// Las fracciones con 12 columnas son: 8703.22.02, 8703.23.02, 8703.24.02, varias 8704.23/31.
// Las fracciones con 10 columnas (sin 11 y 12 años) son: tractocamión, 8703.21/32/33/40/60, 8704.21/22/32.
// Mantener TODOS los centros: si el PDF de la fracción no incluye esa columna, simplemente no hay
// palabras de precio en ese rango X y no se genera registro espurio.
static List<(int Age, decimal Value)> ExtractPdfPrices(PdfLine line)
{
    var centers = new (double X, int Age)[]
    {
        (250, 12), (294, 11),
        (344, 10), (396, 9), (441, 8), (482, 7), (520, 6),
        (559, 5), (598, 4), (636, 3), (675, 2), (720, 1),
    };

    var result = new List<(int Age, decimal Value)>();
    var priceWords = line.Words
        .Where(w => w.BoundingBox.Left >= 240)   // antes 300 — perdía edades 11 y 12
        .OrderBy(w => w.BoundingBox.Left)
        .ToList();

    for (var index = 0; index < priceWords.Count; index++)
    {
        var text = priceWords[index].Text;
        if (Regex.IsMatch(text, @"^\d{1,3},\d{1,2}$", RegexOptions.CultureInvariant)
            && index + 1 < priceWords.Count
            && Regex.IsMatch(priceWords[index + 1].Text, @"^\d{1,2}$", RegexOptions.CultureInvariant)
            && priceWords[index + 1].BoundingBox.Left - priceWords[index].BoundingBox.Left <= 12)
        {
            text += priceWords[index + 1].Text;
            index++;
        }

        var value = ParseMoney(text);
        if (!value.HasValue)
            continue;

        var center = centers.OrderBy(c => Math.Abs(c.X - priceWords[index].BoundingBox.Left)).First();
        if (Math.Abs(center.X - priceWords[index].BoundingBox.Left) > 26)   // antes 22 — col 12 está más separada
            continue;

        result.Add((center.Age, value.Value));
    }

    return result
        .GroupBy(x => x.Age)
        .Select(g => g.OrderByDescending(x => x.Value).First())
        .OrderByDescending(x => x.Age)
        .ToList();
}

static bool IsFraccion(string text)
{
    return Regex.IsMatch(text.Trim(), @"^\d{4}\.\d{2}\.\d{2}", RegexOptions.CultureInvariant);
}

static string CategoriaFromFraccion(string fraccion)
{
    if (fraccion.StartsWith("8701.", StringComparison.Ordinal))
        return "TRACTOCAMION";
    if (fraccion.StartsWith("8704.31", StringComparison.Ordinal))
        return "PICKUP";
    return "AUTOMOVIL";
}

static string NormalizeForSearch(string value)
{
    var repaired = value
        .Replace("Á", "A").Replace("É", "E").Replace("Í", "I").Replace("Ó", "O").Replace("Ú", "U")
        .Replace("Ü", "U").Replace("Ñ", "N")
        .ToUpperInvariant();

    var decomposed = repaired.Normalize(NormalizationForm.FormD);
    var builder = new StringBuilder(decomposed.Length);
    foreach (var ch in decomposed)
    {
        if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
            continue;

        if (char.IsLetterOrDigit(ch))
            builder.Append(ch);
    }

    return builder.ToString();
}

static string? ReadArg(string[] args, string name)
{
    var index = Array.FindIndex(args, a => a.Equals(name, StringComparison.OrdinalIgnoreCase));
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
}

static string GetConnectionString(string[] args)
{
    var connStr = ReadArg(args, "--connection-string");
    if (!string.IsNullOrWhiteSpace(connStr))
        return connStr.Trim();

    var candidates = new[]
    {
        Path.Combine(AppContext.BaseDirectory, "appsettings.json"),
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "RR.Api", "appsettings.json")),
        Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "RR.Api", "appsettings.json")),
    };

    foreach (var path in candidates)
    {
        if (!File.Exists(path))
            continue;

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        if (doc.RootElement.TryGetProperty("ConnectionStrings", out var section) &&
            section.TryGetProperty("DefaultConnection", out var value))
        {
            return value.GetString() ?? throw new InvalidOperationException("DefaultConnection está vacío");
        }
    }

    throw new InvalidOperationException("No se encontró appsettings.json con DefaultConnection");
}

static void PrintUsage()
{
    Console.WriteLine("Uso:");
    Console.WriteLine("  dotnet run --project RR.DataImporter -- import-tramites --file \"ruta.xlsx\" --tenant \"tenant-guid\" [--dry-run] [--connection-string \"...\"]");
    Console.WriteLine("  dotnet run --project RR.DataImporter -- import-tabuladores --file \"ruta/al/TABULADOR_2026.xlsx\" [--connection-string \"...\"]");
    Console.WriteLine("  dotnet run --project RR.DataImporter -- import-anexo2 --file \"ruta/al/anexo2_catalogo.pdf\" [--generics-only] [--connection-string \"...\"]");
}

file sealed record PdfLine(double Y, IReadOnlyList<Word> Words);

file sealed record SheetInfo(string Fraccion, string Categoria, string? Inciso)
{
    public static SheetInfo? FromName(string sheetName)
    {
        var name = sheetName.Trim().ToUpperInvariant();
        return name switch
        {
            "AUT 1.0 A 1.5" => new SheetInfo("8703.22.02", "AUTOMOVIL", "A"),
            "AUT 1.6 A 3.0" => new SheetInfo("8703.23.02", "AUTOMOVIL", "A"),
            "AUT 3.1 EN ADELANTE" => new SheetInfo("8703.24.02", "AUTOMOVIL", "A"),
            "CAM 1.6 A 3.0" => new SheetInfo("8703.23.02", "CAMIONETA", "B"),
            "CAM 3.1 EN ADELANTE" => new SheetInfo("8703.24.02", "CAMIONETA", "B"),
            "PICK UP´S" or "PICK UP'S" => new SheetInfo("8704.31.05", "PICKUP", null),
            var x when x.StartsWith("TRACTORES DE CARRETERA") => new SheetInfo("8701.21.01", "TRACTOCAMION", null),
            _ => null,
        };
    }
}
