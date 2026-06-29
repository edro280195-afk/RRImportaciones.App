namespace RR.Application.DTOs.Cotizaciones;

public class CotizacionInput
{
    public string? Vin { get; set; }
    public Guid? MarcaId { get; set; }
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public int? Anno { get; set; }
    public int? CilindradaCm3 { get; set; }
    public string? TipoVehiculo { get; set; }
    public decimal? ValorAduanaUsdOverride { get; set; }

    /// <summary>
    /// Cuando el admin selecciona manualmente una entrada del catálogo en el paso de
    /// candidatos, se envía este ID para saltarse la búsqueda automática.
    /// </summary>
    public Guid? PrecioEstimadoIdOverride { get; set; }

    /// <summary>
    /// Para régimen AMPARO: categoría elegida por el admin ("NORMAL" | "LUJO").
    /// LUJO nunca se auto-detecta — siempre requiere selección explícita del operador.
    /// Si no se proporciona, se usa "NORMAL" por defecto.
    /// </summary>
    public string? CategoriaAmparoOverride { get; set; }

    public decimal TcMargen { get; set; } = 0.30m;
    public decimal? TipoCambioOverride { get; set; }
    public string? TipoCambioContexto { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public decimal? HonorariosOverride { get; set; }
}
