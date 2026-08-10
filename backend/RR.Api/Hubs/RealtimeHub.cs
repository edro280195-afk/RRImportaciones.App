using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RR.Api.Hubs;

[Authorize]
public class RealtimeHub : Hub
{
    /// <summary>
    /// Al conectar, asignamos al usuario a los grupos que le corresponden:
    /// - Tiene CAMPO_USAR → grupo "campo" (yarderos, choferes)
    /// - Es de oficina/dirección → grupo "admins"
    ///
    /// Los grupos NO son excluyentes, y ahí estaba el error anterior: se elegía
    /// uno u otro con `permisos.Contains("CAMPO_USAR") ? "campo" : "admins"`, y
    /// como el rol ADMIN tiene *todos* los permisos —CAMPO_USAR incluido— los
    /// administradores terminaban solo en "campo" y no recibían ninguna de sus
    /// notificaciones (tarea completada, pre-inspección creada, reset de PIN).
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var permisos = Context.User?.FindAll("permiso").Select(c => c.Value).ToHashSet()
            ?? new HashSet<string>();
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty;

        var esCampo = permisos.Contains("CAMPO_USAR");
        // Los roles de dirección van siempre a "admins" aunque tengan CAMPO_USAR.
        var esOficina = !esCampo || role is "ADMIN" or "DUEÑO" or "GERENTE";

        if (esCampo) await Groups.AddToGroupAsync(Context.ConnectionId, "campo");
        if (esOficina) await Groups.AddToGroupAsync(Context.ConnectionId, "admins");

        var userIdClaim = Context.User?.FindFirst("sub")?.Value
            ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        }

        await base.OnConnectedAsync();
    }
}
