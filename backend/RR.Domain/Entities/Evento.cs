using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Evento : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid TramiteId { get; set; }
    public string Tipo { get; set; } = "NOTA";
    public string? EstadoAnterior { get; set; }
    public string? EstadoNuevo { get; set; }
    public string Contenido { get; set; } = string.Empty;
    public string? FotoUrl { get; set; }
    public DateTime FechaEvento { get; set; } = DateTime.UtcNow;
    public Guid CreadoPor { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Tramite Tramite { get; set; } = null!;
}
