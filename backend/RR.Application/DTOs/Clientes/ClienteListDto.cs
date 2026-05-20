namespace RR.Application.DTOs.Clientes;

public class ClienteListDto
{
    public Guid Id { get; set; }
    public string Apodo { get; set; } = string.Empty;
    public string? NombreCompleto { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Procedencia { get; set; }
    public int TotalVehiculos { get; set; }
    public int TotalTramites { get; set; }
    public decimal TotalFacturado { get; set; }
    public DateTime FechaRegistro { get; set; }
}
