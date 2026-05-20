namespace RR.Application.DTOs.Plantillas;

public class GuardarPlantillaMensajeRequest
{
    public string Codigo { get; set; } = string.Empty;
    public string? Asunto { get; set; }
    public string Cuerpo { get; set; } = string.Empty;
    public string VariablesDisponibles { get; set; } = "[]";
    public bool Activa { get; set; } = true;
}
