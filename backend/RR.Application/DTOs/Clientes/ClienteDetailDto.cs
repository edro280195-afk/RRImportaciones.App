namespace RR.Application.DTOs.Clientes;

public class ClienteDetailDto : ClienteListDto
{
    public string? Notas { get; set; }
    public string? Rfc { get; set; }
    public string? Direccion { get; set; }
    public List<VehiculoSimpleDto> Vehiculos { get; set; } = [];
    public List<TramiteSimpleDto> UltimosTramites { get; set; } = [];
    public decimal SaldoPendiente { get; set; }
}

public class VehiculoSimpleDto
{
    public Guid Id { get; set; }
    public string Vin { get; set; } = string.Empty;
    public string? MarcaNombre { get; set; }
    public string? ModeloNombre { get; set; }
    public int? Anno { get; set; }
}

public class TramiteSimpleDto
{
    public Guid Id { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public string EstadoLogistico { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; }
}
