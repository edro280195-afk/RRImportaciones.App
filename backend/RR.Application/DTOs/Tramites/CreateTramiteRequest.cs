namespace RR.Application.DTOs.Tramites;

public class CreateTramiteRequest
{
    public Guid ClienteId { get; set; }
    public Guid? VehiculoId { get; set; }
    public string? DescripcionMercancia { get; set; }
    public Guid? AduanaId { get; set; }
    public Guid? TramitadorId { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public decimal CobroTotal { get; set; }
    public decimal Honorarios { get; set; }
    public string? Notas { get; set; }
}
