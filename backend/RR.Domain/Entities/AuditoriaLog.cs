using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class AuditoriaLog : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? UsuarioId { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public string? EntidadId { get; set; }
    public string? ValoresAnteriores { get; set; }
    public string? ValoresNuevos { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
}
