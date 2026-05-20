namespace RR.Application.DTOs.Tramitadores;

public class TramitadorDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; }
    public string ComisionTipo { get; set; } = "NA";
    public decimal ComisionValor { get; set; }
}

public class CreateTramitadorRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string ComisionTipo { get; set; } = "NA";
    public decimal ComisionValor { get; set; }
}

public class UpdateTramitadorRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; }
    public string ComisionTipo { get; set; } = "NA";
    public decimal ComisionValor { get; set; }
}
