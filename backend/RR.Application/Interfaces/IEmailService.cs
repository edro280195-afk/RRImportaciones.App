namespace RR.Application.Interfaces;

public interface IEmailService
{
    Task SendCotizacionAsync(Guid cotizacionId, string destinatario, string? mensajePersonalizado);

    /// <summary>Envía correo de notificación a los admins cuando una tarea de campo se completa.</summary>
    Task SendCampoCompletadoAsync(
        string destinatario,
        string numeroConsecutivo,
        string vehiculoResumen,
        string? vinConfirmado,
        string? ubicacion,
        string? incidencia,
        IReadOnlyList<string> fotosUrls,
        string operadorNombre,
        string appBaseUrl);

    /// <summary>Envía correo de notificación a los admins cuando un operador solicita restablecer su PIN.</summary>
    Task SendPinResetRequestedAsync(
        string destinatario,
        string operadorNombre,
        string username,
        string appBaseUrl);
}
