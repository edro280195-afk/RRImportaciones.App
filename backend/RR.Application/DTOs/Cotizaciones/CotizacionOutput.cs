namespace RR.Application.DTOs.Cotizaciones;

public class CotizacionOutput
{
    public Guid? Id { get; set; }
    public string? Folio { get; set; }
    public Guid? TramiteId { get; set; }
    public string? TramiteNumero { get; set; }
    public Guid? ClienteId { get; set; }
    public string? ClienteNombre { get; set; }
    public string? ClienteApodo { get; set; }
    public string? ClienteTelefono { get; set; }
    public string? ClienteEmail { get; set; }
    public string Estado { get; set; } = "BORRADOR";
    public string? Vin { get; set; }
    public Guid? MarcaId { get; set; }
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public int? Anno { get; set; }
    public int? CilindradaCm3 { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Fraccion { get; set; } = string.Empty;
    public string RegimenFiscal { get; set; } = string.Empty;
    /// <summary>
    /// Solo para régimen AMPARO: categoría efectivamente usada para la búsqueda del tabulador
    /// ("NORMAL" o "LUJO"). Null para otros regímenes.
    /// </summary>
    /// <summary>Categoría AMPARO resuelta (4_CIL, 6_CIL, 8_CIL, PICKUP, LUJO)</summary>
    public string? CategoriaAmparoUsada { get; set; }
    /// <summary>Override raw del usuario ("LUJO" o null) para preservar en recálculos</summary>
    public string? CategoriaAmparoOverride { get; set; }
    public Guid? PrecioEstimadoSeleccionadoId { get; set; }
    public string FuentePrecio { get; set; } = string.Empty;
    public string? PrecioCatalogoMarca { get; set; }
    public string? PrecioCatalogoModelo { get; set; }
    public string? PrecioCatalogoOrigen { get; set; }
    public int? PrecioAntiguedadAnios { get; set; }
    public string? PrecioMatchTipo { get; set; }
    public int? PrecioMatchScore { get; set; }
    public string? PrecioAdvertencia { get; set; }
    public decimal? ValorAduanaUsd { get; set; }
    public decimal ValorPesos { get; set; }
    public decimal? TipoCambioReferencia { get; set; }
    public decimal? TipoCambioAplicado { get; set; }
    public string? TipoCambioContexto { get; set; }
    public string? TipoCambioNota { get; set; }
    public bool TipoCambioStale { get; set; }
    public decimal IgiPorcentaje { get; set; }
    public decimal Igi { get; set; }
    public decimal Dta { get; set; }
    public decimal Iva { get; set; }
    public decimal Prev { get; set; }
    public decimal Prv { get; set; }
    public decimal ImpuestosTotal { get; set; }
    public decimal Honorarios { get; set; }
    public decimal CargoExpress { get; set; }
    public decimal Total { get; set; }
    public string? Notas { get; set; }
    public DateTime? FechaExpiracion { get; set; }
    public DateTime? FechaEnvio { get; set; }
    public string? EnviadoPor { get; set; }
    public string? EnviadoA { get; set; }
}
