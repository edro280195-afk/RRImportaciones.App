namespace RR.Application.DTOs.Tramites;

public class TramiteDocumentoDto
{
    public Guid Id { get; set; }
    public Guid TramiteId { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string EstadoLogistico { get; set; } = "PENDIENTE";
    public bool EsRequerido { get; set; }
    public string? ArchivoUrl { get; set; }
    public string? Notas { get; set; }
    public DateTime? FechaRecibido { get; set; }
    public DateTime? FechaValidado { get; set; }
}

public class GuardarDocumentoTramiteRequest
{
    public string TipoDocumento { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string EstadoLogistico { get; set; } = "RECIBIDO";
    public bool EsRequerido { get; set; } = true;
    public string? ArchivoUrl { get; set; }
    public string? Notas { get; set; }
}
