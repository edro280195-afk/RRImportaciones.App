namespace RR.Application.DTOs.Tramites;

public class UpdateTramiteRequest
{
    public Guid? AduanaId { get; set; }
    public Guid? TramitadorId { get; set; }
    public string? Notas { get; set; }
}
