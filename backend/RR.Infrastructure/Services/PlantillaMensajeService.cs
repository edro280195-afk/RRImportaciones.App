using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Plantillas;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class PlantillaMensajeService : IPlantillaMensajeService
{
    private readonly AppDbContext _db;

    public PlantillaMensajeService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PlantillaMensajeDto>> GetAllAsync()
    {
        await EnsureDefaultsAsync();
        return await _db.PlantillasMensaje
            .OrderBy(x => x.Codigo)
            .Select(x => ToDto(x))
            .ToListAsync();
    }

    public async Task<PlantillaMensajeDto?> GetByIdAsync(Guid id)
    {
        await EnsureDefaultsAsync();
        var entity = await _db.PlantillasMensaje.FirstOrDefaultAsync(x => x.Id == id);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<PlantillaMensajeDto> CreateAsync(GuardarPlantillaMensajeRequest request)
    {
        Validate(request);
        var code = request.Codigo.Trim().ToUpperInvariant();
        var exists = await _db.PlantillasMensaje.AnyAsync(x => x.Codigo == code);
        if (exists)
            throw new InvalidOperationException("Ya existe una plantilla con ese codigo");

        var entity = new PlantillaMensaje
        {
            Id = Guid.NewGuid(),
            Codigo = code,
            Asunto = Clean(request.Asunto),
            Cuerpo = request.Cuerpo.Trim(),
            VariablesDisponibles = NormalizeVariables(request.VariablesDisponibles),
            Activa = request.Activa,
        };

        _db.PlantillasMensaje.Add(entity);
        await _db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<PlantillaMensajeDto> UpdateAsync(Guid id, GuardarPlantillaMensajeRequest request)
    {
        Validate(request);
        var entity = await _db.PlantillasMensaje.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Plantilla no encontrada");

        var code = request.Codigo.Trim().ToUpperInvariant();
        var exists = await _db.PlantillasMensaje.AnyAsync(x => x.Id != id && x.Codigo == code);
        if (exists)
            throw new InvalidOperationException("Ya existe una plantilla con ese codigo");

        entity.Codigo = code;
        entity.Asunto = Clean(request.Asunto);
        entity.Cuerpo = request.Cuerpo.Trim();
        entity.VariablesDisponibles = NormalizeVariables(request.VariablesDisponibles);
        entity.Activa = request.Activa;
        entity.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.PlantillasMensaje.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Plantilla no encontrada");

        _db.PlantillasMensaje.Remove(entity);
        await _db.SaveChangesAsync();
    }

    internal async Task<PlantillaMensaje> GetOrCreateDefaultAsync(string codigo)
    {
        await EnsureDefaultsAsync();
        var normalized = codigo.Trim().ToUpperInvariant();
        return await _db.PlantillasMensaje.FirstOrDefaultAsync(x => x.Codigo == normalized && x.Activa)
            ?? DefaultTemplates().First(x => x.Codigo == normalized);
    }

    internal static string Render(string template, IReadOnlyDictionary<string, string> variables)
    {
        return Regex.Replace(template, "\\{([a-zA-Z0-9_]+)\\}", match =>
        {
            var key = match.Groups[1].Value;
            return variables.TryGetValue(key, out var value) ? value : match.Value;
        });
    }

    internal async Task EnsureDefaultsAsync()
    {
        foreach (var template in DefaultTemplates())
        {
            var existing = await _db.PlantillasMensaje.FirstOrDefaultAsync(x => x.Codigo == template.Codigo);
            if (existing is null)
            {
                _db.PlantillasMensaje.Add(template);
                continue;
            }

            if (DebeActualizarPlantillaSistema(existing, template))
            {
                existing.Asunto = template.Asunto;
                existing.Cuerpo = template.Cuerpo;
                existing.VariablesDisponibles = template.VariablesDisponibles;
                existing.FechaModificacion = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
    }

    internal static IReadOnlyDictionary<string, string> BuildVariables(Cotizacion cotizacion, string? urlPdf = null, string? mensajePersonalizado = null)
    {
        var clienteNombre = FirstNotEmpty(cotizacion.Cliente?.NombreCompleto, cotizacion.Cliente?.Nombre, cotizacion.Cliente?.Apodo, "cliente");
        var clienteApodo = cotizacion.Cliente?.Apodo ?? clienteNombre;
        var marca = cotizacion.MarcaTexto ?? "vehiculo";
        var modelo = cotizacion.Modelo ?? "";
        var anno = cotizacion.AnnoModelo?.ToString() ?? "";

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["cliente_apodo"] = clienteApodo,
            ["cliente_nombre"] = clienteNombre,
            ["vehiculo_marca"] = marca,
            ["vehiculo_modelo"] = modelo,
            ["vehiculo_año"] = anno,
            ["vehiculo_ano"] = anno,
            ["vehiculo_vin"] = cotizacion.Vin ?? "",
            ["valor_aduana_usd"] = MoneyUsd(cotizacion.ValorAduanaUsd ?? 0m),
            ["impuestos_total"] = MoneyMxn(cotizacion.TotalContribuciones ?? 0m),
            ["honorarios"] = MoneyMxn(cotizacion.TotalHonorarios ?? 0m),
            ["total"] = MoneyMxn(cotizacion.TotalGeneral ?? 0m),
            ["fecha_expiracion"] = (cotizacion.FechaExpiracion ?? DateTime.UtcNow.Date.AddDays(7)).ToString("dd/MM/yyyy"),
            ["fechaActual"] = CurrentNotificationDate(),
            ["url_pdf"] = urlPdf ?? "",
            ["mensaje_personalizado"] = mensajePersonalizado ?? "",
        };
    }

    private static void Validate(GuardarPlantillaMensajeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Codigo))
            throw new InvalidOperationException("El codigo de plantilla es obligatorio");
        if (string.IsNullOrWhiteSpace(request.Cuerpo))
            throw new InvalidOperationException("El cuerpo de la plantilla es obligatorio");
    }

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeVariables(string value)
        => string.IsNullOrWhiteSpace(value) ? "[]" : value.Trim();

    private static PlantillaMensajeDto ToDto(PlantillaMensaje x)
        => new()
        {
            Id = x.Id,
            Codigo = x.Codigo,
            Asunto = x.Asunto,
            Cuerpo = x.Cuerpo,
            VariablesDisponibles = x.VariablesDisponibles,
            Activa = x.Activa,
            FechaCreacion = x.FechaCreacion,
            FechaModificacion = x.FechaModificacion,
        };

    private static List<PlantillaMensaje> DefaultTemplates()
        => new()
        {
            new PlantillaMensaje
            {
                Id = Guid.NewGuid(),
                Codigo = "COTIZACION_EMAIL",
                Asunto = "Cotizacion R&R Importaciones - {vehiculo_marca} {vehiculo_modelo}",
                Cuerpo = """
                    <p>Hola {cliente_nombre},</p>
                    <p>{mensaje_personalizado}</p>
                    <p>Te compartimos la cotizacion para importar tu <strong>{vehiculo_marca} {vehiculo_modelo}</strong>.</p>
                    <p><strong>Total:</strong> {total}</p>
                    <p>El PDF adjunto incluye el resumen y los terminos de vigencia.</p>
                    <p>Saludos,<br>R&R Importaciones</p>
                    """,
                VariablesDisponibles = DefaultVariablesJson,
            },
            new PlantillaMensaje
            {
                Id = Guid.NewGuid(),
                Codigo = "COTIZACION_WHATSAPP",
                Cuerpo = """
                    Hola {cliente_apodo}, te comparto la cotizacion para importar tu {vehiculo_marca} {vehiculo_modelo}.

                    Resumen:
                    - Valor aduana: {valor_aduana_usd}
                    - Total: {total}

                    Esta cotizacion tiene validez de 7 dias.
                    Detalle completo: {url_pdf}

                    Saludos,
                    R&R Importaciones
                    """,
                VariablesDisponibles = DefaultVariablesJson,
            },
        };

    private const string DefaultVariablesJson = """
        ["cliente_apodo","cliente_nombre","vehiculo_marca","vehiculo_modelo","vehiculo_vin","valor_aduana_usd","impuestos_total","honorarios","total","fecha_expiracion","url_pdf","mensaje_personalizado"]
        """;

    private static string MoneyMxn(decimal value) => string.Format("{0:C2} MXN", value);
    private static string MoneyUsd(decimal value) => string.Format("{0:C2} USD", value);

    private static string FirstNotEmpty(params string?[] values)
        => values.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x))?.Trim() ?? "";

    private static string CurrentNotificationDate()
        => DateTime.Now.ToString("dd/MM/yyyy HH:mm");

    private static bool DebeActualizarPlantillaSistema(PlantillaMensaje existing, PlantillaMensaje template)
    {
        if (existing.Codigo == "COTIZACION_WHATSAPP")
        {
            return existing.Cuerpo.Contains("- Impuestos: {impuestos_total}", StringComparison.OrdinalIgnoreCase)
                || existing.Cuerpo.Contains("- Honorarios: {honorarios}", StringComparison.OrdinalIgnoreCase);
        }

        if (existing.Codigo == "COTIZACION_EMAIL")
            return existing.Cuerpo.Contains("desglose completo", StringComparison.OrdinalIgnoreCase);

        return false;
    }
}
