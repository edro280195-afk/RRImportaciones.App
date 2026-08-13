namespace RR.Application.DTOs.Entregas;

public class TareaEntregaDto
{
    public Guid Id { get; set; }
    public Guid TramiteId { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public string? ClienteNombre { get; set; }
    public string VehiculoResumen { get; set; } = string.Empty;
    public string? Vin { get; set; }
    public string? VinCorto { get; set; }
    public Guid? ChoferUserId { get; set; }
    public string? ChoferNombre { get; set; }
    public string Estado { get; set; } = "PENDIENTE";
    public string[] FotosUrls { get; set; } = [];
    public string? UbicacionEntrega { get; set; }
    public string? NombreRecibe { get; set; }
    public string? FirmaBase64 { get; set; }
    public string? Incidencia { get; set; }
    public string? NotasChofer { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaTomada { get; set; }
    public DateTime? FechaEntregado { get; set; }
}

public class CrearTareaEntregaRequest
{
    public Guid TramiteId { get; set; }
    public Guid? ChoferUserId { get; set; }
    public string? UbicacionEntrega { get; set; }
    public string? NotasChofer { get; set; }
}

public class AsignarVehiculoEntregaRequest
{
    public Guid VehiculoId { get; set; }
    public Guid? ChoferUserId { get; set; }
    public string? UbicacionEntrega { get; set; }
    public string? NotasChofer { get; set; }
}

public class EntregaLinkResponseDto
{
    public TareaEntregaDto Tarea { get; set; } = new();
    public string Enlace { get; set; } = string.Empty;
    public bool TieneChoferAsignado { get; set; }
    public bool ChoferTienePin { get; set; }
}

public class EntregaAccesoDto
{
    public Guid TareaId { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public string VehiculoResumen { get; set; } = string.Empty;
    public string? Vin { get; set; }
    public string Estado { get; set; } = string.Empty;
    public bool TieneChoferAsignado { get; set; }
    public string? ChoferNombre { get; set; }
    public bool ChoferTienePin { get; set; }
    public List<RR.Application.DTOs.Auth.CampoUserDto> UsuariosDisponibles { get; set; } = [];
}

public class TomarTareaEntregaRequest { }

public class RegistrarEntregaRequest
{
    public string[] FotosUrls { get; set; } = [];
    public string? UbicacionEntrega { get; set; }
    public string? NombreRecibe { get; set; }
    public string? FirmaBase64 { get; set; }
    public string? NotasChofer { get; set; }
    public string? Incidencia { get; set; }
}

public class VehiculoEntregaLookupDto
{
    public Guid VehiculoId { get; set; }
    public string Vin { get; set; } = string.Empty;
    public string? VinCorto { get; set; }
    public string VehiculoResumen { get; set; } = string.Empty;
    public string? ClienteNombre { get; set; }
    public string? UbicacionActual { get; set; }
    public Guid? TramiteId { get; set; }
    public string? NumeroConsecutivo { get; set; }
    public string? EstadoTramite { get; set; }
    public bool YaEntregado { get; set; }
}

public class RegistrarEntregaVehiculoRequest
{
    public Guid? VehiculoId { get; set; }
    public string? Vin { get; set; }
    public string? UbicacionEntrega { get; set; }
    public string? NombreRecibe { get; set; }
    public string? NotasChofer { get; set; }
}
