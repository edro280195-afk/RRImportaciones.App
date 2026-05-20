using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Cliente : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apodo { get; set; } = string.Empty;
    public string? NombreCompleto { get; set; }
    public string? Rfc { get; set; }
    public string? Email { get; set; }
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string? Procedencia { get; set; }
    public string? Notas { get; set; }
    public string TipoPersona { get; set; } = "FISICA";
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public bool Activo { get; set; } = true;
    public DateTime? DeletedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public ICollection<Vehiculo> Vehiculos { get; set; } = new List<Vehiculo>();
    public ICollection<Tramite> Tramites { get; set; } = new List<Tramite>();
    public ICollection<Cotizacion> Cotizaciones { get; set; } = new List<Cotizacion>();
}
