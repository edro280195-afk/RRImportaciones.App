namespace RR.Application.DTOs.Pagos;

public class BulkVerificarPagosRequest
{
    public List<Guid> PagoIds { get; set; } = [];
}
