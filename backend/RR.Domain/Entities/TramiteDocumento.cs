using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class TramiteDocumento : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid TramiteId { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string EstadoLogistico { get; set; } = "PENDIENTE";
    public bool EsRequerido { get; set; } = true;
    public string? ArchivoUrl { get; set; }
    public string? Notas { get; set; }
    public DateTime? FechaRecibido { get; set; }
    public DateTime? FechaValidado { get; set; }
    public Guid? ValidadoPor { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public Tramite Tramite { get; set; } = null!;
}
