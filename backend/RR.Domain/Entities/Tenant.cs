namespace RR.Domain.Entities;

public class Tenant
{
    public Guid Id { get; set; }
    public string NombreComercial { get; set; } = string.Empty;
    public string RazonSocial { get; set; } = string.Empty;
    public string? Rfc { get; set; }
    public string? Email { get; set; }
    public string? Telefono { get; set; }
    public string? LogoUrl { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public string? Configuracion { get; set; }

    public ICollection<User> Usuarios { get; set; } = new List<User>();
    public ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();
    public ICollection<Vehiculo> Vehiculos { get; set; } = new List<Vehiculo>();
    public ICollection<Tramite> Tramites { get; set; } = new List<Tramite>();
    public ICollection<Cotizacion> Cotizaciones { get; set; } = new List<Cotizacion>();
    public ICollection<Pago> Pagos { get; set; } = new List<Pago>();
}
