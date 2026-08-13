using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

/// <summary>
/// Archivo asociado a una captura de campo. El identificador del cliente permite
/// repetir una subida sin crear una segunda referencia para el mismo archivo.
/// </summary>
public class TareaCampoMedia : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid TareaCampoId { get; set; }
    public string ClientMediaId { get; set; } = string.Empty;
    public string Tipo { get; set; } = "FOTO";
    public string Url { get; set; } = string.Empty;
    public string NombreArchivo { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long TamanoBytes { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public TareaCampo TareaCampo { get; set; } = null!;
}
