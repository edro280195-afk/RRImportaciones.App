namespace RR.Application.DTOs.Clientes;

public class ClienteTemporalDto
{
    public Guid Id { get; set; }
    public string NombrePropuesto { get; set; } = string.Empty;
    public string Estado { get; set; } = "PENDIENTE";
    public Guid? TareaCampoId { get; set; }
    public Guid? VehiculoId { get; set; }
    public Guid? ClienteId { get; set; }
    public string? Vin { get; set; }
    public string? VehiculoResumen { get; set; }
    public string? Ubicacion { get; set; }
    public string? OperadorNombre { get; set; }
    public string? MotivoRechazo { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaRevision { get; set; }
}

public class AprobarClienteTemporalRequest
{
    public Guid? ClienteExistenteId { get; set; }
    public string Apodo { get; set; } = string.Empty;
    public string? NombreCompleto { get; set; }
    public string? Rfc { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Procedencia { get; set; }
    public string? Direccion { get; set; }
    public string? Notas { get; set; }
}

public class RechazarClienteTemporalRequest
{
    public string? Motivo { get; set; }
}
