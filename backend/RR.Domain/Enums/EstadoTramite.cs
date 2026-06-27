namespace RR.Domain.Enums;

/// <summary>
/// Estados logísticos reales de un trámite (esquema "semáforo"). Son los valores
/// que viven en <c>Tramite.EstadoLogistico</c> y los que usa la app/web.
///
/// Nota: <see cref="EstadoLogistico"/> es una taxonomía antigua que ya no se usa
/// para el flujo de trámites; esta es la vigente.
/// </summary>
public static class EstadoTramite
{
    public const string PENDIENTE_TRAMITE = "PENDIENTE_TRAMITE";
    public const string FOTOS_SOLICITADAS = "FOTOS_SOLICITADAS";
    public const string FOTOS_RECIBIDAS = "FOTOS_RECIBIDAS";
    public const string REQUISITOS_PENDIENTES = "REQUISITOS_PENDIENTES";
    public const string BAJA_EN_PROCESO = "BAJA_EN_PROCESO";
    public const string BAJA_COMPLETADA = "BAJA_COMPLETADA";
    public const string LISTO_PARA_PEDIMENTO = "LISTO_PARA_PEDIMENTO";
    public const string PEDIMENTO_DOCUMENTADO = "PEDIMENTO_DOCUMENTADO";
    public const string PAGO_PEDIMENTO_PENDIENTE = "PAGO_PEDIMENTO_PENDIENTE";
    public const string MANDADO_A_CRUCE = "MANDADO_A_CRUCE";
    public const string EN_PROCESO = "EN_PROCESO";
    public const string ROJO_DESADUANADO = "ROJO_DESADUANADO";
    public const string VERDE_ENTREGADO = "VERDE_ENTREGADO";
    public const string ENTREGADO_AL_CLIENTE = "ENTREGADO_AL_CLIENTE";
    public const string AMARILLO_PENDIENTE_PAGO = "AMARILLO_PENDIENTE_PAGO";
    public const string COBRADO = "COBRADO";
    public const string CANCELADO = "CANCELADO";

    /// <summary>Todos los estados válidos, en orden aproximado del flujo.</summary>
    public static readonly string[] Todos =
    [
        PENDIENTE_TRAMITE, FOTOS_SOLICITADAS, FOTOS_RECIBIDAS, REQUISITOS_PENDIENTES,
        BAJA_EN_PROCESO, BAJA_COMPLETADA, LISTO_PARA_PEDIMENTO, PEDIMENTO_DOCUMENTADO,
        PAGO_PEDIMENTO_PENDIENTE, MANDADO_A_CRUCE, EN_PROCESO, ROJO_DESADUANADO,
        VERDE_ENTREGADO, ENTREGADO_AL_CLIENTE, AMARILLO_PENDIENTE_PAGO, COBRADO, CANCELADO
    ];

    public static bool EsValido(string? estado) =>
        !string.IsNullOrWhiteSpace(estado) &&
        Todos.Any(e => string.Equals(e, estado, StringComparison.OrdinalIgnoreCase));
}
