using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using RR.Application.DTOs.Common;

namespace RR.Api.Auth;

/// <summary>
/// Exige que el usuario tenga al menos uno de los permisos indicados.
///
/// Hasta ahora los controladores solo pedían <c>[Authorize]</c> —estar
/// autenticado— y el filtro de permisos vivía únicamente en el frontend: quien
/// supiera armar la petición entraba a pagos, reportes o usuarios con cualquier
/// rol. Este atributo mueve esa decisión al API, que es donde se puede hacer
/// valer.
///
/// Con varios códigos la regla es O (basta uno), igual que <c>canAny()</c> en
/// el frontend. ADMIN y DUEÑO pasan siempre.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequierePermisoAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string[] _codigos;

    public RequierePermisoAttribute(params string[] codigos)
    {
        _codigos = codigos;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Si la acción se marcó como anónima, este filtro no aplica.
        if (context.ActionDescriptor.EndpointMetadata
            .OfType<Microsoft.AspNetCore.Authorization.IAllowAnonymous>().Any())
            return;

        var user = context.HttpContext.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedObjectResult(new ErrorResponse
            {
                Message = "Sesión no válida o expirada",
                StatusCode = (int)HttpStatusCode.Unauthorized,
            });
            return;
        }

        var permisos = context.HttpContext.RequestServices.GetRequiredService<IPermisosUsuario>();

        if (await permisos.TieneAlgunoAsync(user, _codigos)) return;

        context.Result = new ObjectResult(new ErrorResponse
        {
            Message = "Tu usuario no tiene permiso para esta operación",
            StatusCode = (int)HttpStatusCode.Forbidden,
        })
        {
            StatusCode = (int)HttpStatusCode.Forbidden,
        };
    }
}

/// <summary>
/// Restringe una acción a un conjunto fijo de roles.
/// </summary>
public abstract class SoloRolesAttribute : Attribute, IAsyncAuthorizationFilter
{
    protected abstract string[] Roles { get; }
    protected abstract string Mensaje { get; }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (user?.Identity?.IsAuthenticated == true && Roles.Any(user.IsInRole))
            return Task.CompletedTask;

        context.Result = new ObjectResult(new ErrorResponse
        {
            Message = Mensaje,
            StatusCode = (int)HttpStatusCode.Forbidden,
        })
        {
            StatusCode = (int)HttpStatusCode.Forbidden,
        };

        return Task.CompletedTask;
    }
}

/// <summary>
/// Solo los roles de acceso total (ADMIN y DUEÑO).
///
/// Se usa donde no hay un permiso del catálogo que corresponda: administración
/// del sistema, auditoría, parámetros fiscales. Sustituye a
/// <c>[Authorize(Roles = "ADMIN")]</c>, que dejaba fuera al dueño del negocio.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class SoloAdministracionAttribute : SoloRolesAttribute
{
    protected override string[] Roles => ["ADMIN", "DUEÑO"];
    protected override string Mensaje => "Esta sección es exclusiva de administración";
}

/// <summary>
/// Dirección del negocio: ADMIN, DUEÑO y GERENTE.
///
/// Es el mismo criterio que <c>puedeVerDinero</c> en el frontend. Se usa en las
/// operaciones que mueven la posición financiera —verificar un pago contra el
/// banco, borrarlo— donde no basta con poder registrarlo.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class SoloDireccionAttribute : SoloRolesAttribute
{
    protected override string[] Roles => ["ADMIN", "DUEÑO", "GERENTE"];
    protected override string Mensaje => "Esta operación es exclusiva de dirección";
}
