using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Entrega : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid TramiteId { get; set; }
    public Guid? ResponsableCampoId { get; set; }
    public Guid? RecibidoPorPartnerId { get; set; }
    public string? Descripcion { get; set; }
    public string? UbicacionEntrega { get; set; }
    public string[] DocumentosEntregados { get; set; } = [];
    public string? NombreRecibe { get; set; }
    public string? FotoEvidenciaUrl { get; set; }
    public string? FirmaBase64 { get; set; }
    public DateTime FechaEntrega { get; set; } = DateTime.UtcNow;
    public Guid CreadoPor { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Tramite Tramite { get; set; } = null!;
    public PersonalCampo? ResponsableCampo { get; set; }
    public PartnerExterno? RecibidoPorPartner { get; set; }
}
