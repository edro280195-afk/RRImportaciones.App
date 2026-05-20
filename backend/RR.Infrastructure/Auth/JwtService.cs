using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RR.Domain.Entities;

namespace RR.Infrastructure.Auth;

public interface IJwtService
{
    (string token, DateTime expiresAt) GenerateJwt(User user);
    string GenerateRefreshToken();
    string HashRefreshToken(string token);
}

public class JwtService : IJwtService
{
    private readonly JwtSettings _settings;

    public JwtService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public (string token, DateTime expiresAt) GenerateJwt(User user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_settings.ExpirationMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role?.Nombre ?? ""),
            new("tenant_id", user.TenantId.ToString()),
        };

        // Incluir cada permiso como claim "permiso" — RealtimeHub y políticas pueden leerlo sin tocar la BD.
        if (user.Role?.RolePermissions != null)
        {
            foreach (var rp in user.Role.RolePermissions)
            {
                if (rp.Permission != null && !string.IsNullOrEmpty(rp.Permission.Codigo))
                    claims.Add(new Claim("permiso", rp.Permission.Codigo));
            }
        }

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public string HashRefreshToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
