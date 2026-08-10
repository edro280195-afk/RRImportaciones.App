namespace RR.Application.Interfaces;

/// <summary>A quién le llega la notificación.</summary>
public enum DestinoNotificacion
{
    /// <summary>Oficina y dirección.</summary>
    Admins,
    /// <summary>Yarderos y choferes.</summary>
    Campo,
    /// <summary>Un usuario concreto (se usa <see cref="NotificacionEvento.UsuarioId"/>).</summary>
    Usuario,
}

/// <summary>
/// Un hecho del negocio que merece avisarle a alguien. Se despacha por los dos
/// caminos a la vez: push (Firebase o Web Push, llega con la app cerrada) y
/// SignalR (alimenta la campanita cuando la app está abierta).
/// </summary>
public class NotificacionEvento
{
    /// <summary>Clave del evento: "campo_registro", "pago_registrado", etc.</summary>
    public string Tipo { get; set; } = "generico";
    public string Titulo { get; set; } = string.Empty;
    public string Mensaje { get; set; } = string.Empty;
    /// <summary>Ruta interna de la app a la que lleva el click.</summary>
    public string? Url { get; set; }
    /// <summary>"success", "info", "warning" o "error".</summary>
    public string Severidad { get; set; } = "info";
    public DestinoNotificacion Destino { get; set; } = DestinoNotificacion.Admins;
    /// <summary>Obligatorio cuando el destino es <see cref="DestinoNotificacion.Usuario"/>.</summary>
    public Guid? UsuarioId { get; set; }
    /// <summary>Agrupador: dos avisos con el mismo tag se reemplazan en el celular.</summary>
    public string? Tag { get; set; }
    public Dictionary<string, string>? Data { get; set; }
}

/// <summary>
/// Punto único por donde salen todas las notificaciones del sistema. Los
/// servicios de negocio no hablan con push ni con SignalR directamente: emiten
/// un evento y esto se encarga del resto, siempre a prueba de fallos (si el
/// envío truena, la operación de negocio sigue su curso).
/// </summary>
public interface INotificacionEventoService
{
    Task EmitirAsync(NotificacionEvento evento, CancellationToken cancellationToken = default);
}
