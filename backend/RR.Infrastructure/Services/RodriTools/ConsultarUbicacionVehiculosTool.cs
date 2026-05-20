using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ConsultarUbicacionVehiculosTool : IRodriTool
{
    private static readonly string[] EstadosActivos =
    [
        "PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS",
        "REQUISITOS_PENDIENTES", "BAJA_EN_PROCESO", "BAJA_COMPLETADA",
        "LISTO_PARA_PEDIMENTO", "PEDIMENTO_DOCUMENTADO", "PAGO_PEDIMENTO_PENDIENTE",
        "MANDADO_A_CRUCE", "EN_PROCESO", "ROJO_DESADUANADO",
        "VERDE_ENTREGADO", "ENTREGADO_AL_CLIENTE", "AMARILLO_PENDIENTE_PAGO"
    ];

    public string Name => "consultar_ubicacion_vehiculos";
    public string Description => "Muestra dónde están los vehículos en trámite activo: cliente, vehículo, estado actual y cuántos días llevan en ese estado.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            search = new
            {
                type = "string",
                description = "Buscar por nombre de cliente o modelo de vehículo. Opcional."
            }
        }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var args = JsonSerializer.Deserialize<JsonElement>(argumentsJson);
        var search = args.TryGetProperty("search", out var s) ? s.GetString() : null;

        var query = db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Where(t => EstadosActivos.Contains(t.EstadoLogistico) && t.VehiculoId != null)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t =>
                (t.Cliente != null && t.Cliente.Nombre.Contains(search)) ||
                (t.Vehiculo != null && t.Vehiculo.Marca != null && t.Vehiculo.Marca.Nombre.Contains(search)));

        var now = DateTime.UtcNow;

        var tramites = await query
            .OrderBy(t => t.FechaEstadoActual)
            .Take(50)
            .ToListAsync();

        var resultado = tramites.Select(t =>
        {
            var dias = t.FechaEstadoActual.HasValue ? (int)(now - t.FechaEstadoActual.Value).TotalDays : 0;
            var vehiculo = t.Vehiculo != null
                ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre ?? ""} {t.Vehiculo.Modelo?.Nombre ?? ""}".Trim()
                : "—";
            return new
            {
                numero_tramite = t.NumeroConsecutivo,
                cliente = t.Cliente?.Nombre ?? "—",
                vehiculo,
                vin_corto = t.Vehiculo?.VinCorto ?? "—",
                estado = t.EstadoLogistico,
                ubicacion = DescribeUbicacion(t.EstadoLogistico),
                dias_en_estado = dias
            };
        }).ToList();

        return JsonSerializer.Serialize(new
        {
            total_vehiculos = resultado.Count,
            vehiculos = resultado
        });
    }

    private static string DescribeUbicacion(string estado) => estado switch
    {
        "PENDIENTE_TRAMITE"        => "Recién abierto el trámite",
        "FOTOS_SOLICITADAS"        => "Esperando fotos del vehículo (EE.UU.)",
        "FOTOS_RECIBIDAS"          => "Fotos recibidas, en revisión",
        "REQUISITOS_PENDIENTES"    => "Faltan documentos",
        "BAJA_EN_PROCESO"          => "Tramitando baja del vehículo (EE.UU.)",
        "BAJA_COMPLETADA"          => "Baja completada, listo para aduana",
        "LISTO_PARA_PEDIMENTO"     => "Listo para iniciar trámite aduanal",
        "PEDIMENTO_DOCUMENTADO"    => "Papeles de aduana listos",
        "PAGO_PEDIMENTO_PENDIENTE" => "Falta pagar el pedimento en aduana",
        "MANDADO_A_CRUCE"          => "En camino al cruce fronterizo",
        "EN_PROCESO"               => "Cruzando aduana",
        "ROJO_DESADUANADO"         => "Ya pasó aduana, pendiente de entrega",
        "VERDE_ENTREGADO"          => "Entregado",
        "ENTREGADO_AL_CLIENTE"     => "Entregado al cliente",
        "AMARILLO_PENDIENTE_PAGO"  => "Entregado, pendiente de cobro",
        _                          => estado
    };
}
