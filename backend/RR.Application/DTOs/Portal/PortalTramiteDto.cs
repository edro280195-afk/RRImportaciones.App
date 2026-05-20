namespace RR.Application.DTOs.Portal;

public class PortalTramiteDto
{
    public Guid Id { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public string EstadoLogistico { get; set; } = string.Empty;
    public string EstatusCliente { get; set; } = string.Empty;
    public string EstatusDescripcion { get; set; } = string.Empty;
    public decimal Progreso { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaEstadoActual { get; set; }
    public string ClienteNombre { get; set; } = string.Empty;
    public string VehiculoResumen { get; set; } = string.Empty;
    public string? VehiculoVinCorto { get; set; }
    public string? VehiculoMarca { get; set; }
    public string? VehiculoModelo { get; set; }
    public int? VehiculoAnno { get; set; }
    public string? VehiculoVin { get; set; }
    public string? AduanaNombre { get; set; }
    public string? TipoTramite { get; set; }
    public PortalMoneySummaryDto PagosResumen { get; set; } = new();
    public List<PortalTimelineItemDto> Timeline { get; set; } = [];
    public List<PortalPagoDto> Pagos { get; set; } = [];
    public List<PortalDocumentoDto> Documentos { get; set; } = [];
    public PortalContactDto Contacto { get; set; } = new();
    public PortalEntregaDto? Entrega { get; set; }
}

public class PortalEntregaDto
{
    public DateTime Fecha { get; set; }
    public string Ubicacion { get; set; } = string.Empty;
    public string NombreRecibe { get; set; } = string.Empty;
    public string[] DocumentosEntregados { get; set; } = [];
    public string? FotoEvidenciaUrl { get; set; }
    public string? FirmaBase64 { get; set; }
}

public class PortalMoneySummaryDto
{
    public decimal Total { get; set; }
    public decimal Pagado { get; set; }
    public decimal Pendiente { get; set; }
    public decimal PendienteVerificacion { get; set; }
    public decimal CubiertoPorRr { get; set; }
}

public class PortalTimelineItemDto
{
    public Guid Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public bool Completado { get; set; } = true;
    public string? FotoUrl { get; set; }
}

public class PortalPagoDto
{
    public Guid Id { get; set; }
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "MXN";
    public string Metodo { get; set; } = string.Empty;
    public string? Banco { get; set; }
    public string? Referencia { get; set; }
    public DateTime FechaPago { get; set; }
    public bool Verificado { get; set; }
}

public class PortalDocumentoDto
{
    public string Tipo { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string? Url { get; set; }
    public DateTime? Fecha { get; set; }
}

public class PortalContactDto
{
    public string Nombre { get; set; } = "R&R Importaciones";
    public string Email { get; set; } = "ricardordz@importadoraryr.com";
    public string Telefono { get; set; } = "(867) 722 1596";
    public string WhatsApp { get; set; } = "528677221596";
}
