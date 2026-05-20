using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Pedimento : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid TramiteId { get; set; }
    public string NumeroPedimento { get; set; } = string.Empty;
    public string Tipo { get; set; } = "ORIGINAL";
    public DateTime? FechaEntrada { get; set; }
    public DateTime? FechaPago { get; set; }
    public string? Patente { get; set; }
    public decimal? Igi { get; set; }
    public decimal? Dta { get; set; }
    public decimal? Iva { get; set; }
    public decimal? Previo { get; set; }
    public decimal? TotalContribuciones { get; set; }
    public string? EstadoLogistico { get; set; }
    public string? MotivoRectificacion { get; set; }
    public string? ResponsableError { get; set; }
    public decimal CobroAdicional { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public Tramite Tramite { get; set; } = null!;
}
