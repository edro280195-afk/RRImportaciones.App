namespace RR.Application.DTOs.Clientes;

public class CreateClienteRequest
{
    public string Apodo { get; set; } = string.Empty;
    public string? NombreCompleto { get; set; }
    public string? Rfc { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Procedencia { get; set; }
    public string? Direccion { get; set; }
    public string? Notas { get; set; }
}
