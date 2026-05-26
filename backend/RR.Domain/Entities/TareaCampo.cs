using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class TareaCampo : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? TramiteId { get; set; }
    public Guid? PersonalCampoId { get; set; }
    public string Tipo { get; set; } = "FOTOS_YARDA";
    public string EstadoLogistico { get; set; } = "ABIERTA";
    public string? Ubicacion { get; set; }
    public string? VinConfirmado { get; set; }
    public string[] FotosUrls { get; set; } = [];
    public string? Incidencia { get; set; }
    /// <summary>Descripción libre del vehículo para pre-inspecciones sin trámite.</summary>
    public string? DescripcionVehiculo { get; set; }
    /// <summary>Nombre del cliente o propietario para pre-inspecciones sin trámite.</summary>
    public string? ClienteNombreLibre { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaTomada { get; set; }
    public DateTime? FechaCompletada { get; set; }
    public Guid CreadoPor { get; set; }
    public Guid? TomadaPorUsuarioId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Tramite? Tramite { get; set; }
    public PersonalCampo? PersonalCampo { get; set; }
    public User? UsuarioCampo { get; set; }
}
