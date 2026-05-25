using RR.Application.Interfaces;
using RR.Domain.Enums;

namespace RR.Infrastructure.Services;

public class TramiteStateService : ITramiteStateService
{
    private static readonly Dictionary<string, string[]> TransicionesLogistica = new()
    {
        [EstadoLogistico.PENDIENTE] = [EstadoLogistico.RECEPCION_EN_YARDA],
        [EstadoLogistico.RECEPCION_EN_YARDA] = [EstadoLogistico.REVISION_DOCUMENTAL],
        [EstadoLogistico.REVISION_DOCUMENTAL] = [EstadoLogistico.LISTO_PARA_ADUANA],
        [EstadoLogistico.LISTO_PARA_ADUANA] = [EstadoLogistico.PEDIMENTO_DOCUMENTADO],
        [EstadoLogistico.PEDIMENTO_DOCUMENTADO] = [EstadoLogistico.MODULACION_EN_CRUCE],
        [EstadoLogistico.MODULACION_EN_CRUCE] = [EstadoLogistico.SEMAFORO_VERDE, EstadoLogistico.SEMAFORO_ROJO],
        [EstadoLogistico.SEMAFORO_ROJO] = [EstadoLogistico.LIBERADO],
        [EstadoLogistico.SEMAFORO_VERDE] = [EstadoLogistico.LIBERADO],
        [EstadoLogistico.LIBERADO] = [EstadoLogistico.ENTREGADO_AL_CLIENTE]
    };

    public bool CanTransitionTo(string estadoActual, string nuevoEstado, out string? razon)
    {
        if (estadoActual == "VERDE_ENTREGADO") estadoActual = EstadoLogistico.ENTREGADO_AL_CLIENTE;
        if (nuevoEstado == "VERDE_ENTREGADO") nuevoEstado = EstadoLogistico.ENTREGADO_AL_CLIENTE;

        razon = null;

        if (estadoActual == EstadoLogistico.CANCELADO && nuevoEstado != EstadoLogistico.CANCELADO)
        {
            razon = "Un trámite cancelado no puede reactivarse";
            return false;
        }

        if (estadoActual == EstadoLogistico.ENTREGADO_AL_CLIENTE)
        {
            razon = "El tramite ya fue entregado y finalizo su ciclo logistico.";
            return false;
        }

        if (nuevoEstado == EstadoLogistico.CANCELADO)
        {
            return true;
        }

        if (TransicionesLogistica.TryGetValue(estadoActual, out var permitidas))
        {
            if (permitidas.Contains(nuevoEstado))
                return true;

            var currentIdx = Array.IndexOf(EstadoLogistico.Todos, estadoActual);
            var newIdx = Array.IndexOf(EstadoLogistico.Todos, nuevoEstado);

            if (newIdx >= 0 && currentIdx >= 0 && newIdx < currentIdx)
            {
                razon = $"Transición hacia atrás requiere rol ADMIN: {estadoActual} → {nuevoEstado}";
                return false;
            }

            razon = $"Transición no permitida en flujo normal: {estadoActual} → {nuevoEstado}";
            return false;
        }

        if (estadoActual == EstadoLogistico.ENTREGADO_AL_CLIENTE)
        {
            razon = "El trámite ya fue entregado y finalizó su ciclo logístico.";
            return false;
        }

        razon = $"Estado actual desconocido: {estadoActual}";
        return false;
    }

    public string[] GetTransicionesPermitidas(string estadoActual)
    {
        if (estadoActual == "VERDE_ENTREGADO") estadoActual = EstadoLogistico.ENTREGADO_AL_CLIENTE;

        if (estadoActual == EstadoLogistico.CANCELADO || estadoActual == EstadoLogistico.ENTREGADO_AL_CLIENTE)
            return [];

        var result = new List<string>();

        if (TransicionesLogistica.TryGetValue(estadoActual, out var adelante))
            result.AddRange(adelante);

        result.Add(EstadoLogistico.CANCELADO);

        return result.ToArray();
    }

    public bool RequiereAdmin(string estadoActual, string nuevoEstado)
    {
        if (estadoActual == "VERDE_ENTREGADO") estadoActual = EstadoLogistico.ENTREGADO_AL_CLIENTE;
        if (nuevoEstado == "VERDE_ENTREGADO") nuevoEstado = EstadoLogistico.ENTREGADO_AL_CLIENTE;

        if (nuevoEstado == EstadoLogistico.CANCELADO) return false;

        if (TransicionesLogistica.TryGetValue(estadoActual, out var permitidas))
        {
            if (permitidas.Contains(nuevoEstado)) return false;

            var currentIdx = Array.IndexOf(EstadoLogistico.Todos, estadoActual);
            var newIdx = Array.IndexOf(EstadoLogistico.Todos, nuevoEstado);

            if (newIdx >= 0 && currentIdx >= 0 && newIdx < currentIdx)
                return true;
        }

        return true;
    }
}
