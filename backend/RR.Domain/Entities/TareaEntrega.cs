using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class TareaEntrega : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid TramiteId { get; set; }
    public Guid? ChoferUserId { get; set; }
    /// <summary>PENDIENTE | EN_CAMINO | ENTREGADO | INCIDENCIA</summary>
    public string Estado { get; set; } = "PENDIENTE";
    public string[] FotosUrls { get; set; } = [];
    public string? UbicacionEntrega { get; set; }
    public string? NombreRecibe { get; set; }
    public string? FirmaBase64 { get; set; }
    public string? Incidencia { get; set; }
    public string? NotasChofer { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaTomada { get; set; }
    public DateTime? FechaEntregado { get; set; }
    public Guid CreadoPor { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Tramite Tramite { get; set; } = null!;
    public User? Chofer { get; set; }
}
