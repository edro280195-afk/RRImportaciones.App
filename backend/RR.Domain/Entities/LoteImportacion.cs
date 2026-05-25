using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class LoteImportacion : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string FolioLote { get; set; } = string.Empty;
    public Guid ClienteId { get; set; }
    public Guid? AduanaId { get; set; }
    public Guid? TramitadorId { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public string Estado { get; set; } = "EN_PROGRESO";
    public DateTime? FechaCruce { get; set; }
    public string? Notas { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaModificacion { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Cliente Cliente { get; set; } = null!;
    public Aduana? Aduana { get; set; }
    public Tramitador? Tramitador { get; set; }
    public ICollection<Tramite> Tramites { get; set; } = new List<Tramite>();
}
