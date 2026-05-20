using RR.Application.DTOs.Common;

namespace RR.Application.DTOs.Pagos;

public class PagoVerificarResponse
{
    public bool TramiteCobrado { get; set; }
    public string? Mensaje { get; set; }
}
