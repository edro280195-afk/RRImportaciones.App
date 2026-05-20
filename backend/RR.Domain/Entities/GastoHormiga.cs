using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class GastoHormiga : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? TramiteId { get; set; }
    public Guid? ClienteId { get; set; }
    public Guid? VehiculoId { get; set; }
    public Guid TipoGastoId { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "MXN";
    public decimal? GastoUsd { get; set; }
    public string? ComprobanteUrl { get; set; }
    public bool SeCargaAlCliente { get; set; }
    public DateTime FechaGasto { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public Guid RegistradoPor { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Tramite? Tramite { get; set; }
    public Cliente? Cliente { get; set; }
    public Vehiculo? Vehiculo { get; set; }
    public TipoGastoHormiga TipoGasto { get; set; } = null!;
}
