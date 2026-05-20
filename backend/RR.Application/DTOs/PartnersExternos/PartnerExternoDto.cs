namespace RR.Application.DTOs.PartnersExternos;

public class PartnerExternoDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string[] Aliases { get; set; } = [];
    public string Tipo { get; set; } = "OTRO";
    public string? Notas { get; set; }
    public bool Activo { get; set; }
}

public class CreatePartnerExternoRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string[]? Aliases { get; set; }
    public string Tipo { get; set; } = "OTRO";
    public string? Notas { get; set; }
}

public class UpdatePartnerExternoRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string[]? Aliases { get; set; }
    public string Tipo { get; set; } = "OTRO";
    public string? Notas { get; set; }
    public bool Activo { get; set; }
}
