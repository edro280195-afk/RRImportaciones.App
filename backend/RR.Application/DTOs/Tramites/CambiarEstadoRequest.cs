namespace RR.Application.DTOs.Tramites;

public class CambiarEstadoRequest
{
    public string NuevoEstado { get; set; } = string.Empty;
    public string? Notas { get; set; }
    public DateTime? FechaEvento { get; set; }
}
