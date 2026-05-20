namespace RR.Application.DTOs.Plantillas;

public class PlantillaMensajeDto
{
    public Guid Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string? Asunto { get; set; }
    public string Cuerpo { get; set; } = string.Empty;
    public string VariablesDisponibles { get; set; } = "[]";
    public bool Activa { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaModificacion { get; set; }
}
