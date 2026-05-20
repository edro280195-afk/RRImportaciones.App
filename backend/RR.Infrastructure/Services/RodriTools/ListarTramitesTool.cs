using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ListarTramitesTool : IRodriTool
{
    private static readonly string[] EstadosActivos =
    [
        "PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS",
        "REQUISITOS_PENDIENTES", "BAJA_EN_PROCESO", "BAJA_COMPLETADA",
        "LISTO_PARA_PEDIMENTO", "PEDIMENTO_DOCUMENTADO", "PAGO_PEDIMENTO_PENDIENTE",
        "MANDADO_A_CRUCE", "EN_PROCESO", "ROJO_DESADUANADO",
        "VERDE_ENTREGADO", "ENTREGADO_AL_CLIENTE", "AMARILLO_PENDIENTE_PAGO"
    ];

    public string Name => "listar_tramites";
    public string Description => "Lista los trámites activos o finalizados con filtros opcionales. Retorna número, cliente, vehículo, estado y saldo.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            solo_activos = new
            {
                type = "boolean",
                description = "Si es true, solo trámites activos. Si es false, solo terminados. Omite para todos."
            },
            estado = new
            {
                type = "string",
                description = "Filtrar por estado específico. Opcional."
            },
            search = new
            {
                type = "string",
                description = "Texto de búsqueda (cliente, vehículo, número consecutivo). Opcional."
            },
            limite = new
            {
                type = "integer",
                description = "Máximo de resultados (default 20, max 50). Opcional."
            }
        }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var args = JsonSerializer.Deserialize<JsonElement>(argumentsJson);
        var soloActivos = args.TryGetProperty("solo_activos", out var sa) ? sa.GetBoolean() : (bool?)null;
        var estado = args.TryGetProperty("estado", out var e) ? e.GetString() : null;
        var search = args.TryGetProperty("search", out var s) ? s.GetString() : null;
        var limite = args.TryGetProperty("limite", out var l) ? l.GetInt32() : 20;
        if (limite > 50) limite = 50;

        var query = db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .AsQueryable();

        if (soloActivos == true)
            query = query.Where(t => EstadosActivos.Contains(t.EstadoLogistico));
        else if (soloActivos == false)
            query = query.Where(t => t.EstadoLogistico == "COBRADO" || t.EstadoLogistico == "CANCELADO");

        if (!string.IsNullOrWhiteSpace(estado))
        {
            if (estado is "VERDE_ENTREGADO" or "ENTREGADO_AL_CLIENTE")
                query = query.Where(t => t.EstadoLogistico == "VERDE_ENTREGADO" || t.EstadoLogistico == "ENTREGADO_AL_CLIENTE");
            else
                query = query.Where(t => t.EstadoLogistico == estado);
        }

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t =>
                (t.Cliente != null && t.Cliente.Nombre.Contains(search)) ||
                (t.NumeroConsecutivo ?? "").Contains(search) ||
                (t.Vehiculo != null && (t.Vehiculo.VinCorto ?? "").Contains(search)));

        var raw = await query
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .OrderByDescending(t => t.FechaCreacion)
            .Take(limite)
            .ToListAsync();

        var results = raw.Select(t => new
        {
            t.Id,
            t.NumeroConsecutivo,
            Cliente = t.Cliente?.Nombre,
            Vehiculo = t.Vehiculo != null
                ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre ?? ""} {t.Vehiculo.Modelo?.Nombre ?? ""}".Trim()
                : null,
            t.EstadoLogistico,
            t.CobroTotal,
            t.FechaCreacion
        }).ToList();

        return JsonSerializer.Serialize(new
        {
            total = results.Count,
            tramites = results
        });
    }
}
