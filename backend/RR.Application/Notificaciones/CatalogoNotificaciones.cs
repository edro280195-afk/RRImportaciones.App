using System.Globalization;
using RR.Application.Interfaces;

namespace RR.Application.Notificaciones;

/// <summary>
/// Todos los textos de notificación del sistema viven aquí. Así los servicios de
/// negocio no repiten strings y basta con abrir este archivo para saber qué le
/// llega al celular de la gente y con qué redacción.
/// </summary>
public static class CatalogoNotificaciones
{
    // ── Campo ─────────────────────────────────────────────────────────────

    /// <summary>Un yardero registró una unidad nueva en la yarda (pre-inspección).</summary>
    public static NotificacionEvento VehiculoRegistradoEnCampo(
        Guid tareaCampoId, string vehiculoResumen, string? vin, string operadorNombre, string? cliente)
    {
        var detalle = new List<string> { vehiculoResumen };
        if (!string.IsNullOrWhiteSpace(vin)) detalle.Add($"VIN {vin}");
        if (!string.IsNullOrWhiteSpace(cliente)) detalle.Add(cliente!);

        return new NotificacionEvento
        {
            Tipo = "campo_vehiculo_registrado",
            Titulo = "Vehículo nuevo en yarda",
            Mensaje = $"{operadorNombre} registró {string.Join(" · ", detalle)}",
            Url = $"/campo/bandeja-admin?tareaCampoId={tareaCampoId}",
            Severidad = "info",
            Destino = DestinoNotificacion.Admins,
            Tag = $"campo-registro-{tareaCampoId}",
            Data = new Dictionary<string, string> { ["tareaCampoId"] = tareaCampoId.ToString() },
        };
    }

    /// <summary>Un operador capturó un cliente fuera del catálogo oficial.</summary>
    public static NotificacionEvento ClienteTemporalCreado(
        Guid clienteTemporalId,
        Guid tareaCampoId,
        string vehiculoResumen,
        string? vin,
        string nombrePropuesto,
        string operadorNombre)
    {
        var detalle = string.IsNullOrWhiteSpace(vin)
            ? vehiculoResumen
            : $"{vehiculoResumen} · VIN {vin}";

        return new NotificacionEvento
        {
            Tipo = "cliente_temporal_creado",
            Titulo = "Cliente pendiente de validación",
            Mensaje = $"{operadorNombre} capturó “{nombrePropuesto}” para {detalle}",
            Url = $"/clientes?clienteTemporalId={clienteTemporalId}",
            Severidad = "warning",
            Destino = DestinoNotificacion.Admins,
            Tag = $"cliente-temporal-{clienteTemporalId}",
            Data = new Dictionary<string, string>
            {
                ["clienteTemporalId"] = clienteTemporalId.ToString(),
                ["tareaCampoId"] = tareaCampoId.ToString(),
            },
        };
    }

    /// <summary>El operador terminó la captura: fotos listas y unidad validada.</summary>
    public static NotificacionEvento CapturaCampoCompletada(
        Guid tareaCampoId, Guid? tramiteId, string referencia, string vehiculoResumen,
        int totalFotos, string operadorNombre)
        => new()
        {
            Tipo = "campo_fotos_subidas",
            Titulo = $"Fotos recibidas · {referencia}",
            Mensaje = $"{operadorNombre} subió {totalFotos} foto{(totalFotos == 1 ? "" : "s")} de {vehiculoResumen}",
            Url = tramiteId.HasValue
                ? $"/tramites/{tramiteId}"
                : $"/campo/bandeja-admin?tareaCampoId={tareaCampoId}",
            Severidad = "success",
            Destino = DestinoNotificacion.Admins,
            Tag = $"campo-fotos-{tareaCampoId}",
            Data = new Dictionary<string, string>
            {
                ["tareaCampoId"] = tareaCampoId.ToString(),
                ["totalFotos"] = totalFotos.ToString(CultureInfo.InvariantCulture),
            },
        };

    /// <summary>El operador reportó un problema con la unidad.</summary>
    public static NotificacionEvento IncidenciaCampo(
        Guid tareaCampoId, Guid? tramiteId, string referencia, string vehiculoResumen,
        string incidencia, string operadorNombre)
        => new()
        {
            Tipo = "campo_incidencia",
            Titulo = $"Incidencia en yarda · {referencia}",
            Mensaje = $"{operadorNombre} reportó en {vehiculoResumen}: {Resumir(incidencia, 110)}",
            Url = tramiteId.HasValue
                ? $"/tramites/{tramiteId}"
                : $"/campo/bandeja-admin?tareaCampoId={tareaCampoId}",
            Severidad = "warning",
            Destino = DestinoNotificacion.Admins,
            Tag = $"campo-incidencia-{tareaCampoId}",
            Data = new Dictionary<string, string> { ["tareaCampoId"] = tareaCampoId.ToString() },
        };

    /// <summary>Se abrió una tarea de campo: hay trabajo nuevo en la yarda.</summary>
    public static NotificacionEvento TareaCampoCreada(
        Guid tareaCampoId, string referencia, string vehiculoResumen, string? ubicacion)
        => new()
        {
            Tipo = "campo_tarea_creada",
            Titulo = "Tarea de campo nueva",
            Mensaje = $"{referencia} · {vehiculoResumen}" + (string.IsNullOrWhiteSpace(ubicacion) ? "" : $" · {ubicacion}"),
            Url = $"/campo/{tareaCampoId}/captura",
            Severidad = "info",
            Destino = DestinoNotificacion.Campo,
            Tag = $"campo-tarea-{tareaCampoId}",
            Data = new Dictionary<string, string> { ["tareaCampoId"] = tareaCampoId.ToString() },
        };

    /// <summary>Admin le pide más fotos a un operador concreto.</summary>
    public static NotificacionEvento FotosAdicionalesSolicitadas(
        Guid operadorUserId, Guid tareaCampoId, string vehiculoResumen, string mensaje)
        => new()
        {
            Tipo = "campo_fotos_solicitadas",
            Titulo = "Te piden más fotos",
            Mensaje = $"{vehiculoResumen} — {Resumir(mensaje, 110)}",
            Url = $"/campo/{tareaCampoId}/captura",
            Severidad = "warning",
            Destino = DestinoNotificacion.Usuario,
            UsuarioId = operadorUserId,
            Tag = $"campo-solicitud-{tareaCampoId}",
            Data = new Dictionary<string, string> { ["tareaCampoId"] = tareaCampoId.ToString() },
        };

    // ── Pagos ─────────────────────────────────────────────────────────────

    /// <summary>Entró un pago del cliente.</summary>
    public static NotificacionEvento PagoRegistrado(
        Guid pagoId, Guid? tramiteId, string referencia, decimal monto, string moneda,
        string? cliente, string? metodo, string registradoPor)
    {
        var extra = new List<string>();
        if (!string.IsNullOrWhiteSpace(cliente)) extra.Add(cliente!);
        if (!string.IsNullOrWhiteSpace(metodo)) extra.Add(metodo!);
        extra.Add($"por {registradoPor}");

        return new NotificacionEvento
        {
            Tipo = "pago_registrado",
            Titulo = $"Pago recibido · {FormatoMoneda(monto, moneda)}",
            Mensaje = $"{referencia} · {string.Join(" · ", extra)}",
            Url = tramiteId.HasValue ? $"/tramites/{tramiteId}" : "/pagos",
            Severidad = "success",
            Destino = DestinoNotificacion.Admins,
            Tag = $"pago-{pagoId}",
            Data = new Dictionary<string, string> { ["pagoId"] = pagoId.ToString() },
        };
    }

    /// <summary>El pago pasó el filtro de verificación en banco.</summary>
    public static NotificacionEvento PagoVerificado(
        Guid pagoId, Guid? tramiteId, string referencia, decimal monto, string moneda, string verificadoPor)
        => new()
        {
            Tipo = "pago_verificado",
            Titulo = $"Pago verificado · {FormatoMoneda(monto, moneda)}",
            Mensaje = $"{referencia} · confirmado por {verificadoPor}",
            Url = tramiteId.HasValue ? $"/tramites/{tramiteId}" : "/pagos",
            Severidad = "success",
            Destino = DestinoNotificacion.Admins,
            Tag = $"pago-verificado-{pagoId}",
            Data = new Dictionary<string, string> { ["pagoId"] = pagoId.ToString() },
        };

    // ── Cotizaciones ──────────────────────────────────────────────────────

    /// <summary>El cliente aceptó la cotización: hay que convertirla a trámite.</summary>
    public static NotificacionEvento CotizacionAceptada(
        Guid cotizacionId, string folio, string? cliente, decimal total, string moneda)
        => new()
        {
            Tipo = "cotizacion_aceptada",
            Titulo = "Cotización aceptada",
            Mensaje = $"{folio}" + (string.IsNullOrWhiteSpace(cliente) ? "" : $" · {cliente}")
                      + $" · {FormatoMoneda(total, moneda)}",
            Url = $"/cotizaciones/{cotizacionId}",
            Severidad = "success",
            Destino = DestinoNotificacion.Admins,
            Tag = $"cotizacion-{cotizacionId}",
            Data = new Dictionary<string, string> { ["cotizacionId"] = cotizacionId.ToString() },
        };

    // ── Trámites ──────────────────────────────────────────────────────────

    /// <summary>El trámite cambió de etapa.</summary>
    public static NotificacionEvento TramiteAvanzo(
        Guid tramiteId, string referencia, string estadoAnterior, string estadoNuevo,
        string? vehiculoResumen, string cambiadoPor)
    {
        var detalle = string.IsNullOrWhiteSpace(vehiculoResumen) ? referencia : $"{referencia} · {vehiculoResumen}";
        return new NotificacionEvento
        {
            Tipo = "tramite_avance",
            Titulo = $"{Humanizar(estadoNuevo)} · {referencia}",
            Mensaje = $"{detalle} pasó de {Humanizar(estadoAnterior)} a {Humanizar(estadoNuevo)} ({cambiadoPor})",
            Url = $"/tramites/{tramiteId}",
            Severidad = estadoNuevo.Equals("CANCELADO", StringComparison.OrdinalIgnoreCase) ? "warning" : "info",
            Destino = DestinoNotificacion.Admins,
            Tag = $"tramite-{tramiteId}",
            Data = new Dictionary<string, string>
            {
                ["tramiteId"] = tramiteId.ToString(),
                ["estado"] = estadoNuevo,
            },
        };
    }

    /// <summary>Se registró la entrega de la unidad al cliente.</summary>
    public static NotificacionEvento EntregaRegistrada(
        Guid tramiteId, string referencia, string? vehiculoResumen, string? recibeNombre)
        => new()
        {
            Tipo = "entrega_registrada",
            Titulo = $"Unidad entregada · {referencia}",
            Mensaje = (string.IsNullOrWhiteSpace(vehiculoResumen) ? "Entrega registrada" : vehiculoResumen!)
                      + (string.IsNullOrWhiteSpace(recibeNombre) ? "" : $" · recibió {recibeNombre}"),
            Url = $"/tramites/{tramiteId}",
            Severidad = "success",
            Destino = DestinoNotificacion.Admins,
            Tag = $"entrega-{tramiteId}",
            Data = new Dictionary<string, string> { ["tramiteId"] = tramiteId.ToString() },
        };

    /// <summary>Una tarea de entrega quedó lista en campo.</summary>
    public static NotificacionEvento TareaEntregaCompletada(
        Guid tareaEntregaId, Guid? tramiteId, string referencia, string? recibeNombre, string operadorNombre)
        => new()
        {
            Tipo = "entrega_completada",
            Titulo = $"Entrega completada · {referencia}",
            Mensaje = $"{operadorNombre} cerró la entrega"
                      + (string.IsNullOrWhiteSpace(recibeNombre) ? "" : $" · recibió {recibeNombre}"),
            Url = tramiteId.HasValue ? $"/tramites/{tramiteId}" : $"/entrega/{tareaEntregaId}/captura",
            Severidad = "success",
            Destino = DestinoNotificacion.Admins,
            Tag = $"tarea-entrega-{tareaEntregaId}",
            Data = new Dictionary<string, string> { ["tareaEntregaId"] = tareaEntregaId.ToString() },
        };

    /// <summary>Le asignaron una entrega a un chofer.</summary>
    public static NotificacionEvento TareaEntregaAsignada(
        Guid operadorUserId, Guid tareaEntregaId, string referencia, string? vehiculoResumen, string? direccion)
        => new()
        {
            Tipo = "entrega_asignada",
            Titulo = "Entrega asignada",
            Mensaje = $"{referencia}"
                      + (string.IsNullOrWhiteSpace(vehiculoResumen) ? "" : $" · {vehiculoResumen}")
                      + (string.IsNullOrWhiteSpace(direccion) ? "" : $" · {Resumir(direccion!, 60)}"),
            Url = $"/entrega/{tareaEntregaId}/captura",
            Severidad = "info",
            Destino = DestinoNotificacion.Usuario,
            UsuarioId = operadorUserId,
            Tag = $"tarea-entrega-{tareaEntregaId}",
            Data = new Dictionary<string, string> { ["tareaEntregaId"] = tareaEntregaId.ToString() },
        };

    // ── Utilidades de texto ───────────────────────────────────────────────

    private static string Resumir(string texto, int max)
    {
        var limpio = texto.Trim();
        return limpio.Length <= max ? limpio : limpio[..(max - 1)] + "…";
    }

    private static string FormatoMoneda(decimal monto, string? moneda)
    {
        var codigo = string.IsNullOrWhiteSpace(moneda) ? "MXN" : moneda!.Trim().ToUpperInvariant();
        return $"{monto.ToString("N2", CultureInfo.GetCultureInfo("es-MX"))} {codigo}";
    }

    /// <summary>Convierte FOTOS_RECIBIDAS en "Fotos recibidas".</summary>
    private static string Humanizar(string estado)
    {
        if (string.IsNullOrWhiteSpace(estado)) return "—";
        var palabras = estado.Replace('_', ' ').Trim().ToLowerInvariant();
        return char.ToUpperInvariant(palabras[0]) + palabras[1..];
    }
}
