using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Banco : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Identificador { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Titular { get; set; }
    public string? Cuenta { get; set; }
    public string? Clabe { get; set; }
    public string? Moneda { get; set; }
    public string? Notas { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
}
