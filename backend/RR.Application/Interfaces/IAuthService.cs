using RR.Application.DTOs.Auth;

namespace RR.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);

    /// <summary>Autenticacion rapida por PIN para usuarios con PIN configurado.</summary>
    Task<LoginResponse> PinLoginAsync(PinLoginRequest request);

    /// <summary>Inicia sesión por el enlace temporal de una entrega.</summary>
    Task<LoginResponse> PinLoginPorEntregaAsync(EntregaTokenPinLoginRequest request);

    /// <summary>Configura el PIN inicial desde un enlace temporal de entrega.</summary>
    Task<LoginResponse> ConfigurarPinPorEntregaAsync(EntregaTokenSetPinRequest request);

    /// <summary>Configura o cambia el PIN del usuario autenticado.</summary>
    Task SetPinAsync(Guid userId, SetPinRequest request);

    /// <summary>Lista usuarios activos con PIN para la pantalla de seleccion.</summary>
    Task<List<CampoUserDto>> GetCampoUsersAsync();

    /// <summary>Solicita el restablecimiento del PIN para un usuario.</summary>
    Task RequestPinResetAsync(string username);

    /// <summary>Fuerza el cambio del PIN de un usuario (para uso administrativo, sin comprobar el actual).</summary>
    Task ForceSetPinAsync(Guid userId, string newPin);
}
