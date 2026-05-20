namespace RR.Application.DTOs.Usuarios;

public class UpdateUsuarioRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string? Email { get; set; }
    public Guid RoleId { get; set; }
    public bool Activo { get; set; }
    /// <summary>Si es null o vacío, no se actualiza la contraseña.</summary>
    public string? NuevoPassword { get; set; }
}
