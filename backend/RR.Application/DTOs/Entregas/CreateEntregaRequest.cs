namespace RR.Application.DTOs.Entregas;

public class CreateEntregaRequest
{
    public Guid? ResponsableCampoId { get; set; }
    public Guid? RecibidoPorPartnerId { get; set; }
    public string? Descripcion { get; set; }
    public string? UbicacionEntrega { get; set; }
    public string[]? DocumentosEntregados { get; set; }
    public string? NombreRecibe { get; set; }
    public string? FotoEvidenciaUrl { get; set; }
    public string? FirmaBase64 { get; set; }
}
