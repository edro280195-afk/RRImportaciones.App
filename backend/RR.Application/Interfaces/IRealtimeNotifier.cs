namespace RR.Application.Interfaces;

/// <summary>
/// Notificación genérica que alimenta la campanita de la app. Viaja por SignalR
/// en el evento "notificacion" y es el espejo en vivo de lo que se manda por push.
/// </summary>
public class NotificacionRealtime
{
    public string Tipo { get; set; } = "generico";
    public string Titulo { get; set; } = string.Empty;
    public string Mensaje { get; set; } = string.Empty;
    /// <summary>Ruta interna a la que lleva el click. Ej. "/tramites/123".</summary>
    public string? Url { get; set; }
    /// <summary>"success", "info", "warning" o "error".</summary>
    public string Severidad { get; set; } = "info";
    public Dictionary<string, string>? Data { get; set; }
}

public interface IRealtimeNotifier
{
    Task CampoActualizadoAsync(Guid tareaCampoId, Guid? tramiteId, string accion, CancellationToken cancellationToken = default);

    /// <summary>
    /// Emite una notificación al grupo indicado ("admins", "campo") o a un usuario
    /// concreto cuando se pasa <paramref name="usuarioId"/>.
    /// </summary>
    Task NotificacionAsync(string destino, NotificacionRealtime notificacion, Guid? usuarioId = null, CancellationToken cancellationToken = default);
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
