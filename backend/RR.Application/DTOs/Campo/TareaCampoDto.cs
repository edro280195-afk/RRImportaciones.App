namespace RR.Application.DTOs.Campo;

public class TareaCampoDto
{
    public Guid Id { get; set; }
    public Guid? TramiteId { get; set; }
    public Guid? VehiculoId { get; set; }
    public Guid? ClienteId { get; set; }
    public string? NumeroConsecutivo { get; set; }
    public string? ClienteNombre { get; set; }
    public string VehiculoResumen { get; set; } = string.Empty;
    public string? DescripcionVehiculo { get; set; }
    public string? ClienteNombreLibre { get; set; }
    public string? Vin { get; set; }
    public string? VinCorto { get; set; }
    public string Tipo { get; set; } = "FOTOS_YARDA";
    public string Estatus { get; set; } = "ABIERTA";
    public Guid? PersonalCampoId { get; set; }
    public string? PersonalCampoNombre { get; set; }
    public Guid? UsuarioCampoId { get; set; }
    public string? UsuarioCampoNombre { get; set; }
    public string? Ubicacion { get; set; }
    public string? VinConfirmado { get; set; }
    public string[] FotosUrls { get; set; } = [];
    public string? Incidencia { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaTomada { get; set; }
    public DateTime? FechaCompletada { get; set; }
}

public class CrearTareaCampoRequest
{
    public Guid TramiteId { get; set; }
    [Obsolete("Campo ahora usa el usuario autenticado. Mantener solo por compatibilidad con clientes antiguos.")]
    public Guid? PersonalCampoId { get; set; }
    public string Tipo { get; set; } = "FOTOS_YARDA";
    public string? Ubicacion { get; set; }
}

public class CrearPreInspeccionRequest
{
    public string? DescripcionVehiculo { get; set; }
    public string? ClienteNombreLibre { get; set; }
    public Guid? ClienteId { get; set; }
    public string? Ubicacion { get; set; }
    public string? NotasInternas { get; set; }
    public string? Vin { get; set; }
    public Guid? MarcaId { get; set; }
    public Guid? ModeloId { get; set; }
    public string? Modelo { get; set; }
    public int? Anno { get; set; }
}

public class TomarTareaCampoRequest
{
    [Obsolete("Campo ahora usa el usuario autenticado. Mantener solo por compatibilidad con clientes antiguos.")]
    public Guid? PersonalCampoId { get; set; }
}

public class CompletarTareaCampoRequest
{
    public string? Ubicacion { get; set; }
    public string? VinConfirmado { get; set; }
    public string[] FotosUrls { get; set; } = [];
    public string? Incidencia { get; set; }
}

public class VincularPreInspeccionRequest
{
    public Guid TramiteId { get; set; }
}

public class SolicitarFotosAdicionalesRequest
{
    public string Mensaje { get; set; } = string.Empty;
}

public class DescartarTareaCampoRequest
{
    public string? Motivo { get; set; }
}

public class BandejaCampoAdminFilters
{
    public DateTime? Desde { get; set; }
    public DateTime? Hasta { get; set; }
    public Guid? OperadorUsuarioId { get; set; }
    public string? Ubicacion { get; set; }
}
