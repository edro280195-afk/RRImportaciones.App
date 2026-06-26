using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Auth;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(request.RefreshToken);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        await _authService.LogoutAsync(request.RefreshToken);
        return Ok(new { message = "Sesión cerrada exitosamente" });
    }

    /// <summary>Login rápido con PIN para personal de campo.</summary>
    [HttpPost("pin-login")]
    [AllowAnonymous]
    public async Task<IActionResult> PinLogin([FromBody] PinLoginRequest request)
    {
        try
        {
            var result = await _authService.PinLoginAsync(request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>Configura el PIN inicial de un usuario de campo y abre sesion.</summary>
    [HttpPost("initial-campo-pin")]
    [AllowAnonymous]
    public async Task<IActionResult> InitialCampoPin([FromBody] InitialSetPinRequest request)
    {
        try
        {
            var result = await _authService.SetInitialCampoPinAsync(request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>Configura o cambia el PIN del usuario autenticado.</summary>
    [HttpPost("set-pin")]
    [Authorize]
    public async Task<IActionResult> SetPin([FromBody] SetPinRequest request)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("id");

        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Token inválido" });

        try
        {
            await _authService.SetPinAsync(userId, request);
            return Ok(new { message = "PIN configurado correctamente" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>Lista usuarios activos con PIN para la pantalla de selección.</summary>
    [HttpGet("campo-users")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCampoUsers()
    {
        var users = await _authService.GetCampoUsersAsync();
        return Ok(users);
    }

    /// <summary>Solicita el restablecimiento de PIN para un usuario de campo.</summary>
    [HttpPost("forgot-pin")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPin([FromBody] ForgotPinRequest request)
    {
        try
        {
            await _authService.RequestPinResetAsync(request.Username);
            return Ok(new { message = "Solicitud de restablecimiento enviada correctamente" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

public class ForgotPinRequest
{
    public string Username { get; set; } = string.Empty;
}
