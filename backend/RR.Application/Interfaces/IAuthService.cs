using RR.Application.DTOs.Auth;

namespace RR.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);

    /// <summary>Autenticación rápida por PIN para personal de campo.</summary>
    Task<LoginResponse> PinLoginAsync(PinLoginRequest request);

    /// <summary>Configura o cambia el PIN del usuario autenticado.</summary>
    Task SetPinAsync(Guid userId, SetPinRequest request);

    /// <summary>Configura el PIN inicial de un usuario de campo y devuelve sesion activa.</summary>
    Task<LoginResponse> SetInitialCampoPinAsync(InitialSetPinRequest request);

    /// <summary>Lista los usuarios con permiso CAMPO_USAR para la pantalla de selección de PIN.</summary>
    Task<List<CampoUserDto>> GetCampoUsersAsync();

    /// <summary>Solicita el restablecimiento del PIN para un usuario de campo.</summary>
    Task RequestPinResetAsync(string username);

    /// <summary>Fuerza el cambio del PIN de un usuario (para uso administrativo, sin comprobar el actual).</summary>
    Task ForceSetPinAsync(Guid userId, string newPin);
}
