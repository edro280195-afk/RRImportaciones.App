namespace RR.Application.DTOs.Usuarios;

public class UsuarioListDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string? Email { get; set; }
    public string RolNombre { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
    public bool Activo { get; set; }
    public DateTime? UltimoAcceso { get; set; }
    public DateTime FechaCreacion { get; set; }
}
