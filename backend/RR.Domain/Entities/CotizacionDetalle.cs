using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class CotizacionDetalle : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CotizacionId { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string? Notas { get; set; }
    public int Orden { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Cotizacion Cotizacion { get; set; } = null!;
}
