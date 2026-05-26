using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Api.BackgroundServices;

public class NexusProactiveJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NexusProactiveJob> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromHours(2); // Verificar cada 2 horas
    private static readonly TimeSpan AlertCooldown = TimeSpan.FromDays(1); // Evitar re-alertar el mismo registro más de una vez al día
    private readonly ConcurrentDictionary<string, DateTime> _lastAlerted = new();

    private static readonly string[] EstadosActivos =
    [
        "PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS",
        "REQUISITOS_PENDIENTES", "BAJA_EN_PROCESO", "BAJA_COMPLETADA",
        "LISTO_PARA_PEDIMENTO", "PEDIMENTO_DOCUMENTADO", "PAGO_PEDIMENTO_PENDIENTE",
        "MANDADO_A_CRUCE", "EN_PROCESO", "ROJO_DESADUANADO",
        "VERDE_ENTREGADO", "ENTREGADO_AL_CLIENTE", "AMARILLO_PENDIENTE_PAGO"
    ];

    public NexusProactiveJob(IServiceScopeFactory scopeFactory, ILogger<NexusProactiveJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("NexusProactiveJob iniciado.");

        // Breve retraso al iniciar el servidor para no ralentizar el arranque
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunChecksAsync(stoppingToken);
            await Task.Delay(Interval, stoppingToken).ContinueWith(_ => { }, CancellationToken.None);
        }
    }

    private async Task RunChecksAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var notifier = scope.ServiceProvider.GetRequiredService<IRealtimeNotifier>();

            var now = DateTime.UtcNow;

            // 1. Trámites sin movimiento por más de 15 días
            var sinMovimiento = await db.Tramites
                .IgnoreQueryFilters()
                .Include(t => t.Cliente)
                .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
                .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
                .Where(t => EstadosActivos.Contains(t.EstadoLogistico)
                            && t.FechaEstadoActual.HasValue
                            && t.FechaEstadoActual < now.AddDays(-15))
                .ToListAsync(ct);

            foreach (var t in sinMovimiento)
            {
                var key = $"sin_mov_{t.Id}";
                if (_lastAlerted.TryGetValue(key, out var lastTime) && now - lastTime < AlertCooldown)
                    continue;

                var auto = t.Vehiculo != null ? $"{t.Vehiculo.Marca?.Nombre ?? ""} {t.Vehiculo.Modelo?.Nombre ?? ""}".Trim() : "Vehículo";
                var cliente = t.Cliente?.Nombre ?? "Cliente sin nombre";
                var mensaje = $"Don Ricardo, el trámite consecutivo *{t.NumeroConsecutivo}* ({auto} de {cliente}) lleva 15 días sin movimiento en el estado *{FormatEstatus(t.EstadoLogistico)}* ⚠️";

                await notifier.NexusAlertaAsync("retraso", mensaje, ct);
                _lastAlerted[key] = now;
            }

            // 2. Pagos de trámite retrasados por más de 7 días (PAGO_PEDIMENTO_PENDIENTE o AMARILLO_PENDIENTE_PAGO)
            var pagosRetrasados = await db.Tramites
                .IgnoreQueryFilters()
                .Include(t => t.Cliente)
                .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
                .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
                .Where(t => (t.EstadoLogistico == "PAGO_PEDIMENTO_PENDIENTE" || t.EstadoLogistico == "AMARILLO_PENDIENTE_PAGO")
                            && t.FechaEstadoActual.HasValue
                            && t.FechaEstadoActual < now.AddDays(-7))
                .ToListAsync(ct);

            foreach (var t in pagosRetrasados)
            {
                var key = $"pago_ret_{t.Id}";
                if (_lastAlerted.TryGetValue(key, out var lastTime) && now - lastTime < AlertCooldown)
                    continue;

                var auto = t.Vehiculo != null ? $"{t.Vehiculo.Marca?.Nombre ?? ""} {t.Vehiculo.Modelo?.Nombre ?? ""}".Trim() : "Vehículo";
                var cliente = t.Cliente?.Nombre ?? "Cliente";
                var dias = (int)(now - t.FechaEstadoActual!.Value).TotalDays;
                var mensaje = $"Don Ricardo, tenemos el pago pendiente de aduana para *{t.NumeroConsecutivo}* ({auto} - {cliente}) desde hace {dias} días 💰";

                await notifier.NexusAlertaAsync("pago", mensaje, ct);
                _lastAlerted[key] = now;
            }

            // 3. Cotizaciones por vencer en < 72h
            var cotizacionesPorVencer = await db.Cotizaciones
                .IgnoreQueryFilters()
                .Include(c => c.Cliente)
                .Where(c => c.EstadoLogistico == "ENVIADA"
                            && c.FechaExpiracion.HasValue
                            && c.FechaExpiracion > now
                            && c.FechaExpiracion <= now.AddDays(3))
                .ToListAsync(ct);

            foreach (var c in cotizacionesPorVencer)
            {
                var key = $"cotiz_exp_{c.Id}";
                if (_lastAlerted.TryGetValue(key, out var lastTime) && now - lastTime < AlertCooldown)
                    continue;

                var cliente = c.Cliente?.Nombre ?? "Cliente";
                var auto = $"{c.MarcaTexto ?? ""} {c.Modelo ?? ""}".Trim();
                var dias = (int)(c.FechaExpiracion!.Value - now).TotalDays;
                var mensaje = $"Don Ricardo, la cotización *{c.Folio ?? "s/f"}* ({auto} para {cliente}) vencerá en {dias} días y aún no tiene respuesta ⏳";

                await notifier.NexusAlertaAsync("expiracion", mensaje, ct);
                _lastAlerted[key] = now;
            }

            // Limpieza periódica del diccionario en memoria para no acumular registros antiguos
            if (_lastAlerted.Count > 1000)
            {
                var vieja = now.AddDays(-2);
                var aQuitar = _lastAlerted.Where(kv => kv.Value < vieja).Select(kv => kv.Key).ToList();
                foreach (var k in aQuitar)
                    _lastAlerted.TryRemove(k, out _);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ejecutando revisiones proactivas en NexusProactiveJob.");
        }
    }

    private static string FormatEstatus(string estadoLogistico) => estadoLogistico switch
    {
        "PENDIENTE_TRAMITE"        => "Pendiente de trámite",
        "FOTOS_SOLICITADAS"        => "Fotos solicitadas",
        "FOTOS_RECIBIDAS"          => "Fotos recibidas",
        "REQUISITOS_PENDIENTES"    => "Requisitos pendientes",
        "BAJA_EN_PROCESO"          => "Baja en proceso",
        "BAJA_COMPLETADA"          => "Baja completada",
        "LISTO_PARA_PEDIMENTO"     => "Listo para pedimento",
        "PEDIMENTO_DOCUMENTADO"    => "Pedimento documentado",
        "PAGO_PEDIMENTO_PENDIENTE" => "Pago de pedimento pendiente",
        "MANDADO_A_CRUCE"          => "Mandado a cruce",
        "EN_PROCESO"               => "En proceso",
        "ROJO_DESADUANADO"         => "Desaduanado (rojo)",
        "VERDE_ENTREGADO"          => "Entregado (verde)",
        "ENTREGADO_AL_CLIENTE"     => "Entregado al cliente",
        "AMARILLO_PENDIENTE_PAGO"  => "Pendiente de pago",
        "COBRADO"                  => "Cobrado",
        "CANCELADO"                => "Cancelado",
        _                          => estadoLogistico
    };
}
