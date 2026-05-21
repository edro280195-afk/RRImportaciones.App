using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

/// <summary>
/// Tool de escritura: actualiza el estado logístico de un trámite.
/// Rodri debe pedir confirmación antes de llamar esta herramienta.
/// </summary>
public class ActualizarEstadoTramiteTool : IRodriTool
{
    private static readonly Dictionary<string, string> EstadosValidos = new(StringComparer.OrdinalIgnoreCase)
    {
        ["PENDIENTE_TRAMITE"]        = "recién abierto",
        ["FOTOS_SOLICITADAS"]        = "esperando fotos del carro",
        ["FOTOS_RECIBIDAS"]          = "fotos recibidas, en revisión",
        ["REQUISITOS_PENDIENTES"]    = "faltan documentos",
        ["BAJA_EN_PROCESO"]          = "tramitando la baja en EE.UU.",
        ["BAJA_COMPLETADA"]          = "la baja ya quedó lista",
        ["LISTO_PARA_PEDIMENTO"]     = "listo para entrar a aduana",
        ["PEDIMENTO_DOCUMENTADO"]    = "papeles de aduana listos",
        ["PAGO_PEDIMENTO_PENDIENTE"] = "falta pagar en aduana",
        ["MANDADO_A_CRUCE"]          = "ya va en camino al cruce",
        ["EN_PROCESO"]               = "cruzando la aduana ahorita",
        ["ROJO_DESADUANADO"]         = "pasó aduana (rojo), en espera de entrega",
        ["VERDE_ENTREGADO"]          = "entregado por aduana (carril verde)",
        ["ENTREGADO_AL_CLIENTE"]     = "ya está con el cliente",
        ["AMARILLO_PENDIENTE_PAGO"]  = "entregado, falta que paguen",
        ["COBRADO"]                  = "cerrado y cobrado",
        ["CANCELADO"]                = "cancelado"
    };

    public string Name => "actualizar_estado_tramite";

    public string Description =>
        "Actualiza el estado logístico de un trámite. " +
        "Estados válidos: PENDIENTE_TRAMITE, FOTOS_SOLICITADAS, FOTOS_RECIBIDAS, REQUISITOS_PENDIENTES, " +
        "BAJA_EN_PROCESO, BAJA_COMPLETADA, LISTO_PARA_PEDIMENTO, PEDIMENTO_DOCUMENTADO, PAGO_PEDIMENTO_PENDIENTE, " +
        "MANDADO_A_CRUCE, EN_PROCESO, ROJO_DESADUANADO, VERDE_ENTREGADO, ENTREGADO_AL_CLIENTE, " +
        "AMARILLO_PENDIENTE_PAGO, COBRADO, CANCELADO. " +
        "IMPORTANTE: antes de ejecutar esta herramienta, confirma con el usuario el trámite y el nuevo estado.";

    public bool RequiresConfirmation => true;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            identificador = new
            {
                type = "string",
                description = "Número consecutivo del trámite (ej. RR-042) o nombre/apellido del cliente"
            },
            nuevo_estado = new
            {
                type = "string",
                description = "Nuevo estado logístico. Debe ser uno de los estados válidos del sistema."
            }
        },
        required = new[] { "identificador", "nuevo_estado" }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var root = doc.RootElement;

        if (!root.TryGetProperty("identificador", out var idProp) || string.IsNullOrWhiteSpace(idProp.GetString()))
            return JsonSerializer.Serialize(new { error = "Falta el identificador del trámite o cliente." });

        if (!root.TryGetProperty("nuevo_estado", out var estadoProp) || string.IsNullOrWhiteSpace(estadoProp.GetString()))
            return JsonSerializer.Serialize(new { error = "Falta el nuevo estado." });

        var identificador = idProp.GetString()!.Trim();
        var nuevoEstado = estadoProp.GetString()!.Trim().ToUpper();

        // Validar estado
        if (!EstadosValidos.ContainsKey(nuevoEstado))
        {
            return JsonSerializer.Serialize(new
            {
                error = $"Estado '{nuevoEstado}' no válido.",
                estados_disponibles = EstadosValidos.Keys.ToList()
            });
        }

        var db = sp.GetRequiredService<AppDbContext>();

        // Buscar trámite
        var query = db.Tramites.Include(t => t.Cliente).Include(t => t.Vehiculo).ThenInclude(v => v!.Marca);

        var esNumero = identificador.StartsWith("RR-", StringComparison.OrdinalIgnoreCase)
                    || identificador.All(c => char.IsDigit(c) || c == '-');

        List<Tramite> candidatos;
        if (esNumero)
        {
            candidatos = await query
                .Where(t => t.NumeroConsecutivo.ToLower() == identificador.ToLower())
                .ToListAsync();
        }
        else
        {
            candidatos = await query
                .Where(t => t.Cliente != null && t.Cliente.Nombre.ToLower().Contains(identificador.ToLower()))
                .ToListAsync();
        }

        if (candidatos.Count == 0)
            return JsonSerializer.Serialize(new
            {
                error = $"No se encontró ningún trámite con el identificador '{identificador}'."
            });

        if (candidatos.Count > 1)
        {
            var lista = candidatos.Select(t => new
            {
                numero = t.NumeroConsecutivo,
                cliente = t.Cliente?.Nombre ?? "—",
                vehiculo = t.Vehiculo != null ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre}".Trim() : "—",
                estado_actual = t.EstadoLogistico
            });
            return JsonSerializer.Serialize(new
            {
                multiples_tramites = true,
                mensaje = $"Encontré {candidatos.Count} trámites para '{identificador}'. ¿A cuál le cambia el estado?",
                tramites = lista
            });
        }

        var tramite = candidatos[0];
        var estadoAnterior = tramite.EstadoLogistico;

        tramite.EstadoLogistico = nuevoEstado;
        tramite.FechaEstadoActual = DateTime.UtcNow;
        tramite.FechaModificacion = DateTime.UtcNow;

        // Si se marca COBRADO, actualizar EstadoFinanciero
        if (nuevoEstado == "COBRADO")
            tramite.EstadoFinanciero = "SALDADO";

        await db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            exito = true,
            mensaje = "✅ Estado actualizado correctamente.",
            detalle = new
            {
                tramite = tramite.NumeroConsecutivo,
                cliente = tramite.Cliente?.Nombre ?? "—",
                vehiculo = tramite.Vehiculo != null
                    ? $"{tramite.Vehiculo.Anno} {tramite.Vehiculo.Marca?.Nombre}".Trim()
                    : "—",
                estado_anterior = estadoAnterior,
                estado_nuevo = nuevoEstado,
                descripcion = EstadosValidos[nuevoEstado]
            }
        });
    }
}
