using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class MensajeNexus : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ConversacionId { get; set; }
    public string Role { get; set; } = string.Empty; // "user" | "model"
    public string Texto { get; set; } = string.Empty;
    public string? ImagenMime { get; set; }
    public bool TieneImagen { get; set; }
    public string? ToolCallsJson { get; set; } // JSON array of tool names
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int Orden { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public ConversacionNexus Conversacion { get; set; } = null!;
}
