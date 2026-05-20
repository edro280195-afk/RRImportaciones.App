namespace RR.Application.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserInfo User { get; set; } = null!;
    /// <summary>Indica que el usuario de campo aún no ha configurado su PIN.</summary>
    public bool NeedsSetPin { get; set; }
}

public class UserInfo
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string Role { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public List<string> Permisos { get; set; } = [];
}
