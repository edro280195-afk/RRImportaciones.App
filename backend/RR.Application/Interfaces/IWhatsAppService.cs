namespace RR.Application.Interfaces;

public interface IWhatsAppService
{
    /// <summary>True si el servicio está configurado y habilitado para enviar.</summary>
    bool IsEnabled { get; }

    /// <summary>Notifica a los administradores (lista configurada) que llegó una pre-inspección.</summary>
    Task EnviarPreInspeccionAdminsAsync(
        Guid tareaCampoId,
        string vehiculoResumen,
        string? vin,
        string? operadorNombre,
        string? clienteSugerido,
        CancellationToken cancellationToken = default);

    /// <summary>Envía al cliente el enlace de su cotización.</summary>
    Task EnviarCotizacionClienteAsync(
        string clienteTelefono,
        string clienteNombre,
        Guid cotizacionId,
        string folioCotizacion,
        decimal totalCotizacion,
        string linkCotizacion,
        CancellationToken cancellationToken = default);

    /// <summary>Notifica al yardero que el admin solicita fotos adicionales.</summary>
    Task EnviarSolicitudFotosYarderoAsync(
        string operadorTelefono,
        string vehiculoResumen,
        string mensaje,
        Guid tareaCampoId,
        CancellationToken cancellationToken = default);
}
