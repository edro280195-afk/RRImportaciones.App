using Microsoft.AspNetCore.SignalR;
using RR.Api.Hubs;
using RR.Application.Interfaces;

namespace RR.Api.Services;

public class RealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<RealtimeHub> _hub;

    public RealtimeNotifier(IHubContext<RealtimeHub> hub)
    {
        _hub = hub;
    }

    public Task CampoActualizadoAsync(Guid tareaCampoId, Guid? tramiteId, string accion, CancellationToken cancellationToken = default)
    {
        return _hub.Clients.All.SendAsync("campoActualizado", new
        {
            tareaCampoId,
            tramiteId,
            accion,
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }

    public Task TramiteActualizadoAsync(Guid tramiteId, string accion, CancellationToken cancellationToken = default)
    {
        return _hub.Clients.All.SendAsync("tramiteActualizado", new
        {
            tramiteId,
            accion,
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }

    /// <summary>Emite el evento de captura completada únicamente al grupo 'admins'.</summary>
    public Task TareaCampoCompletadaAsync(
        Guid tareaCampoId,
        Guid tramiteId,
        string numeroConsecutivo,
        string vehiculoResumen,
        string? ubicacion,
        string? vinConfirmado,
        string? incidencia,
        int totalFotos,
        string operadorNombre,
        CancellationToken cancellationToken = default)
    {
        return _hub.Clients.Group("admins").SendAsync("tareaCampoCompletada", new
        {
            tareaCampoId,
            tramiteId,
            numeroConsecutivo,
            vehiculoResumen,
            ubicacion,
            vinConfirmado,
            incidencia,
            totalFotos,
            operadorNombre,
            tieneIncidencia = !string.IsNullOrWhiteSpace(incidencia),
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }

    public Task PinResetRequestedAsync(
        Guid usuarioId,
        string usuarioNombre,
        string username,
        CancellationToken cancellationToken = default)
    {
        return _hub.Clients.Group("admins").SendAsync("pinResetRequested", new
        {
            usuarioId,
            usuarioNombre,
            username,
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }

    public Task NexusAlertaAsync(
        string tipo,
        string mensaje,
        CancellationToken cancellationToken = default)
    {
        return _hub.Clients.Group("admins").SendAsync("nexusAlerta", new
        {
            tipo,
            mensaje,
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }
}
