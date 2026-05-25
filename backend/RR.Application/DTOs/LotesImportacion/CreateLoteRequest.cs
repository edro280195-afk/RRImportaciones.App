namespace RR.Application.DTOs.LotesImportacion;

public class CreateLoteRequest
{
    public Guid ClienteId { get; set; }
    public Guid? AduanaId { get; set; }
    public Guid? TramitadorId { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public string? Notas { get; set; }
    public List<LoteVehiculoItemRequest> Vehiculos { get; set; } = [];
}

public class LoteVehiculoItemRequest
{
    public Guid? VehiculoId { get; set; }
    public string? Vin { get; set; }
    public Guid? MarcaId { get; set; }
    public string? MarcaTexto { get; set; }
    public string? Modelo { get; set; }
    public int? Anno { get; set; }
    public int? CilindradaCm3 { get; set; }
    public string? Categoria { get; set; }
    public string? Color { get; set; }
    public decimal? ValorFactura { get; set; }
    public string Moneda { get; set; } = "USD";
    public string? DescripcionMercancia { get; set; }
    public decimal CobroTotal { get; set; }
    public decimal Honorarios { get; set; }
    public string? TipoTramite { get; set; }
    public string? Notas { get; set; }
}

public class UpdateLoteRequest
{
    public Guid? AduanaId { get; set; }
    public Guid? TramitadorId { get; set; }
    public string? TipoTramite { get; set; }
    public string? Estado { get; set; }
    public DateTime? FechaCruce { get; set; }
    public string? Notas { get; set; }
}

public class AgregarVehiculoALoteRequest : LoteVehiculoItemRequest
{
}
