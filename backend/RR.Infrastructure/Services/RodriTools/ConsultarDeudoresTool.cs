using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ConsultarDeudoresTool : IRodriTool
{
    private static readonly string[] EstadosConSaldo =
    [
        "PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS",
        "REQUISITOS_PENDIENTES", "BAJA_EN_PROCESO", "BAJA_COMPLETADA",
        "LISTO_PARA_PEDIMENTO", "PEDIMENTO_DOCUMENTADO", "PAGO_PEDIMENTO_PENDIENTE",
        "MANDADO_A_CRUCE", "EN_PROCESO", "ROJO_DESADUANADO",
        "VERDE_ENTREGADO", "ENTREGADO_AL_CLIENTE", "AMARILLO_PENDIENTE_PAGO"
    ];

    public string Name => "consultar_deudores";
    public string Description => "Muestra qué clientes tienen saldo pendiente de pago. Retorna lista agrupada por cliente con deuda total y detalle de cada trámite pendiente.";
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

        var tramites = await db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Where(t => EstadosConSaldo.Contains(t.EstadoLogistico))
            .ToListAsync();

        var pagosPorTramite = await db.Pagos
            .GroupBy(p => p.TramiteId)
            .Select(g => new { TramiteId = g.Key, Total = g.Sum(p => p.Monto) })
            .ToDictionaryAsync(x => x.TramiteId, x => x.Total);

        var now = DateTime.UtcNow;

        var conSaldo = tramites
            .Select(t =>
            {
                var pagado = pagosPorTramite.GetValueOrDefault(t.Id, 0);
                var saldo = t.CobroTotal - pagado;
                var dias = t.FechaEstadoActual.HasValue ? (int)(now - t.FechaEstadoActual.Value).TotalDays : 0;
                return new
                {
                    t.Id,
                    Cliente = t.Cliente?.Nombre ?? "Sin cliente",
                    Vehiculo = t.Vehiculo != null
                        ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre ?? ""}".Trim()
                        : "—",
                    t.NumeroConsecutivo,
                    t.CobroTotal,
                    Pagado = pagado,
                    Saldo = saldo,
                    t.EstadoLogistico,
                    DiasEnEstado = dias
                };
            })
            .Where(x => x.Saldo > 0)
            .ToList();

        var agrupado = conSaldo
            .GroupBy(x => x.Cliente)
            .Select(g => new
            {
                cliente = g.Key,
                deuda_total = g.Sum(x => x.Saldo),
                num_tramites = g.Count(),
                tramites = g.OrderByDescending(x => x.Saldo).Select(t => new
                {
                    numero = t.NumeroConsecutivo,
                    vehiculo = t.Vehiculo,
                    cobro_total = t.CobroTotal,
                    pagado = t.Pagado,
                    saldo = t.Saldo,
                    estado = t.EstadoLogistico,
                    dias_en_estado = t.DiasEnEstado
                }).ToList()
            })
            .OrderByDescending(x => x.deuda_total)
            .ToList();

        return JsonSerializer.Serialize(new
        {
            total_clientes_con_deuda = agrupado.Count,
            deuda_total_global = conSaldo.Sum(x => x.Saldo),
            deudores = agrupado
        });
    }
}
