using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/push")]
[Authorize]
public class PushController : ControllerBase
{
    private readonly IPushNotificationService _push;
    private readonly IConfiguration _config;

    public PushController(IPushNotificationService push, IConfiguration config)
    {
        _push = push;
        _config = config;
    }

    /// <summary>Devuelve la clave pública VAPID que el frontend usa para suscribir.</summary>
    [HttpGet("public-key")]
    [AllowAnonymous]
    public IActionResult GetPublicKey() => Ok(new { publicKey = _push.PublicKey });

    /// <summary>
    /// Le dice al frontend qué canal usar. Si Firebase está configurado el
    /// navegador pide un token FCM; si no, cae al Web Push con VAPID.
    /// </summary>
    [HttpGet("config")]
    [AllowAnonymous]
    public IActionResult GetConfig() => Ok(new
    {
        firebaseEnabled = _push.FirebaseEnabled,
        projectId = _config["Firebase:ProjectId"],
        vapidPublicKey = _push.PublicKey,
    });

    /// <summary>Registra (o actualiza) la suscripción del navegador del usuario actual.</summary>
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeRequest request)
    {
        try
        {
            request.UserAgent = ResolveUserAgent(request.UserAgent);
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

    /// <summary>Registra el token de Firebase del dispositivo del usuario actual.</summary>
    [HttpPost("device-token")]
    public async Task<IActionResult> RegisterDeviceToken([FromBody] RegisterDeviceTokenRequest request)
    {
        try
        {
            request.UserAgent = ResolveUserAgent(request.UserAgent);
            await _push.RegisterDeviceTokenAsync(request);
            return Ok(new { message = "Dispositivo registrado" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Da de baja el token de Firebase (cierre de sesión o cambio de usuario).</summary>
    [HttpPost("device-token/remove")]
    public async Task<IActionResult> UnregisterDeviceToken([FromBody] RemoveDeviceTokenRequest request)
    {
        await _push.UnregisterDeviceTokenAsync(request.Token);
        return Ok(new { message = "Dispositivo dado de baja" });
    }

    private string? ResolveUserAgent(string? provisto)
    {
        if (!string.IsNullOrWhiteSpace(provisto)) return provisto;
        var agente = Request.Headers.UserAgent.ToString();
        return agente.Length > 500 ? agente[..500] : agente;
    }

    public class UnsubscribeRequest
    {
        public string Endpoint { get; set; } = string.Empty;
    }

    public class RemoveDeviceTokenRequest
    {
        public string Token { get; set; } = string.Empty;
    }
}
