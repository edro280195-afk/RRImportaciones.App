namespace RR.Application.DTOs.Vehiculos;

public class VehiculoListDto
{
    public Guid Id { get; set; }
    public string Vin { get; set; } = string.Empty;
    public string? VinCorto { get; set; }
    public string? MarcaNombre { get; set; }
    public string? ModeloNombre { get; set; }
    public int? Anno { get; set; }
    public string? ClienteApodo { get; set; }
    public DateTime? FechaIngresoPatio { get; set; }
    public string? UbicacionActual { get; set; }
    public bool TieneTramiteActivo { get; set; }
    public bool CumplioRequisitos { get; set; }
    public bool TieneSelloAduanal { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string[] FotosUrls { get; set; } = [];
}
