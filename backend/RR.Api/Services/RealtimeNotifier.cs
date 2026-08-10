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

    public Task NotificacionAsync(string destino, NotificacionRealtime notificacion, Guid? usuarioId = null, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            notificacion.Tipo,
            notificacion.Titulo,
            notificacion.Mensaje,
            notificacion.Url,
            notificacion.Severidad,
            notificacion.Data,
            fecha = DateTime.UtcNow,
        };

        var grupo = usuarioId.HasValue && usuarioId.Value != Guid.Empty
            ? $"user-{usuarioId.Value}"
            : destino;

        return _hub.Clients.Group(grupo).SendAsync("notificacion", payload, cancellationToken);
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

    public Task PreInspeccionCreadaAsync(
        Guid tareaCampoId,
        Guid? vehiculoId,
        string vehiculoResumen,
        string? vin,
        string? ubicacion,
        string? clienteSugerido,
        string operadorNombre,
        int totalFotos,
        CancellationToken cancellationToken = default)
    {
        return _hub.Clients.Group("admins").SendAsync("preInspeccionCreada", new
        {
            tareaCampoId,
            vehiculoId,
            vehiculoResumen,
            vin,
            ubicacion,
            clienteSugerido,
            operadorNombre,
            totalFotos,
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }

    public Task TareaAsignadaAOperadorAsync(
        Guid operadorUserId,
        Guid tareaCampoId,
        Guid? tramiteId,
        string vehiculoResumen,
        string mensaje,
        CancellationToken cancellationToken = default)
    {
        return _hub.Clients.Group($"user-{operadorUserId}").SendAsync("tareaAsignada", new
        {
            tareaCampoId,
            tramiteId,
            vehiculoResumen,
            mensaje,
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }

    public Task FotosAdicionalesSolicitadasAsync(
        Guid operadorUserId,
        Guid tareaCampoId,
        Guid? tramiteId,
        string vehiculoResumen,
        string mensaje,
        CancellationToken cancellationToken = default)
    {
        return _hub.Clients.Group($"user-{operadorUserId}").SendAsync("fotosSolicitadas", new
        {
            tareaCampoId,
            tramiteId,
            vehiculoResumen,
            mensaje,
            fecha = DateTime.UtcNow,
        }, cancellationToken);
    }
}
