using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using RR.Infrastructure.Data;

namespace RR.Api.Auth;

/// <summary>
/// Resuelve los permisos efectivos del usuario que hace la petición.
///
/// Se consulta la base y no solo los claims del token porque el JWT dura 24h:
/// si a alguien se le quita un permiso desde la pantalla de Roles, con claims
/// nada más seguiría entrando el resto del día. La consulta va cacheada un
/// minuto por usuario, así que el costo real es despreciable y un cambio de
/// permisos se aplica casi de inmediato.
/// </summary>
public interface IPermisosUsuario
{
    /// <summary>Permisos con acceso total, sin importar lo que diga el catálogo.</summary>
    bool EsAccesoTotal(ClaimsPrincipal user);

    /// <summary>true si el usuario tiene AL MENOS uno de los códigos indicados.</summary>
    Task<bool> TieneAlgunoAsync(ClaimsPrincipal user, IReadOnlyList<string> codigos);
}

public class PermisosUsuario : IPermisosUsuario
{
    /// <summary>
    /// Roles con acceso total. Es el mismo criterio que <c>AuthService.can()</c>
    /// en el frontend; ojo que DUEÑO no tiene permisos asignados en la base
    /// —su acceso viene del rol—, así que quitar este bypass lo dejaría fuera
    /// de toda la aplicación.
    /// </summary>
    private static readonly string[] RolesAccesoTotal = ["ADMIN", "DUEÑO"];

    private static readonly TimeSpan Vigencia = TimeSpan.FromMinutes(1);

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PermisosUsuario> _logger;

    public PermisosUsuario(AppDbContext db, IMemoryCache cache, ILogger<PermisosUsuario> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public bool EsAccesoTotal(ClaimsPrincipal user) => RolesAccesoTotal.Any(user.IsInRole);

    public async Task<bool> TieneAlgunoAsync(ClaimsPrincipal user, IReadOnlyList<string> codigos)
    {
        if (codigos.Count == 0) return true;
        if (EsAccesoTotal(user)) return true;

        var permisos = await ObtenerAsync(user);
        return codigos.Any(permisos.Contains);
    }

    private async Task<HashSet<string>> ObtenerAsync(ClaimsPrincipal user)
    {
        var idClaim = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        if (!Guid.TryParse(idClaim, out var userId))
            return DesdeClaims(user);

        if (_cache.TryGetValue<HashSet<string>>(ClaveCache(userId), out var enCache) && enCache is not null)
            return enCache;

        try
        {
            var permisos = await _db.Usuarios
                .IgnoreQueryFilters()
                .Where(u => u.Id == userId && u.Activo)
                .SelectMany(u => u.Role!.RolePermissions)
                .Where(rp => rp.Permission != null)
                .Select(rp => rp.Permission!.Codigo)
                .ToListAsync();

            var conjunto = new HashSet<string>(permisos, StringComparer.OrdinalIgnoreCase);
            _cache.Set(ClaveCache(userId), conjunto, Vigencia);
            return conjunto;
        }
        catch (Exception ex)
        {
            // Si la base no responde, no dejamos a todo el mundo fuera: el token
            // ya trae los permisos con los que se firmó la sesión.
            _logger.LogWarning(ex, "No se pudieron leer los permisos de {UserId}; se usan los del token", userId);
            return DesdeClaims(user);
        }
    }

    private static HashSet<string> DesdeClaims(ClaimsPrincipal user) =>
        new(user.FindAll("permiso").Select(c => c.Value), StringComparer.OrdinalIgnoreCase);

    private static string ClaveCache(Guid userId) => $"permisos:{userId}";
}
