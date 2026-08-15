using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

/// <summary>
/// Nombre de cliente capturado en campo cuando el catálogo oficial no estaba
/// disponible. Solo se convierte en Cliente después de la revisión de un
/// usuario con permisos de administración.
/// </summary>
public class ClienteTemporal : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string NombrePropuesto { get; set; } = string.Empty;
    public string Estado { get; set; } = "PENDIENTE";
    public Guid? TareaCampoId { get; set; }
    public Guid? VehiculoId { get; set; }
    public Guid? ClienteId { get; set; }
    public Guid CapturadoPor { get; set; }
    public Guid? RevisadoPor { get; set; }
    public string? MotivoRechazo { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaRevision { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public TareaCampo? TareaCampo { get; set; }
    public Vehiculo? Vehiculo { get; set; }
    public Cliente? Cliente { get; set; }
}
