using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class PlantillaMensaje : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string? Asunto { get; set; }
    public string Cuerpo { get; set; } = string.Empty;
    public string VariablesDisponibles { get; set; } = "[]";
    public bool Activa { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaModificacion { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
