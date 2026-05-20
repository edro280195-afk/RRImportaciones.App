namespace RR.Application.Interfaces;

public interface IRealtimeNotifier
{
    Task CampoActualizadoAsync(Guid tareaCampoId, Guid tramiteId, string accion, CancellationToken cancellationToken = default);
    Task TramiteActualizadoAsync(Guid tramiteId, string accion, CancellationToken cancellationToken = default);

    /// <summary>Notifica a los admins conectados que una tarea de campo fue completada.</summary>
    Task TareaCampoCompletadaAsync(
        Guid tareaCampoId,
        Guid tramiteId,
        string numeroConsecutivo,
        string vehiculoResumen,
        string? ubicacion,
        string? vinConfirmado,
        string? incidencia,
        int totalFotos,
        string operadorNombre,
        CancellationToken cancellationToken = default);

    /// <summary>Notifica a los admins conectados que un operador solicita restablecer su PIN.</summary>
    Task PinResetRequestedAsync(
        Guid usuarioId,
        string usuarioNombre,
        string username,
        CancellationToken cancellationToken = default);
}
