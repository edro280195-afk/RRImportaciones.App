using Microsoft.EntityFrameworkCore;
using RR.Infrastructure.Data;

namespace RR.Api.BackgroundServices;

/// <summary>
/// Corre diariamente y marca como EXPIRADA cualquier cotización que haya pasado
/// su fecha de vencimiento sin ser aceptada, rechazada o convertida.
/// </summary>
public class CotizacionesExpirationJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CotizacionesExpirationJob> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    public CotizacionesExpirationJob(IServiceScopeFactory scopeFactory, ILogger<CotizacionesExpirationJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CotizacionesExpirationJob iniciado.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await ExpireAsync(stoppingToken);
            await Task.Delay(Interval, stoppingToken).ContinueWith(_ => { }, CancellationToken.None);
        }
    }

    private async Task ExpireAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var hoy = DateTime.UtcNow.Date;

            var vencidas = await db.Cotizaciones
                .IgnoreQueryFilters()
                .Where(c => (c.EstadoLogistico == "BORRADOR" || c.EstadoLogistico == "ENVIADA")
                            && c.FechaExpiracion < hoy)
                .ToListAsync(ct);

            if (vencidas.Count == 0) return;

            foreach (var c in vencidas)
                c.EstadoLogistico = "EXPIRADA";

            await db.SaveChangesAsync(ct);
            _logger.LogInformation("Se marcaron {Count} cotizaciones como EXPIRADA.", vencidas.Count);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Error en CotizacionesExpirationJob.");
        }
    }
}
