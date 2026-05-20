namespace RR.Application.DTOs.Vehiculos;

public class UpdateInventarioRequest
{
    public string? UbicacionActual { get; set; }
    public bool CumplioRequisitos { get; set; }
    public bool TieneSelloAduanal { get; set; }
    public DateTime? FechaPedimentoProforma { get; set; }
}
