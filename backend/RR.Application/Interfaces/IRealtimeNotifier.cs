namespace RR.Application.Interfaces;

public interface IRealtimeNotifier
{
    Task CampoActualizadoAsync(Guid tareaCampoId, Guid? tramiteId, string accion, CancellationToken cancellationToken = default);
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

    /// <summary>Notifica a los admins una alerta proactiva de Nexus.</summary>
    Task NexusAlertaAsync(
        string tipo,
        string mensaje,
        CancellationToken cancellationToken = default);

    /// <summary>Notifica a los admins que un yardero acaba de crear una pre-inspección en yarda.</summary>
    Task PreInspeccionCreadaAsync(
        Guid tareaCampoId,
        Guid? vehiculoId,
        string vehiculoResumen,
        string? vin,
        string? ubicacion,
        string? clienteSugerido,
        string operadorNombre,
        int totalFotos,
        CancellationToken cancellationToken = default);

    /// <summary>Notifica a un operador específico (yardero) que se le asignó una tarea de campo.</summary>
    Task TareaAsignadaAOperadorAsync(
        Guid operadorUserId,
        Guid tareaCampoId,
        Guid? tramiteId,
        string vehiculoResumen,
        string mensaje,
        CancellationToken cancellationToken = default);

    /// <summary>Notifica a un operador específico que el admin pide fotos adicionales para una tarea.</summary>
    Task FotosAdicionalesSolicitadasAsync(
        Guid operadorUserId,
        Guid tareaCampoId,
        Guid? tramiteId,
        string vehiculoResumen,
        string mensaje,
        CancellationToken cancellationToken = default);
}
