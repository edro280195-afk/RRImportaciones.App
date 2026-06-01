using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Cotizaciones;
using RR.Domain.Entities;

namespace RR.Infrastructure.Services;

public partial class CotizadorService
{
    private async Task<ResolvedVehicle> ResolveVehicleAsync(CotizacionInput input)
    {
        VehicleDecodedDto? decoded = null;
        if (!string.IsNullOrWhiteSpace(input.Vin) && input.Vin.Trim().Length == 17)
            decoded = await _nhtsa.DecodeVinAsync(input.Vin);

        var make = decoded?.Make ?? input.Marca;
        var model = decoded?.Model ?? input.Modelo;
        var year = decoded?.ModelYear ?? input.Anno;
        var cc = decoded?.DisplacementCC is not null ? (int?)decimal.ToInt32(decoded.DisplacementCC.Value) : input.CilindradaCm3;

        var marca = input.MarcaId.HasValue ? await _db.Marcas.FindAsync(input.MarcaId.Value) : null;
        if (marca is null && !string.IsNullOrWhiteSpace(make))
            marca = await FindMarcaAsync(make);

        return new ResolvedVehicle
        {
            Vin = input.Vin?.Trim().ToUpperInvariant(),
            MarcaId = marca?.Id,
            Marca = marca?.Nombre ?? make,
            Modelo = model,
            Anno = year,
            CilindradaCm3 = cc,
            EngineCylinders = decoded?.EngineCylinders,
            VehicleType = decoded?.VehicleType,
            BodyClass = decoded?.BodyClass,
            FuelType = decoded?.FuelTypePrimary,
        };
    }

    private async Task<Marca?> FindMarcaAsync(string make)
    {
        var normalized = Normalize(make);
        var marcas = await _db.Marcas.ToListAsync();
        return marcas.FirstOrDefault(m =>
            Normalize(m.Nombre) == normalized ||
            m.Aliases.Any(a => Normalize(a) == normalized));
    }

    private static bool MarcaMatches(PrecioEstimado precio, Guid? marcaId, string? marcaTexto)
    {
        var normalizedMarca = Normalize(marcaTexto ?? "");
        if (!marcaId.HasValue && string.IsNullOrWhiteSpace(normalizedMarca))
            return true;

        if (marcaId.HasValue && precio.MarcaId == marcaId)
            return true;

        return !string.IsNullOrWhiteSpace(normalizedMarca)
            && Normalize(precio.MarcaTexto) == normalizedMarca;
    }

    private static readonly string[] _fraccionesGasolina = ["8703.22.02", "8703.23.02", "8703.24.02"];

    private async Task<PriceLookupResult?> FindPrecioEstimadoAsync(string fraccionPrimaria, Guid? marcaId, string? marcaTexto, string? modelo, int anno, int? engineCylinders, string categoria)
    {
        var antiguedad = Math.Clamp(DateTime.Today.Year - anno, 1, 12);
        var hasModel = !string.IsNullOrWhiteSpace(modelo);
        var hasMarca = marcaId.HasValue || !string.IsNullOrWhiteSpace(marcaTexto);

        var fraccionesABuscar = _fraccionesGasolina.Contains(fraccionPrimaria)
            ? _fraccionesGasolina
            : new[] { fraccionPrimaria };

        var fraccionEntities = await _db.FraccionesArancelarias
            .Where(x => fraccionesABuscar.Contains(x.Fraccion))
            .ToListAsync();

        if (fraccionEntities.Count == 0)
            return null;

        var fraccionIds = fraccionEntities.Select(f => f.Id).ToHashSet();

        var precios = await _db.PreciosEstimados
            .Include(x => x.PreciosPorAntiguedad)
            .Include(x => x.Fraccion)
            .Where(x => fraccionIds.Contains(x.FraccionId) && x.PreciosPorAntiguedad.Any())
            .ToListAsync();

        var candidates = precios
            .Where(x => !x.EsGenerico && MarcaMatches(x, marcaId, marcaTexto))
            .Select(x => new { Precio = x, Score = ScoreModelMatch(modelo ?? "", x.Modelo, engineCylinders, categoria) })
            .Where(x => !hasModel || x.Score > 0)
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Precio.PreciosPorAntiguedad.OrderBy(p => Math.Abs(p.AntiguedadAnios - antiguedad)).First().PrecioUsd)
            .ToList();

        var exact = candidates.FirstOrDefault();
        if (exact is not null)
        {
            var tied = candidates
                .Where(x => x.Precio.Id != exact.Precio.Id && x.Score >= exact.Score - 5)
                .Take(3)
                .Select(x => $"{x.Precio.MarcaTexto} {x.Precio.Modelo}".Trim())
                .ToList();

            var warning = tied.Count > 0
                ? $"Se encontraron variantes cercanas: {string.Join(", ", tied)}"
                : null;

            var fraccionReal = exact.Precio.Fraccion?.Fraccion;
            if (fraccionReal is not null && fraccionReal != fraccionPrimaria)
            {
                var notaFraccion = $"Modelo encontrado en fracción {fraccionReal} (cc-calculada: {fraccionPrimaria}); se usa la fracción del catálogo SAT.";
                warning = string.IsNullOrWhiteSpace(warning) ? notaFraccion : $"{warning} {notaFraccion}";
            }

            return BuildPriceLookup(exact.Precio, antiguedad, "ESPECIFICO", exact.Score, warning);
        }

        var preciosPrimaria = precios.Where(x => x.FraccionId == fraccionEntities.FirstOrDefault(f => f.Fraccion == fraccionPrimaria)?.Id).ToList();
        var brandFallback = hasMarca
            ? preciosPrimaria
                .Where(x => !x.EsGenerico && MarcaMatches(x, marcaId, marcaTexto))
                .OrderByDescending(x => x.PreciosPorAntiguedad.OrderBy(p => Math.Abs(p.AntiguedadAnios - antiguedad)).First().PrecioUsd)
                .FirstOrDefault()
                ?? precios
                    .Where(x => !x.EsGenerico && MarcaMatches(x, marcaId, marcaTexto))
                    .OrderByDescending(x => x.PreciosPorAntiguedad.OrderBy(p => Math.Abs(p.AntiguedadAnios - antiguedad)).First().PrecioUsd)
                    .FirstOrDefault()
            : null;

        if (brandFallback is not null)
            return BuildPriceLookup(brandFallback, antiguedad, "MARCA", 20, "No hubo match de modelo; se usó referencia de la misma marca.");

        var incisoBuscado = InferirIncisoDesdeCategoria(categoria);
        var generic = preciosPrimaria
                .Where(x => x.EsGenerico)
                .Where(x => incisoBuscado is null || string.Equals(x.Inciso, incisoBuscado, StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(x.Inciso))
                .OrderBy(x => string.IsNullOrWhiteSpace(x.Inciso) ? 1 : 0)
                .FirstOrDefault()
            ?? precios
                .Where(x => x.EsGenerico)
                .Where(x => incisoBuscado is null || string.Equals(x.Inciso, incisoBuscado, StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(x.Inciso))
                .OrderBy(x => string.IsNullOrWhiteSpace(x.Inciso) ? 1 : 0)
                .FirstOrDefault();

        return generic is null
            ? null
            : BuildPriceLookup(generic, antiguedad, "GENERICO", 0, "No hubo match específico; se usó precio genérico de la fracción.");
    }

    private static PriceLookupResult? BuildPriceLookup(PrecioEstimado selected, int antiguedad, string matchTipo, int score, string? warning)
    {
        var price = selected.PreciosPorAntiguedad
            .OrderBy(x => Math.Abs(x.AntiguedadAnios - antiguedad))
            .ThenByDescending(x => x.AntiguedadAnios)
            .FirstOrDefault();

        if (price is null)
            return null;

        var distancia = Math.Abs(price.AntiguedadAnios - antiguedad);
        var combinedWarning = warning;
        if (distancia > 0)
        {
            var nota = $"Catálogo no tiene precio exacto para {antiguedad} años de antigüedad; se usó tabulador de {price.AntiguedadAnios} años (diferencia: {distancia} año{(distancia == 1 ? "" : "s")}).";
            combinedWarning = string.IsNullOrWhiteSpace(combinedWarning) ? nota : $"{combinedWarning} {nota}";
        }

        return new PriceLookupResult(
            matchTipo == "GENERICO" ? "GENERICO" : "ANEXO2",
            selected.MarcaTexto,
            selected.Modelo,
            selected.HojaOrigen,
            price.AntiguedadAnios,
            selected.Fraccion?.Fraccion,
            matchTipo,
            score,
            combinedWarning,
            price.PrecioUsd);
    }

    private async Task<ParametroFiscal> GetParametroFiscalAsync(string regimen)
    {
        return await _db.ParametrosFiscales
            .Where(x => x.Regimen == regimen && x.Activo)
            .OrderByDescending(x => x.VigenteDesde)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException($"No hay parámetros fiscales activos para {regimen}");
    }

    private async Task<decimal> GetHonorariosAsync(string regimen)
    {
        var config = await _db.HonorariosConfig
            .Where(x => x.Activo && x.TipoMercancia == "VEHICULO" && x.Regimen == regimen)
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();

        if (config is not null)
            return config.Monto;

        return regimen switch
        {
            "POST_2017" => 18350m,
            "PRE_2016"  => 22000m,
            "AMPARO"    => 0m,
            _ => throw new InvalidOperationException($"Régimen desconocido para honorarios: {regimen}")
        };
    }

    private static int ScoreModelMatch(string input, string candidate, int? engineCylinders, string categoria)
    {
        if (string.IsNullOrWhiteSpace(input))
            return 1;

        var normalizedInput = Normalize(input);
        var normalizedCandidate = Normalize(candidate);
        if (string.IsNullOrWhiteSpace(normalizedCandidate))
            return 0;

        var fuzzyInput = NormalizeModelForMatch(input);
        var fuzzyCandidate = NormalizeModelForMatch(candidate);
        var score = 0;
        if (normalizedCandidate == normalizedInput || fuzzyCandidate == fuzzyInput)
            score = 100;
        else if (normalizedCandidate.Contains(normalizedInput) ||
                 normalizedInput.Contains(normalizedCandidate) ||
                 fuzzyCandidate.Contains(fuzzyInput) ||
                 fuzzyInput.Contains(fuzzyCandidate))
            score = 80;

        var inputNumbers = ExtractNumberGroups(normalizedInput);
        var candidateNumbers = ExtractNumberGroups(normalizedCandidate);
        if (score == 0 && inputNumbers.Any(n => n.Length >= 3 && (candidateNumbers.Contains(n) || normalizedCandidate.Contains(n))))
            score = 70;

        var inputTokens = ExtractAlphaNumericTokens(input);
        var candidateTokens = ExtractAlphaNumericTokens(candidate);
        var fuzzyInputTokens = ExtractModelTokens(input);
        var fuzzyCandidateTokens = ExtractModelTokens(candidate);
        if (score == 0 && (
            inputTokens.Any(t => t.Length >= 3 && candidateTokens.Contains(t)) ||
            fuzzyInputTokens.Any(t => t.Length >= 3 && fuzzyCandidateTokens.Contains(t))))
        {
            score = 50;
        }

        if (score == 0)
            return 0;

        // Boost cuando todos los tokens significativos (3+ chars) del input están en el candidate.
        // Ej. "Grand Cherokee" → tokens {GRAND, CHEROKEE} ambos en "GRAND CHEROKEE-6 CYL." → +10.
        // Sube los matches multi-palabra correctos por encima de matches accidentales por una sola palabra.
        var meaningfulInputTokens = fuzzyInputTokens.Where(t => t.Length >= 3).ToList();
        if (meaningfulInputTokens.Count >= 2 && meaningfulInputTokens.All(t => fuzzyCandidateTokens.Contains(t) || fuzzyCandidate.Contains(t)))
            score += 10;

        var candidateForSearch = fuzzyCandidate;
        if (categoria.Equals("PICKUP", StringComparison.OrdinalIgnoreCase) && candidateForSearch.Contains("PICKUP"))
            score += 20;

        if (engineCylinders is 4)
        {
            if (candidateForSearch.Contains("4CYL"))
                score += 25;
            if (candidateForSearch.Contains("V6") || candidateForSearch.Contains("6CYL"))
                score -= 40;
        }
        else if (engineCylinders is 6)
        {
            if (candidateForSearch.Contains("V6") || candidateForSearch.Contains("6CYL"))
                score += 25;
            if (candidateForSearch.Contains("4CYL"))
                score -= 40;
        }
        else if (engineCylinders is 8)
        {
            if (candidateForSearch.Contains("V8") || candidateForSearch.Contains("8CYL"))
                score += 25;
            if (candidateForSearch.Contains("4CYL"))
                score -= 30;
        }

        return Math.Max(0, score);
    }

    private static string NormalizeModelForMatch(string value)
    {
        return Normalize(value).Replace('0', 'O');
    }

    private static HashSet<string> ExtractModelTokens(string value)
    {
        var tokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var token in value.Split(new[] { '/', '-', ' ', '_' }, StringSplitOptions.RemoveEmptyEntries))
        {
            var normalized = NormalizeModelForMatch(token);
            if (!string.IsNullOrWhiteSpace(normalized))
                tokens.Add(normalized);
        }

        return tokens;
    }

    private static HashSet<string> ExtractNumberGroups(string value)
    {
        var groups = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var current = "";
        foreach (var ch in value)
        {
            if (char.IsDigit(ch))
            {
                current += ch;
                continue;
            }

            if (current.Length > 0)
                groups.Add(current);
            current = "";
        }

        if (current.Length > 0)
            groups.Add(current);
        return groups;
    }

    private static HashSet<string> ExtractAlphaNumericTokens(string value)
    {
        var tokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var token in value.Split(new[] { '/', '-', ' ', '_' }, StringSplitOptions.RemoveEmptyEntries))
        {
            var normalized = Normalize(token);
            if (!string.IsNullOrWhiteSpace(normalized))
                tokens.Add(normalized);
        }

        return tokens;
    }

    private static string DetermineRegimen(int anno)
    {
        if (anno is >= 2019 and <= 2021)
            return "AMPARO";
        return anno >= 2017 ? "POST_2017" : "PRE_2016";
    }

    private static (string Fraccion, string Categoria) DetermineFraccion(int? cilindradaCm3, string? tipoVehiculo, string? vehicleType, string? bodyClass, string? fuelType)
    {
        var text = $"{tipoVehiculo} {vehicleType} {bodyClass}".ToUpperInvariant();
        var fuel = (fuelType ?? "").ToUpperInvariant();

        if (fuel.Contains("ELECTRIC"))
            return ("8703.33.02", "ELECTRICO");
        if (fuel.Contains("HYBRID") || fuel.Contains("HÍBRIDO") || fuel.Contains("HIBRIDO"))
            return ("8703.40.02", "HIBRIDO");
        if (text.Contains("TRACTOR") || text.Contains("TRUCK-TRACTOR"))
            return ("8701.21.01", "TRACTOCAMION");
        if (text.Contains("PICKUP") || text.Contains("PICK-UP") || text.Contains("PICK UP"))
            return ("8704.31.05", "PICKUP");

        var cc = cilindradaCm3 ?? 0;
        if (cc <= 1500)
            return ("8703.22.02", "AUTOMOVIL");
        if (cc <= 3000)
            return ("8703.23.02", text.Contains("TRUCK") || text.Contains("CAMIONETA") ? "CAMIONETA" : "AUTOMOVIL");
        return ("8703.24.02", text.Contains("TRUCK") || text.Contains("CAMIONETA") ? "CAMIONETA" : "AUTOMOVIL");
    }

    private static string DetermineCategoriaAmparo(string categoria, int? cylinders)
    {
        if (categoria == "PICKUP")
            return "PICKUP";
        return cylinders switch
        {
            <= 4 => "4_CIL",
            6 => "6_CIL",
            >= 8 => "8_CIL",
            _ => "4_CIL",
        };
    }

    private static CotizacionOutput CalculateTaxes(
        CotizacionInput input,
        ResolvedVehicle resolved,
        (string Fraccion, string Categoria) clasificacion,
        string regimen,
        string fuentePrecio,
        PriceLookupResult? precioLookup,
        decimal? valorUsd,
        decimal valorPesos,
        decimal? tcReferencia,
        decimal? tcAplicado,
        string? tcContexto,
        string? tcNota,
        bool tcStale,
        ParametroFiscal? fiscal,
        decimal honorarios,
        decimal cargoExpress)
    {
        var calcInput = new RR.Domain.Calculators.ParametrosFiscalesInput(
            Igi: fiscal?.Igi,
            Dta: fiscal?.Dta,
            DtaFijo: fiscal?.DtaFijo,
            DtaMinimo: 202m,
            PrevFijo: fiscal?.PrevFijo,
            PrvFijo: fiscal?.PrvFijo,
            Iva: fiscal?.Iva ?? 0.16m
        );

        var calcResult = RR.Domain.Calculators.FiscalCalculator.Calculate(regimen, valorPesos, honorarios, calcInput);

        return new CotizacionOutput
        {
            Vin = resolved.Vin,
            MarcaId = resolved.MarcaId,
            Marca = resolved.Marca,
            Modelo = resolved.Modelo,
            Anno = resolved.Anno,
            CilindradaCm3 = resolved.CilindradaCm3,
            Categoria = clasificacion.Categoria,
            Fraccion = clasificacion.Fraccion,
            RegimenFiscal = regimen,
            FuentePrecio = fuentePrecio,
            PrecioCatalogoMarca = precioLookup?.CatalogoMarca,
            PrecioCatalogoModelo = precioLookup?.CatalogoModelo,
            PrecioCatalogoOrigen = precioLookup?.CatalogoOrigen,
            PrecioAntiguedadAnios = precioLookup?.AntiguedadAnios,
            PrecioMatchTipo = precioLookup?.MatchTipo,
            PrecioMatchScore = precioLookup?.MatchScore,
            PrecioAdvertencia = precioLookup?.Advertencia,
            ValorAduanaUsd = valorUsd,
            ValorPesos = valorPesos,
            TipoCambioReferencia = tcReferencia,
            TipoCambioAplicado = tcAplicado,
            TipoCambioContexto = tcContexto,
            TipoCambioNota = tcNota,
            TipoCambioStale = tcStale,
            IgiPorcentaje = calcResult.IgiPorcentaje,
            Igi = calcResult.Igi,
            Dta = calcResult.Dta,
            Iva = calcResult.Iva,
            Prev = calcResult.Prev,
            Prv = calcResult.Prv,
            ImpuestosTotal = calcResult.ImpuestosTotal,
            Honorarios = honorarios,
            CargoExpress = cargoExpress,
            Total = calcResult.ImpuestosTotal + honorarios + cargoExpress,
        };
    }

    private static string Normalize(string value)
    {
        return new string(value.Trim().ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());
    }

    private sealed class ResolvedVehicle
    {
        public string? Vin { get; set; }
        public Guid? MarcaId { get; set; }
        public string? Marca { get; set; }
        public string? Modelo { get; set; }
        public int? Anno { get; set; }
        public int? CilindradaCm3 { get; set; }
        public int? EngineCylinders { get; set; }
        public string? VehicleType { get; set; }
        public string? BodyClass { get; set; }
        public string? FuelType { get; set; }
    }

    private sealed record PriceLookupResult(
        string FuentePrecio,
        string? CatalogoMarca,
        string? CatalogoModelo,
        string? CatalogoOrigen,
        int? AntiguedadAnios,
        string? FraccionUsada,
        string MatchTipo,
        int MatchScore,
        string? Advertencia,
        decimal PrecioUsd)
    {
        public static PriceLookupResult Override(decimal precioUsd)
            => new("OVERRIDE", null, "Valor capturado manualmente", null, null, null, "OVERRIDE", 100, "El valor aduana fue capturado manualmente.", precioUsd);

        public static PriceLookupResult Amparo(string categoria, string? origen, decimal precioMxn)
            => new("AMPARO", null, categoria, origen, null, null, "AMPARO", 100, "El precio de amparo ya está en pesos.", precioMxn);
    }
}
