using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class User : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public Guid RoleId { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime? UltimoAcceso { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // PIN de acceso rápido para personal de campo
    public string? PinHash { get; set; }
    public string? PinSalt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Role Role { get; set; } = null!;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
