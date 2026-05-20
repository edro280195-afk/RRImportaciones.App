using RR.Application.DTOs.PartnersExternos;
using RR.Application.DTOs.PersonalCampo;

namespace RR.Application.DTOs.Tramites;

public class TramiteDetailDto
{
    public Guid Id { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public Guid? ClienteId { get; set; }
    public string? ClienteApodo { get; set; }
    public string? ClienteNombre { get; set; }
    public Guid? VehiculoId { get; set; }
    public string? VehiculoVin { get; set; }
    public string? VehiculoVinCorto { get; set; }
    public string? VehiculoMarca { get; set; }
    public string? VehiculoModelo { get; set; }
    public int? VehiculoAnno { get; set; }
    public string? DescripcionMercancia { get; set; }
    public Guid? AduanaId { get; set; }
    public string? AduanaNombre { get; set; }
    public Guid? TramitadorId { get; set; }
    public string? TramitadorNombre { get; set; }
    public Guid? CotizacionOrigenId { get; set; }
    public string? CotizacionOrigenFolio { get; set; }
    public DateTime? CotizacionFecha { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public string EstadoLogistico { get; set; } = string.Empty;
    public decimal CobroTotal { get; set; }
    public decimal Honorarios { get; set; }
    public decimal CargoExpress { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public string? Notas { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaEstadoActual { get; set; }
    public int DiasEnEstado { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaModificacion { get; set; }

    public List<TramiteEventoDto> Eventos { get; set; } = [];
    public List<TramitePedimentoDto> Pedimentos { get; set; } = [];
    public List<TramitePagoDto> Pagos { get; set; } = [];
    public List<TramiteGastoDto> GastosHormiga { get; set; } = [];
    public List<TramiteEntregaDto> Entregas { get; set; } = [];
    public List<TramiteDocumentoDto> Documentos { get; set; } = [];
    public List<TramiteTareaCampoDto> TareasCampo { get; set; } = [];
}

public class TramiteEventoDto
{
    public Guid Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string? EstadoAnterior { get; set; }
    public string? EstadoNuevo { get; set; }
    public string Contenido { get; set; } = string.Empty;
    public string? FotoUrl { get; set; }
    public DateTime FechaEvento { get; set; }
    public string? CreadoPorNombre { get; set; }
}

public class TramitePedimentoDto
{
    public Guid Id { get; set; }
    public string NumeroPedimento { get; set; } = string.Empty;
    public string Tipo { get; set; } = "ORIGINAL";
    public DateTime? FechaEntrada { get; set; }
    public string? Patente { get; set; }
    public decimal? Igi { get; set; }
    public decimal? Dta { get; set; }
    public decimal? Iva { get; set; }
    public decimal? TotalContribuciones { get; set; }
    public string? EstadoLogistico { get; set; }
    public string? MotivoRectificacion { get; set; }
    public string? ResponsableError { get; set; }
    public decimal CobroAdicional { get; set; }
}

public class TramitePagoDto
{
    public Guid Id { get; set; }
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "MXN";
    public decimal? TipoCambio { get; set; }
    public string Metodo { get; set; } = string.Empty;
    public string? Banco { get; set; }
    public string? Referencia { get; set; }
    public string? FolioRecibo { get; set; }
    public string? ReciboPagoUrl { get; set; }
    public DateTime FechaPago { get; set; }
    public bool Verificado { get; set; }
}

public class TramiteGastoDto
{
    public Guid Id { get; set; }
    public string TipoGasto { get; set; } = string.Empty;
    public string Concepto { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "MXN";
    public bool SeCargaAlCliente { get; set; }
    public string? ComprobanteUrl { get; set; }
    public DateTime FechaGasto { get; set; }
}

public class TramiteEntregaDto
{
    public Guid Id { get; set; }
    public string? ResponsableCampoNombre { get; set; }
    public string? RecibidoPorPartnerNombre { get; set; }
    public string? Descripcion { get; set; }
    public string? UbicacionEntrega { get; set; }
    public string[] DocumentosEntregados { get; set; } = [];
    public string? NombreRecibe { get; set; }
    public string? FotoEvidenciaUrl { get; set; }
    public string? FirmaBase64 { get; set; }
    public DateTime FechaEntrega { get; set; }
}

public class TramiteTareaCampoDto
{
    public Guid Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string EstadoLogistico { get; set; } = string.Empty;
    public string? PersonalCampoNombre { get; set; }
    public string? Ubicacion { get; set; }
    public string? VinConfirmado { get; set; }
    public string[] FotosUrls { get; set; } = [];
    public string? Incidencia { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaTomada { get; set; }
    public DateTime? FechaCompletada { get; set; }
}
