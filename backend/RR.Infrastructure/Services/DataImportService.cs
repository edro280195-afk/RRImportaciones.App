using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Importador;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class DataImportService : IDataImportService
{
    private static readonly Regex EntregaRegex = new(@"^([A-Z]+):(.+?)(?:Vin|VIN|vin):\s*(\*?\w+)", RegexOptions.Compiled);

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public DataImportService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<ImportResultDto> ImportTramitesAsync(ImportTramitesRequest request, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(request.FilePath))
            throw new FileNotFoundException("No se encontró el archivo Excel", request.FilePath);

        _tenantContext.SetTenant(request.TenantId);

        var result = new ImportResultDto { DryRun = request.DryRun };
        var logLines = result.Log;
        Log(logLines, request.DryRun ? "Iniciando validación dry-run" : "Iniciando importación real");

        var logDir = Path.Combine(AppContext.BaseDirectory, "logs");
        Directory.CreateDirectory(logDir);
        result.LogPath = Path.Combine(logDir, $"data-import-{DateTime.Now:yyyyMMdd-HHmmss}.log");

        await using var transaction = request.DryRun ? null : await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            using var workbook = new XLWorkbook(request.FilePath);

            await ProcessTramitesSheet(workbook, "LISTA DE TRAMITES G", "NORMAL", result, cancellationToken);
            await ProcessTramitesSheet(workbook, "TRAMITES CON ASERORIA LOGISTICA", "ASESORIA_LOGISTICA", result, cancellationToken);
            await ProcessInventarioSheet(workbook, result, cancellationToken);
            await ProcessGastosSheet(workbook, result, cancellationToken);

            if (request.DryRun)
            {
                _db.ChangeTracker.Clear();
                Log(logLines, "Dry-run terminado sin guardar cambios");
            }
            else
            {
                await _db.SaveChangesAsync(cancellationToken);
                await transaction!.CommitAsync(cancellationToken);
                Log(logLines, "Importación confirmada");
            }
        }
        catch (Exception ex)
        {
            if (transaction is not null)
                await transaction.RollbackAsync(cancellationToken);

            result.Errores.Add(ex.Message);
            result.Rechazados++;
            Log(logLines, $"Error general: {ex.Message}");
            throw;
        }
        finally
        {
            await File.WriteAllLinesAsync(result.LogPath, logLines, cancellationToken);
        }

        return result;
    }

    private async Task ProcessTramitesSheet(XLWorkbook workbook, string sheetName, string tipoTramite, ImportResultDto result, CancellationToken cancellationToken)
    {
        if (!workbook.TryGetWorksheet(sheetName, out var sheet))
        {
            result.Warnings.Add($"No existe la hoja {sheetName}");
            Log(result.Log, $"Hoja omitida: {sheetName}");
            return;
        }

        var table = SheetTable.From(sheet);
        Log(result.Log, $"Procesando {sheetName}");

        var createdClientes = new Dictionary<string, Cliente>(StringComparer.OrdinalIgnoreCase);
        var createdVehiculos = new Dictionary<string, Vehiculo>(StringComparer.OrdinalIgnoreCase);
        var createdMarcas = new Dictionary<string, Marca>(StringComparer.OrdinalIgnoreCase);
        var createdTramitadores = new Dictionary<string, Tramitador>(StringComparer.OrdinalIgnoreCase);
        var createdAduanas = new Dictionary<string, Aduana>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in table.Rows)
        {
            var numeroLegacy = First(row, "numero_consecutivo", "n", "no", "numero", "n°", "#");
            if (string.IsNullOrWhiteSpace(numeroLegacy))
                continue;

            result.RegistrosDetectados++;
            var exists = await _db.Tramites.AnyAsync(t => t.NumeroLegacy == numeroLegacy, cancellationToken);
            if (exists)
            {
                result.Saltados++;
                Log(result.Log, $"Trámite legacy {numeroLegacy} omitido: ya existe");
                continue;
            }

            try
            {
                var clienteNombre = First(row, "cliente", "cliente_apodo", "apodo");
                var cliente = await GetOrCreateCliente(clienteNombre, createdClientes, cancellationToken);
                var marca = await GetOrCreateMarca(First(row, "marca"), createdMarcas, cancellationToken);
                var modelo = await GetOrCreateModelo(marca, First(row, "modelo"), cancellationToken);
                var vin = First(row, "serie", "vin", "num_serie", "numero_serie");
                var vehiculo = await GetOrCreateVehiculo(vin, cliente, marca, modelo, ParseInt(First(row, "año", "ano", "year")), createdVehiculos, cancellationToken);
                var pedimentoText = First(row, "pedimento", "pedimentos");
                var status = First(row, "status", "EstadoLogistico");
                var aduanaClave = ExtractAduanaClave(pedimentoText);
                var aduana = await GetOrCreateAduana(aduanaClave, createdAduanas, cancellationToken);
                var (estado, fechaLiberado) = MapStatus(status);
                var tramitador = tipoTramite == "ASESORIA_LOGISTICA"
                    ? await GetOrCreateTramitador(First(row, "tramitador"), createdTramitadores, cancellationToken)
                    : null;

                var tramite = new Tramite
                {
                    Id = Guid.NewGuid(),
                    NumeroLegacy = numeroLegacy,
                    NumeroConsecutivo = $"LEG-{numeroLegacy}",
                    ClienteId = cliente?.Id,
                    VehiculoId = vehiculo?.Id,
                    AduanaId = aduana?.Id,
                    TramitadorId = tramitador?.Id,
                    TipoTramite = tipoTramite,
                    EstadoLogistico = estado,
                    CobroTotal = ParseDecimal(First(row, "impuesto", "cobro_total", "total")),
                    FechaInicio = ParseDate(First(row, "fecha")),
                    FechaEstadoActual = fechaLiberado ?? DateTime.UtcNow,
                    FechaCreacion = ParseDate(First(row, "fecha")) ?? DateTime.UtcNow,
                    DescripcionMercancia = BuildDescripcion(marca?.Nombre, modelo?.Nombre, ParseInt(First(row, "año", "ano", "year"))),
                };

                _db.Tramites.Add(tramite);
                AddPedimentos(tramite, pedimentoText);

                if (tipoTramite == "ASESORIA_LOGISTICA")
                    await AddEntregaIfPresent(tramite, First(row, "entregas", "entrega"), cancellationToken);

                result.Insertados++;
            }
            catch (Exception ex)
            {
                result.Rechazados++;
                result.Errores.Add($"{sheetName} fila {row.RowNumber}: {ex.Message}");
                Log(result.Log, $"{sheetName} fila {row.RowNumber} rechazada: {ex.Message}");
            }
        }
    }

    private async Task ProcessInventarioSheet(XLWorkbook workbook, ImportResultDto result, CancellationToken cancellationToken)
    {
        if (!workbook.TryGetWorksheet("INVENTARIO CARROS", out var sheet))
        {
            result.Warnings.Add("No existe la hoja INVENTARIO CARROS");
            return;
        }

        var table = SheetTable.From(sheet);
        Log(result.Log, "Procesando INVENTARIO CARROS");

        foreach (var row in table.Rows)
        {
            var vin = First(row, "serie", "vin", "vin_corto");
            var vinCorto = VinCorto(vin);
            if (string.IsNullOrWhiteSpace(vinCorto))
                continue;

            result.RegistrosDetectados++;
            var vehiculo = await _db.Vehiculos
                .Include(v => v.Tramites)
                .FirstOrDefaultAsync(v => v.VinCorto == vinCorto, cancellationToken);

            if (vehiculo is null || vehiculo.Tramites.Any(t => t.EstadoLogistico != "COBRADO" && t.EstadoLogistico != "CANCELADO"))
            {
                result.Saltados++;
                continue;
            }

            vehiculo.FechaIngresoPatio = ParseDate(First(row, "fecha_ingreso_patio", "fecha_ingreso", "fecha"));
            vehiculo.UbicacionActual = First(row, "ubicacion_actual", "ubicacion");
            vehiculo.CumplioRequisitos = ParseBool(First(row, "cumplio_requisitos", "requisitos"));
            vehiculo.TieneSelloAduanal = ParseBool(First(row, "tiene_sello_aduanal", "sello"));
            vehiculo.FechaPedimentoProforma = ParseDate(First(row, "fecha_pedimento_proforma", "proforma"));
            result.Insertados++;
        }
    }

    private async Task ProcessGastosSheet(XLWorkbook workbook, ImportResultDto result, CancellationToken cancellationToken)
    {
        if (!workbook.TryGetWorksheet("GASTOS HORMIGA", out var sheet))
        {
            result.Warnings.Add("No existe la hoja GASTOS HORMIGA");
            return;
        }

        var table = SheetTable.From(sheet);
        Log(result.Log, "Procesando GASTOS HORMIGA");
        var createdClientes = new Dictionary<string, Cliente>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in table.Rows)
        {
            result.RegistrosDetectados++;
            try
            {
                var cliente = await GetOrCreateCliente(First(row, "cliente", "apodo"), createdClientes, cancellationToken);
                var vinCorto = VinCorto(First(row, "serie", "vin", "vin_corto"));
                var vehiculo = string.IsNullOrWhiteSpace(vinCorto)
                    ? null
                    : await _db.Vehiculos.FirstOrDefaultAsync(v => v.VinCorto == vinCorto && v.ClienteId == cliente!.Id, cancellationToken);
                var tipo = await MatchTipoGasto(First(row, "tipo", "tipo_gasto", "categoria", "concepto"), cancellationToken);
                if (tipo is null)
                    throw new InvalidOperationException("No se encontró tipo de gasto compatible");

                _db.GastosHormiga.Add(new GastoHormiga
                {
                    Id = Guid.NewGuid(),
                    ClienteId = cliente?.Id,
                    VehiculoId = vehiculo?.Id,
                    TipoGastoId = tipo.Id,
                    Concepto = First(row, "concepto", "descripcion", "tipo") ?? tipo.Nombre,
                    Monto = ParseDecimal(First(row, "monto", "importe", "total")),
                    Moneda = First(row, "moneda")?.ToUpperInvariant() == "USD" ? "USD" : "MXN",
                    GastoUsd = ParseNullableDecimal(First(row, "gasto_usd", "tipo_cambio", "tc")),
                    ComprobanteUrl = First(row, "comprobante", "comprobante_url"),
                    SeCargaAlCliente = ParseBool(First(row, "se_carga_al_cliente", "cargable", "cliente")),
                    FechaGasto = ParseDate(First(row, "fecha")) ?? DateTime.UtcNow,
                    RegistradoPor = Guid.Empty,
                });
                result.Insertados++;
            }
            catch (Exception ex)
            {
                result.Rechazados++;
                result.Errores.Add($"GASTOS HORMIGA fila {row.RowNumber}: {ex.Message}");
            }
        }
    }

    private async Task<Cliente?> GetOrCreateCliente(string? apodo, Dictionary<string, Cliente> cache, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(apodo))
            return null;

        apodo = apodo.Trim();
        if (cache.TryGetValue(apodo, out var cached))
            return cached;

        var cliente = _db.Clientes.Local.FirstOrDefault(c => c.Apodo.Equals(apodo, StringComparison.OrdinalIgnoreCase))
            ?? await _db.Clientes.FirstOrDefaultAsync(c => c.Apodo.ToLower() == apodo.ToLower(), cancellationToken);
        if (cliente is null)
        {
            cliente = new Cliente { Id = Guid.NewGuid(), Apodo = apodo, Nombre = apodo, NombreCompleto = apodo };
            _db.Clientes.Add(cliente);
        }

        cache[apodo] = cliente;
        return cliente;
    }

    private async Task<Marca?> GetOrCreateMarca(string? nombre, Dictionary<string, Marca> cache, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(nombre))
            return null;

        nombre = nombre.Trim().ToUpperInvariant();
        if (cache.TryGetValue(nombre, out var cached))
            return cached;

        var normalized = Normalize(nombre);
        var marcas = _db.Marcas.Local.Concat(await _db.Marcas.ToListAsync(cancellationToken)).ToList();
        var marca = marcas.FirstOrDefault(m => Normalize(m.Nombre) == normalized || m.Aliases.Any(a => Normalize(a) == normalized));
        if (marca is null)
        {
            marca = new Marca { Id = Guid.NewGuid(), Nombre = nombre };
            _db.Marcas.Add(marca);
        }

        cache[nombre] = marca;
        return marca;
    }

    private async Task<Modelo?> GetOrCreateModelo(Marca? marca, string? nombre, CancellationToken cancellationToken)
    {
        if (marca is null || string.IsNullOrWhiteSpace(nombre))
            return null;

        nombre = nombre.Trim().ToUpperInvariant();
        var modelo = _db.Modelos.Local.FirstOrDefault(m => m.MarcaId == marca.Id && m.Nombre.Equals(nombre, StringComparison.OrdinalIgnoreCase))
            ?? await _db.Modelos.FirstOrDefaultAsync(m => m.MarcaId == marca.Id && m.Nombre.ToLower() == nombre.ToLower(), cancellationToken);
        if (modelo is null)
        {
            modelo = new Modelo { Id = Guid.NewGuid(), MarcaId = marca.Id, Nombre = nombre };
            _db.Modelos.Add(modelo);
        }

        return modelo;
    }

    private async Task<Vehiculo?> GetOrCreateVehiculo(string? vin, Cliente? cliente, Marca? marca, Modelo? modelo, int? anno, Dictionary<string, Vehiculo> cache, CancellationToken cancellationToken)
    {
        if (cliente is null || string.IsNullOrWhiteSpace(vin))
            return null;

        vin = vin.Trim().Trim('*').ToUpperInvariant();
        var vinCorto = VinCorto(vin);
        if (string.IsNullOrWhiteSpace(vinCorto))
            return null;

        var key = $"{cliente.Id}:{vinCorto}";
        if (cache.TryGetValue(key, out var cached))
            return cached;

        var vehiculo = _db.Vehiculos.Local.FirstOrDefault(v => v.ClienteId == cliente.Id && v.VinCorto == vinCorto)
            ?? await _db.Vehiculos.FirstOrDefaultAsync(v => v.ClienteId == cliente.Id && v.VinCorto == vinCorto, cancellationToken);
        if (vehiculo is null)
        {
            vehiculo = new Vehiculo
            {
                Id = Guid.NewGuid(),
                ClienteId = cliente.Id,
                Vin = vin.Length <= 17 ? vin : vin[^17..],
                VinCorto = vinCorto,
                MarcaId = marca?.Id,
                ModeloId = modelo?.Id,
                Anno = anno,
            };
            _db.Vehiculos.Add(vehiculo);
        }

        cache[key] = vehiculo;
        return vehiculo;
    }

    private async Task<Tramitador?> GetOrCreateTramitador(string? nombre, Dictionary<string, Tramitador> cache, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(nombre))
            return null;

        nombre = nombre.Trim();
        if (cache.TryGetValue(nombre, out var cached))
            return cached;

        var tramitador = _db.Tramitadores.Local.FirstOrDefault(t => t.Nombre.Equals(nombre, StringComparison.OrdinalIgnoreCase))
            ?? await _db.Tramitadores.FirstOrDefaultAsync(t => t.Nombre.ToLower() == nombre.ToLower(), cancellationToken);
        if (tramitador is null)
        {
            tramitador = new Tramitador { Id = Guid.NewGuid(), Nombre = nombre };
            _db.Tramitadores.Add(tramitador);
        }

        cache[nombre] = tramitador;
        return tramitador;
    }

    private async Task<Aduana?> GetOrCreateAduana(string? clave, Dictionary<string, Aduana> cache, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(clave))
            return null;

        if (cache.TryGetValue(clave, out var cached))
            return cached;

        var aduana = _db.Aduanas.Local.FirstOrDefault(a => a.ClaveAduana == clave)
            ?? await _db.Aduanas.FirstOrDefaultAsync(a => a.ClaveAduana == clave, cancellationToken);
        if (aduana is null)
        {
            aduana = new Aduana { Id = Guid.NewGuid(), ClaveAduana = clave, Nombre = $"Aduana {clave}" };
            _db.Aduanas.Add(aduana);
        }

        cache[clave] = aduana;
        return aduana;
    }

    private async Task<TipoGastoHormiga?> MatchTipoGasto(string? text, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var normalized = Normalize(text);
        var tipos = await _db.TiposGastoHormiga.Where(t => t.Activo).ToListAsync(cancellationToken);
        return tipos
            .OrderByDescending(t => Normalize(t.Nombre) == normalized)
            .ThenByDescending(t => normalized.Contains(Normalize(t.Nombre)) || Normalize(t.Nombre).Contains(normalized))
            .FirstOrDefault(t => Normalize(t.Nombre) == normalized || normalized.Contains(Normalize(t.Nombre)) || Normalize(t.Nombre).Contains(normalized));
    }

    private async Task AddEntregaIfPresent(Tramite tramite, string? text, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(text))
            return;

        var match = EntregaRegex.Match(text.Trim());
        if (!match.Success)
            return;

        var responsableNombre = match.Groups[1].Value.Trim();
        var descripcion = match.Groups[2].Value.Trim();
        var responsable = await _db.PersonalCampo.FirstOrDefaultAsync(p => p.Nombre.ToLower() == responsableNombre.ToLower(), cancellationToken);
        if (responsable is null)
        {
            responsable = new PersonalCampo { Id = Guid.NewGuid(), Nombre = responsableNombre, Rol = "ENTREGADOR" };
            _db.PersonalCampo.Add(responsable);
        }

        _db.Entregas.Add(new Entrega
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            ResponsableCampoId = responsable.Id,
            Descripcion = descripcion,
            FechaEntrega = DateTime.UtcNow,
            CreadoPor = Guid.Empty,
        });
    }

    private void AddPedimentos(Tramite tramite, string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return;

        var tipo = "ORIGINAL";
        if (text.Contains("R1", StringComparison.OrdinalIgnoreCase)) tipo = "R1";
        if (text.Contains("R2", StringComparison.OrdinalIgnoreCase)) tipo = "R2";

        foreach (var pedimento in Regex.Matches(text, @"\d{7,}").Select(m => m.Value).Distinct().DefaultIfEmpty(text.Trim()))
        {
            _db.Pedimentos.Add(new Pedimento
            {
                Id = Guid.NewGuid(),
                TramiteId = tramite.Id,
                NumeroPedimento = pedimento,
                Tipo = tipo,
                FechaCreacion = DateTime.UtcNow,
            });
        }
    }

    private static (string Estado, DateTime? FechaLiberado) MapStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return ("PENDIENTE_TRAMITE", null);

        if (status.Contains("VERDE", StringComparison.OrdinalIgnoreCase))
            return ("COBRADO", ParseDate(status));

        if (status.Contains("PENDIENTE", StringComparison.OrdinalIgnoreCase))
            return ("PENDIENTE_TRAMITE", null);

        return ("EN_PROCESO", null);
    }

    private static string? ExtractAduanaClave(string? pedimento)
    {
        if (string.IsNullOrWhiteSpace(pedimento))
            return null;

        var match = Regex.Match(pedimento, @"\d{4}");
        return match.Success ? match.Value : null;
    }

    private static string? BuildDescripcion(string? marca, string? modelo, int? anno)
    {
        var parts = new[] { marca, modelo, anno?.ToString(CultureInfo.InvariantCulture) }.Where(p => !string.IsNullOrWhiteSpace(p));
        var value = string.Join(" ", parts);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string? First(ImportRow row, params string[] names)
    {
        foreach (var name in names)
        {
            if (row.Values.TryGetValue(Normalize(name), out var value) && !string.IsNullOrWhiteSpace(value))
                return value.Trim();
        }

        return null;
    }

    private static string? VinCorto(string? vin)
    {
        if (string.IsNullOrWhiteSpace(vin))
            return null;

        var clean = Regex.Replace(vin.Trim().Trim('*').ToUpperInvariant(), @"\W", "");
        return clean.Length <= 6 ? clean : clean[^6..];
    }

    private static decimal ParseDecimal(string? value)
    {
        return ParseNullableDecimal(value) ?? 0m;
    }

    private static decimal? ParseNullableDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var clean = value.Replace("$", "").Replace(",", "").Trim();
        return decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    }

    private static int? ParseInt(string? value)
    {
        return int.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    }

    private static DateTime? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var match = Regex.Match(value, @"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}");
        var dateText = match.Success ? match.Value : value;
        return DateTime.TryParse(dateText, CultureInfo.GetCultureInfo("es-MX"), DateTimeStyles.AssumeLocal, out var parsed)
            ? parsed
            : null;
    }

    private static bool ParseBool(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = Normalize(value);
        return normalized is "si" or "sí" or "true" or "1" or "x" or "yes";
    }

    private static string Normalize(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var chars = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray();
        return Regex.Replace(new string(chars).Normalize(NormalizationForm.FormC), @"[^a-z0-9]+", "_").Trim('_');
    }

    private static void Log(List<string> log, string message)
    {
        log.Add($"{DateTime.Now:HH:mm:ss} {message}");
    }

    private sealed class SheetTable
    {
        public List<ImportRow> Rows { get; } = [];

        public static SheetTable From(IXLWorksheet sheet)
        {
            var table = new SheetTable();
            var used = sheet.RangeUsed();
            if (used is null)
                return table;

            var firstRow = used.FirstRowUsed();
            var headers = firstRow.Cells().ToDictionary(c => c.Address.ColumnNumber, c => Normalize(c.GetString()));
            foreach (var row in used.RowsUsed().Skip(1))
            {
                var values = new Dictionary<string, string>();
                foreach (var cell in row.Cells())
                {
                    if (headers.TryGetValue(cell.Address.ColumnNumber, out var header) && !string.IsNullOrWhiteSpace(header))
                        values[header] = cell.GetFormattedString();
                }

                table.Rows.Add(new ImportRow(row.RowNumber(), values));
            }

            return table;
        }
    }

    private sealed record ImportRow(int RowNumber, Dictionary<string, string> Values);
}
