using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Vehiculo : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? ClienteId { get; set; }
    public string Estado { get; set; } = "PENDIENTE_DE_TRAMITE";
    public string[] FotosUrls { get; set; } = [];
    public string Vin { get; set; } = string.Empty;
    public string? VinCorto { get; set; }
    public Guid? MarcaId { get; set; }
    public Guid? ModeloId { get; set; }
    public int? Anno { get; set; }
    public int? CilindradaCm3 { get; set; }
    public string? Categoria { get; set; }
    public string? Color { get; set; }
    public decimal? ValorFactura { get; set; }
    public string Moneda { get; set; } = "USD";
    public string? NumMotor { get; set; }
    public string? NumSerie { get; set; }
    public Guid? FraccionArancelariaId { get; set; }
    public string? UbicacionActual { get; set; }
    public bool CumplioRequisitos { get; set; }
    public bool TieneSelloAduanal { get; set; }
    public DateTime? FechaPedimentoProforma { get; set; }
    public DateTime? FechaIngresoPatio { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Cliente? Cliente { get; set; }
    public Marca? Marca { get; set; }
    public Modelo? Modelo { get; set; }
    public FraccionArancelaria? FraccionArancelaria { get; set; }
    public ICollection<Tramite> Tramites { get; set; } = new List<Tramite>();
}
