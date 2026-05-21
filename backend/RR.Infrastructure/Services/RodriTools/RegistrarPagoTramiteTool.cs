using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

/// <summary>
/// Tool de escritura: registra un pago de cliente en un trámite.
/// Rodri debe pedir confirmación antes de llamar esta herramienta.
/// </summary>
public class RegistrarPagoTramiteTool : IRodriTool
{
    public string Name => "registrar_pago_tramite";

    public string Description =>
        "Registra un pago de un cliente en un trámite. " +
        "Busca el trámite por número consecutivo (ej. RR-001) o por nombre del cliente. " +
        "Si hay varios trámites del mismo cliente, devuelve la lista para que el usuario elija. " +
        "IMPORTANTE: antes de ejecutar esta herramienta, pregunta confirmación explícita al usuario con el monto y el cliente.";

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
            monto = new
            {
                type = "number",
                description = "Monto del pago en pesos mexicanos"
            },
            metodo = new
            {
                type = "string",
                @enum = new[] { "TRANSFERENCIA", "EFECTIVO", "CHEQUE", "TARJETA" },
                description = "Método de pago. Si no se especifica, se usa TRANSFERENCIA"
            },
            notas = new
            {
                type = "string",
                description = "Notas adicionales del pago (opcional)"
            }
        },
        required = new[] { "identificador", "monto" }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var root = doc.RootElement;

        if (!root.TryGetProperty("identificador", out var idProp) || string.IsNullOrWhiteSpace(idProp.GetString()))
            return JsonSerializer.Serialize(new { error = "Falta el identificador del trámite o cliente." });

        if (!root.TryGetProperty("monto", out var montoProp) || montoProp.GetDecimal() <= 0)
            return JsonSerializer.Serialize(new { error = "El monto debe ser mayor a cero." });

        var identificador = idProp.GetString()!.Trim();
        var monto = montoProp.GetDecimal();
        var metodo = root.TryGetProperty("metodo", out var mProp) ? mProp.GetString() ?? "TRANSFERENCIA" : "TRANSFERENCIA";
        var notas = root.TryGetProperty("notas", out var nProp) ? nProp.GetString() : null;

        var db = sp.GetRequiredService<AppDbContext>();
        var currentUser = sp.GetRequiredService<ICurrentUserService>();

        // Buscar trámite por número consecutivo o por nombre de cliente
        var tramitesQuery = db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Where(t => t.EstadoLogistico != "COBRADO" && t.EstadoLogistico != "CANCELADO");

        var esNumero = identificador.StartsWith("RR-", StringComparison.OrdinalIgnoreCase)
                    || identificador.All(c => char.IsDigit(c) || c == '-');

        List<Tramite> candidatos;
        if (esNumero)
        {
            candidatos = await tramitesQuery
                .Where(t => t.NumeroConsecutivo.ToLower() == identificador.ToLower())
                .ToListAsync();
        }
        else
        {
            candidatos = await tramitesQuery
                .Where(t => t.Cliente != null && t.Cliente.Nombre.ToLower().Contains(identificador.ToLower()))
                .ToListAsync();
        }

        if (candidatos.Count == 0)
            return JsonSerializer.Serialize(new
            {
                error = $"No se encontró ningún trámite activo con el identificador '{identificador}'. Verifica el número o el nombre del cliente."
            });

        // Si hay varios, pedir que especifiquen
        if (candidatos.Count > 1)
        {
            var lista = candidatos.Select(t => new
            {
                numero = t.NumeroConsecutivo,
                cliente = t.Cliente?.Nombre ?? "—",
                vehiculo = t.Vehiculo != null ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre}".Trim() : "—",
                estado = t.EstadoLogistico
            });
            return JsonSerializer.Serialize(new
            {
                multiples_tramites = true,
                mensaje = $"Encontré {candidatos.Count} trámites para '{identificador}'. ¿A cuál de estos quiere registrar el pago?",
                tramites = lista
            });
        }

        // Un solo trámite — registrar el pago
        var tramite = candidatos[0];

        // Calcular saldo actual
        var pagosExistentes = await db.Pagos
            .Where(p => p.TramiteId == tramite.Id)
            .SumAsync(p => p.Monto);
        var saldoActual = tramite.CobroTotal - pagosExistentes;

        if (monto > saldoActual + 1) // +1 de margen por decimales
        {
            return JsonSerializer.Serialize(new
            {
                advertencia = true,
                mensaje = $"El monto ${monto:N0} supera el saldo pendiente de ${saldoActual:N0} del trámite {tramite.NumeroConsecutivo} ({tramite.Cliente?.Nombre}). ¿Desea registrar el pago de todas formas?"
            });
        }

        var pago = new Pago
        {
            Id = Guid.NewGuid(),
            TenantId = tramite.TenantId,
            TramiteId = tramite.Id,
            Monto = monto,
            Moneda = "MXN",
            TipoMovimiento = "PAGO_CLIENTE",
            PagadoPor = "CLIENTE",
            SeCobraAlCliente = true,
            Metodo = metodo,
            Notas = notas,
            FechaPago = DateTime.UtcNow,
            FechaRegistro = DateTime.UtcNow,
            RegistradoPor = currentUser.UserId ?? Guid.Empty,
            Verificado = false
        };

        db.Pagos.Add(pago);

        // Actualizar EstadoFinanciero del trámite
        var nuevoSaldo = saldoActual - monto;
        tramite.EstadoFinanciero = nuevoSaldo <= 0 ? "SALDADO" : "ADEUDO_PARCIAL";
        tramite.FechaModificacion = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            exito = true,
            mensaje = $"✅ Pago registrado correctamente.",
            detalle = new
            {
                tramite = tramite.NumeroConsecutivo,
                cliente = tramite.Cliente?.Nombre ?? "—",
                monto_registrado = monto,
                saldo_anterior = saldoActual,
                saldo_nuevo = nuevoSaldo,
                estado_financiero = tramite.EstadoFinanciero,
                nota = nuevoSaldo <= 0
                    ? "El trámite quedó saldado. Recuerde marcarlo como COBRADO cuando corresponda."
                    : $"Aún falta por cobrar ${nuevoSaldo:N0} pesos."
            }
        });
    }
}
