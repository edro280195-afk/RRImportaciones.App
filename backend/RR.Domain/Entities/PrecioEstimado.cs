namespace RR.Domain.Entities;

public class PrecioEstimado
{
    public Guid Id { get; set; }
    public Guid FraccionId { get; set; }
    public Guid? MarcaId { get; set; }
    public string Categoria { get; set; } = "AUTOMOVIL";
    public string? Inciso { get; set; }
    public string MarcaTexto { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public bool EsGenerico { get; set; }
    public string? HojaOrigen { get; set; }
    public int? Anno { get; set; }
    public decimal? PrecioMin { get; set; }
    public decimal? PrecioMax { get; set; }

    public FraccionArancelaria Fraccion { get; set; } = null!;
    public Marca? Marca { get; set; }
    public ICollection<PrecioPorAntiguedad> PreciosPorAntiguedad { get; set; } = new List<PrecioPorAntiguedad>();
}
