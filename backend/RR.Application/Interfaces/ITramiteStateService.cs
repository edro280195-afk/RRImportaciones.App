namespace RR.Application.Interfaces;

public interface ITramiteStateService
{
    bool CanTransitionTo(string estadoActual, string nuevoEstado, out string? razon);
    string[] GetTransicionesPermitidas(string estadoActual);
    bool RequiereAdmin(string estadoActual, string nuevoEstado);
}
