namespace RR.Application.DTOs.Reportes;

public class EstadoCuentaClienteDto
{
    public Guid ClienteId { get; set; }
    public string Apodo { get; set; } = "";
    public string? NombreCompleto { get; set; }
    public string? Telefono { get; set; }
    public decimal TotalFacturado { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public List<TramiteEstadoCuentaDto> Tramites { get; set; } = [];
}

public class TramiteEstadoCuentaDto
{
    public Guid Id { get; set; }
    public string NumeroConsecutivo { get; set; } = "";
    public string? Vehiculo { get; set; }
    public string EstadoLogistico { get; set; } = "";
    public decimal CobroTotal { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal Saldo { get; set; }
    public DateTime FechaCreacion { get; set; }
}
