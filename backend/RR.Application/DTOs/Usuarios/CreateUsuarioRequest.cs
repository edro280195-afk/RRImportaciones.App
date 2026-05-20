namespace RR.Application.DTOs.Usuarios;

public class CreateUsuarioRequest
{
    public string Username { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string? Email { get; set; }
    public string Password { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
    public bool Activo { get; set; } = true;
}
