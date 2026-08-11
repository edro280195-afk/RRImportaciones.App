using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RR.Api.Controllers;

/// <summary>
/// Huella del despliegue actual del API. La PWA la consulta cada minuto: si
/// cambia, sabe que se publicó una versión nueva del backend y le ofrece al
/// usuario recargar antes de que empiece a ver errores raros por hablarle a un
/// API que ya no es el mismo.
/// </summary>
[ApiController]
[Route("api/version")]
[AllowAnonymous]
public class VersionController : ControllerBase
{
    /// <summary>
    /// Se calcula una sola vez al arrancar. Es deliberadamente estable entre
    /// reinicios del mismo despliegue: en el plan gratis de Render el servicio
    /// se duerme y despierta varias veces al día, y si la huella cambiara con
    /// cada arranque la app estaría avisando de actualizaciones que no existen.
    /// </summary>
    private static readonly object Huella = Calcular();

    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public IActionResult Get() => Ok(Huella);

    private static object Calcular()
    {
        var ensamblado = Assembly.GetExecutingAssembly();

        // En Render el commit viene en la variable de entorno; es lo más preciso.
        var commit = Environment.GetEnvironmentVariable("RENDER_GIT_COMMIT")
            ?? Environment.GetEnvironmentVariable("GITHUB_SHA");

        // Sin commit, la fecha del DLL sirve igual: cambia en cada compilación
        // (cada despliegue construye una imagen nueva) y no cambia al reiniciar.
        string version;
        DateTime? compilado = null;

        if (!string.IsNullOrWhiteSpace(commit))
        {
            version = commit.Length > 12 ? commit[..12] : commit;
        }
        else
        {
            try
            {
                var ruta = ensamblado.Location;
                if (!string.IsNullOrEmpty(ruta) && System.IO.File.Exists(ruta))
                {
                    compilado = System.IO.File.GetLastWriteTimeUtc(ruta);
                    version = compilado.Value.Ticks.ToString();
                }
                else
                {
                    version = ensamblado.GetName().Version?.ToString() ?? "desconocida";
                }
            }
            catch
            {
                version = ensamblado.GetName().Version?.ToString() ?? "desconocida";
            }
        }

        return new
        {
            version,
            commit,
            compilado,
            iniciado = DateTime.UtcNow,
        };
    }
}
