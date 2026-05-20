using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ObtenerAlertasTool : IRodriTool
{
    private static readonly string[] EstadosActivos =
    [
        "PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS",
        "REQUISITOS_PENDIENTES", "BAJA_EN_PROCESO", "BAJA_COMPLETADA",
        "LISTO_PARA_PEDIMENTO", "PEDIMENTO_DOCUMENTADO", "PAGO_PEDIMENTO_PENDIENTE",
        "MANDADO_A_CRUCE", "EN_PROCESO", "ROJO_DESADUANADO",
        "VERDE_ENTREGADO", "ENTREGADO_AL_CLIENTE", "AMARILLO_PENDIENTE_PAGO"
    ];

    public string Name => "obtener_alertas";
    public string Description => "Obtiene alertas actuales del negocio: trámites en retención, sin movimiento, cotizaciones por vencer.";
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

        var tramitesActivos = await db.Tramites
            .Include(t => t.Cliente)
            .Where(t => EstadosActivos.Contains(t.EstadoLogistico))
            .ToListAsync();

        var enRetencionMas7d = tramitesActivos
            .Where(t => t.EstadoLogistico == "EN_RETENCION"
                        && t.FechaEstadoActual.HasValue
                        && (now - t.FechaEstadoActual.Value).TotalDays > 7)
            .Select(t => new
            {
                Tipo = "RETENCION",
                Cliente = t.Cliente?.Nombre,
                Dias = (int)(now - t.FechaEstadoActual!.Value).TotalDays,
                t.NumeroConsecutivo
            });

        var sinMovimientoMas15d = tramitesActivos
            .Where(t => t.FechaEstadoActual.HasValue
                        && (now - t.FechaEstadoActual.Value).TotalDays > 15
                        && t.EstadoLogistico != "EN_RETENCION")
            .Select(t => new
            {
                Tipo = "SIN_MOVIMIENTO",
                Cliente = t.Cliente?.Nombre,
                Estado = t.EstadoLogistico,
                Dias = (int)(now - t.FechaEstadoActual!.Value).TotalDays,
                t.NumeroConsecutivo
            });

        var cotizacionesXVencer = await db.Cotizaciones
            .Include(c => c.Cliente)
            .Where(c => c.FechaExpiracion.HasValue
                        && c.FechaExpiracion.Value <= now.AddDays(3)
                        && c.EstadoLogistico == "ENVIADA")
            .Select(c => new
            {
                Tipo = "COTIZACION_VENCE",
                Cliente = c.Cliente != null ? c.Cliente.Nombre : null,
                c.Folio,
                DiasRestantes = (int)(c.FechaExpiracion!.Value - now).TotalDays
            })
            .ToListAsync();

        var alertas = enRetencionMas7d.Cast<object>()
            .Concat(sinMovimientoMas15d.Cast<object>())
            .Concat(cotizacionesXVencer.Cast<object>())
            .ToList();

        return JsonSerializer.Serialize(new
        {
            total = alertas.Count,
            alertas
        });
    }
}
