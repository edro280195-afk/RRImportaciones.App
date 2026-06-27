using RR.Application.Interfaces;
using RR.Domain.Enums;

namespace RR.Infrastructure.Services;

/// <summary>
/// Reglas de cambio de estado de un trámite. Modelo permisivo (igual que la
/// herramienta de Rodri): se puede mover a cualquier estado válido del flujo
/// semáforo, con dos candados:
///   1. Un trámite CANCELADO no se puede reactivar.
///   2. No se permite "cambiar" al mismo estado en el que ya está.
///
/// El requisito de que ENTREGADO_AL_CLIENTE tenga una entrega registrada se
/// valida aparte en <c>TramiteService.CambiarEstadoAsync</c>.
/// </summary>
public class TramiteStateService : ITramiteStateService
{
    public bool CanTransitionTo(string estadoActual, string nuevoEstado, out string? razon)
    {
        razon = null;

        if (!EstadoTramite.EsValido(nuevoEstado))
        {
            razon = $"Estado destino desconocido: {nuevoEstado}";
            return false;
        }

        if (string.Equals(estadoActual, nuevoEstado, StringComparison.OrdinalIgnoreCase))
        {
            razon = "El trámite ya está en ese estado.";
            return false;
        }

        if (string.Equals(estadoActual, EstadoTramite.CANCELADO, StringComparison.OrdinalIgnoreCase))
        {
            razon = "Un trámite cancelado no puede reactivarse.";
            return false;
        }

        return true;
    }

    public string[] GetTransicionesPermitidas(string estadoActual)
    {
        if (string.Equals(estadoActual, EstadoTramite.CANCELADO, StringComparison.OrdinalIgnoreCase))
            return [];

        return EstadoTramite.Todos
            .Where(e => !string.Equals(e, estadoActual, StringComparison.OrdinalIgnoreCase))
            .ToArray();
    }

    // El modelo permisivo no distingue avances/retrocesos, así que nada requiere
    // un rol especial. Se conserva por compatibilidad con la interfaz.
    public bool RequiereAdmin(string estadoActual, string nuevoEstado) => false;
}
