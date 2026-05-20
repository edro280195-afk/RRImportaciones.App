using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Cotizacion : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? TramiteId { get; set; }
    public Guid? ClienteId { get; set; }
    public string? Folio { get; set; }
    public string? Vin { get; set; }
    public Guid? MarcaId { get; set; }
    public string? MarcaTexto { get; set; }
    public string? Modelo { get; set; }
    public int? AnnoModelo { get; set; }
    public int? CilindradaCm3 { get; set; }
    public string? Categoria { get; set; }
    public string? Fraccion { get; set; }
    public string? RegimenFiscal { get; set; }
    public string? FuentePrecio { get; set; }
    public string? PrecioCatalogoMarca { get; set; }
    public string? PrecioCatalogoModelo { get; set; }
    public string? PrecioCatalogoOrigen { get; set; }
    public int? PrecioAntiguedadAnios { get; set; }
    public string? PrecioMatchTipo { get; set; }
    public int? PrecioMatchScore { get; set; }
    public string? PrecioAdvertencia { get; set; }
    public decimal? ValorAduanaUsd { get; set; }
    public decimal? ValorPesos { get; set; }
    public decimal? TipoCambioReferencia { get; set; }
    public decimal? TipoCambioAplicado { get; set; }
    public string? TipoCambioContexto { get; set; }
    public string? TipoCambioNota { get; set; }
    public decimal? IgiPorcentaje { get; set; }
    public decimal? Igi { get; set; }
    public decimal? Dta { get; set; }
    public decimal? Iva { get; set; }
    public decimal? Prev { get; set; }
    public decimal? Prv { get; set; }
    public decimal? CargoExpress { get; set; }
    public DateTime? FechaExpiracion { get; set; }
    public DateTime? FechaEnvio { get; set; }
    public string? EnviadoPor { get; set; }
    public string? EnviadoA { get; set; }
    public string? MotivoRechazo { get; set; }
    public decimal? TotalHonorarios { get; set; }
    public Guid? PrecioEstimadoSeleccionadoId { get; set; }
    public string? CategoriaAmparoSeleccionada { get; set; }
    public decimal? TotalGastos { get; set; }
    public decimal? TotalContribuciones { get; set; }
    public decimal? TotalGeneral { get; set; }
    public string? EstadoLogistico { get; set; } = "BORRADOR";
    public string? Notas { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaModificacion { get; set; }
    public Guid CreadoPor { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Tramite? Tramite { get; set; }
    public Cliente? Cliente { get; set; }
    public Marca? Marca { get; set; }
    public ICollection<CotizacionDetalle> Detalles { get; set; } = new List<CotizacionDetalle>();
}
