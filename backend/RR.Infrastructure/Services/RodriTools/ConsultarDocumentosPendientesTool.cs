using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ConsultarDocumentosPendientesTool : IRodriTool
{
    // Estados que implican que algo está pendiente de recibir o hacer
    private static readonly string[] EstadosPendientes =
    [
        "FOTOS_SOLICITADAS",
        "REQUISITOS_PENDIENTES",
        "PAGO_PEDIMENTO_PENDIENTE",
        "PENDIENTE_TRAMITE"
    ];

    public string Name => "consultar_documentos_pendientes";
    public string Description => "Lista los trámites donde falta algo: fotos, documentos o pago de pedimento. Útil para responder '¿Qué falta?' o '¿En qué estamos atascados?'.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new { }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        var tramites = await db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Where(t => EstadosPendientes.Contains(t.EstadoLogistico))
            .OrderBy(t => t.FechaEstadoActual)
            .Take(30)
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
                estado = t.EstadoLogistico,
                que_falta = DescribePendiente(t.EstadoLogistico),
                dias_esperando = dias
            };
        }).ToList();

        return JsonSerializer.Serialize(new
        {
            total_pendientes = resultado.Count,
            pendientes = resultado
        });
    }

    private static string DescribePendiente(string estado) => estado switch
    {
        "FOTOS_SOLICITADAS"        => "Fotos del vehículo (pendiente de recibir)",
        "REQUISITOS_PENDIENTES"    => "Documentos pendientes de entregar",
        "PAGO_PEDIMENTO_PENDIENTE" => "Pago del pedimento en aduana",
        "PENDIENTE_TRAMITE"        => "Pendiente de iniciar gestión",
        _                          => "Pendiente"
    };
}
