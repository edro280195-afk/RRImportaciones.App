namespace RR.Application.DTOs.Auth;

public class PinLoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Pin { get; set; } = string.Empty;
}

public class SetPinRequest
{
    public string NewPin { get; set; } = string.Empty;
    /// <summary>PIN actual, requerido si el usuario ya tiene uno configurado.</summary>
    public string? CurrentPin { get; set; }
}

public class InitialSetPinRequest
{
    public string Username { get; set; } = string.Empty;
    public string NewPin { get; set; } = string.Empty;
}

public class CampoUserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public bool TienePin { get; set; }
}

public class AdminSetPinRequest
{
    public string Pin { get; set; } = string.Empty;
}
