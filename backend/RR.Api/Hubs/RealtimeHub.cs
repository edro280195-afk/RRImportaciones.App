using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RR.Api.Hubs;

[Authorize]
public class RealtimeHub : Hub
{
    /// <summary>
    /// Al conectar, asignamos al usuario al grupo que corresponde según sus permisos:
    /// - Tiene CAMPO_USAR → grupo "campo" (yarderos, choferes)
    /// - No tiene CAMPO_USAR → grupo "admins" (oficina, gerentes, admins)
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var permisos = Context.User?.FindAll("permiso").Select(c => c.Value) ?? Enumerable.Empty<string>();
        var group = permisos.Contains("CAMPO_USAR") ? "campo" : "admins";
        await Groups.AddToGroupAsync(Context.ConnectionId, group);

        var userIdClaim = Context.User?.FindFirst("sub")?.Value
            ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        }

        await base.OnConnectedAsync();
    }
}
