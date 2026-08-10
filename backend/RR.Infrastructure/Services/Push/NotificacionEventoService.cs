using Microsoft.Extensions.Logging;
using RR.Application.Interfaces;

namespace RR.Infrastructure.Services.Push;

/// <summary>
/// Despacha cada evento por los dos caminos: push al dispositivo (llega aunque
/// la app esté cerrada) y SignalR (pinta la campanita al instante en la sesión
/// abierta).
///
/// Nada de lo que pasa aquí puede tumbar la operación de negocio que lo disparó:
/// si Firebase está caído o el token murió, se registra en el log y ya.
/// </summary>
public class NotificacionEventoService : INotificacionEventoService
{
    private readonly IPushNotificationService _push;
    private readonly IRealtimeNotifier _realtime;
    private readonly ILogger<NotificacionEventoService> _logger;

    public NotificacionEventoService(
        IPushNotificationService push,
        IRealtimeNotifier realtime,
        ILogger<NotificacionEventoService> logger)
    {
        _push = push;
        _realtime = realtime;
        _logger = logger;
    }

    public async Task EmitirAsync(NotificacionEvento evento, CancellationToken cancellationToken = default)
    {
        if (evento.Destino == DestinoNotificacion.Usuario
            && (!evento.UsuarioId.HasValue || evento.UsuarioId.Value == Guid.Empty))
        {
            _logger.LogWarning("Evento {Tipo} dirigido a un usuario sin id; se descarta.", evento.Tipo);
            return;
        }

        var payload = new PushPayload
        {
            Title = evento.Titulo,
            Body = evento.Mensaje,
            Url = evento.Url,
            Tag = evento.Tag,
            Tipo = evento.Tipo,
            Data = evento.Data,
        };

        await EjecutarSeguroAsync(evento.Tipo, "push", async () =>
        {
            switch (evento.Destino)
            {
                case DestinoNotificacion.Usuario:
                    await _push.SendToUsersAsync([evento.UsuarioId!.Value], payload, cancellationToken);
                    break;
                case DestinoNotificacion.Campo:
                    await _push.SendToRoleAsync("campo", payload, cancellationToken);
                    break;
                default:
                    await _push.SendToRoleAsync("admin", payload, cancellationToken);
                    break;
            }
        });

        await EjecutarSeguroAsync(evento.Tipo, "signalr", async () =>
        {
            var notificacion = new NotificacionRealtime
            {
                Tipo = evento.Tipo,
                Titulo = evento.Titulo,
                Mensaje = evento.Mensaje,
                Url = evento.Url,
                Severidad = evento.Severidad,
                Data = evento.Data,
            };

            var destino = evento.Destino switch
            {
                DestinoNotificacion.Campo => "campo",
                DestinoNotificacion.Usuario => "user",
                _ => "admins",
            };

            await _realtime.NotificacionAsync(
                destino,
                notificacion,
                evento.Destino == DestinoNotificacion.Usuario ? evento.UsuarioId : null,
                cancellationToken);
        });
    }

    private async Task EjecutarSeguroAsync(string tipo, string canal, Func<Task> accion)
    {
        try
        {
            await accion();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo entregar la notificación {Tipo} por {Canal}.", tipo, canal);
        }
    }
}
