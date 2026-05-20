using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class Tramite : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public string? NumeroLegacy { get; set; }
    public Guid? ClienteId { get; set; }
    public Guid? VehiculoId { get; set; }
    public Guid? AduanaId { get; set; }
    public Guid? TramitadorId { get; set; }
    public Guid? CotizacionOrigenId { get; set; }
    public string? DescripcionMercancia { get; set; }
    public string TipoTramite { get; set; } = "NORMAL";
    public string EstadoLogistico { get; set; } = Enums.EstadoLogistico.PENDIENTE;
    public string EstadoFinanciero { get; set; } = Enums.EstadoFinanciero.ADEUDO_TOTAL;
    public decimal CobroTotal { get; set; }
    public decimal Honorarios { get; set; }
    public decimal CargoExpress { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaEstadoActual { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    public string? Notas { get; set; }
    public string? AsignadoA { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaModificacion { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Cliente? Cliente { get; set; }
    public Vehiculo? Vehiculo { get; set; }
    public Aduana? Aduana { get; set; }
    public Tramitador? Tramitador { get; set; }
    public Cotizacion? CotizacionOrigen { get; set; }
    public ICollection<Pedimento> Pedimentos { get; set; } = new List<Pedimento>();
    public ICollection<Cotizacion> Cotizaciones { get; set; } = new List<Cotizacion>();
    public ICollection<Pago> Pagos { get; set; } = new List<Pago>();
    public ICollection<Evento> Eventos { get; set; } = new List<Evento>();
    public ICollection<GastoHormiga> GastosHormiga { get; set; } = new List<GastoHormiga>();
    public ICollection<Entrega> Entregas { get; set; } = new List<Entrega>();
    public ICollection<TramiteDocumento> Documentos { get; set; } = new List<TramiteDocumento>();
    public ICollection<TareaCampo> TareasCampo { get; set; } = new List<TareaCampo>();
}
