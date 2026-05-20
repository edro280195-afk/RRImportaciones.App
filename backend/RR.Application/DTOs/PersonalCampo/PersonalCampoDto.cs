namespace RR.Application.DTOs.PersonalCampo;

public class PersonalCampoDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = "ENTREGADOR";
    public string? Telefono { get; set; }
    public bool Activo { get; set; }
}

public class CreatePersonalCampoRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = "ENTREGADOR";
    public string? Telefono { get; set; }
}

public class UpdatePersonalCampoRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = "ENTREGADOR";
    public string? Telefono { get; set; }
    public bool Activo { get; set; }
}
