using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/push")]
[Authorize]
public class PushController : ControllerBase
{
    private readonly IPushNotificationService _push;

    public PushController(IPushNotificationService push)
    {
        _push = push;
    }

    /// <summary>Devuelve la clave pública VAPID que el frontend usa para suscribir.</summary>
    [HttpGet("public-key")]
    [AllowAnonymous]
    public IActionResult GetPublicKey() => Ok(new { publicKey = _push.PublicKey });

    /// <summary>Registra (o actualiza) la suscripción del navegador del usuario actual.</summary>
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.UserAgent))
            {
                request.UserAgent = Request.Headers.UserAgent.ToString();
                if (request.UserAgent.Length > 500) request.UserAgent = request.UserAgent[..500];
            }
            await _push.SubscribeAsync(request);
            return Ok(new { message = "Suscripción registrada" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Elimina una suscripción por endpoint.</summary>
    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest request)
    {
        await _push.UnsubscribeAsync(request.Endpoint);
        return Ok(new { message = "Suscripción eliminada" });
    }

    public class UnsubscribeRequest
    {
        public string Endpoint { get; set; } = string.Empty;
    }
}
