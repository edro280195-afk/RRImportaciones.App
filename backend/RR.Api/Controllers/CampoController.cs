using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using RR.Api.Auth;
using RR.Application.DTOs.Campo;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/campo")]
[Authorize]
public class CampoController : ControllerBase
{
    private readonly ICampoService _campoService;
    private readonly IFileStorageService _fileStorageService;
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public CampoController(
        ICampoService campoService,
        IFileStorageService fileStorageService,
        AppDbContext db,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _campoService = campoService;
        _fileStorageService = fileStorageService;
        _db = db;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("tareas")]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> GetTareas([FromQuery] string? EstadoLogistico)
    {
        return Ok(await _campoService.GetTareasAsync(EstadoLogistico));
    }

    [HttpGet("tareas/{id:guid}")]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tarea = await _campoService.GetByIdAsync(id);
        return tarea == null ? NotFound(new { message = "Tarea de campo no encontrada" }) : Ok(tarea);
    }

    [HttpPost("tareas")]
    [RequierePermiso(Permisos.TramitesAsignar, Permisos.CampoUsar)]
    public async Task<IActionResult> Crear([FromBody] CrearTareaCampoRequest request)
    {
        try
        {
            return Ok(await _campoService.CrearAsync(request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("pre-inspecciones")]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> CrearPreInspeccion([FromBody] CrearPreInspeccionRequest request)
    {
        try
        {
            return Ok(await _campoService.CrearPreInspeccionAsync(request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("tareas/{id:guid}/vincular")]
    [RequierePermiso(Permisos.TramitesAsignar)]
    public async Task<IActionResult> VincularTramite(Guid id, [FromBody] VincularPreInspeccionRequest request)
    {
        try
        {
            return Ok(await _campoService.VincularTramiteAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("tareas/{id:guid}/tomar")]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> Tomar(Guid id, [FromBody] TomarTareaCampoRequest request)
    {
        try
        {
            return Ok(await _campoService.TomarAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("tareas/{id:guid}/completar")]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> Completar(Guid id, [FromBody] CompletarTareaCampoRequest request)
    {
        try
        {
            return Ok(await _campoService.CompletarAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("tareas/{id:guid}/fotos")]
    [RequestSizeLimit(15_728_640)]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> UploadFoto(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "La foto es obligatoria" });

        if (file.Length > 15 * 1024 * 1024)
            return BadRequest(new { message = "La foto no puede exceder 15 MB" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(extension))
            return BadRequest(new { message = "Formato no permitido. Use jpg, jpeg, png o webp" });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _fileStorageService.UploadFileAsync($"campo/{id:N}", file.FileName, file.ContentType, stream, HttpContext.RequestAborted);
            var tarea = await _campoService.AgregarFotoAsync(id, url);
            return Ok(new { fotoUrl = url, tarea });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("tareas/{id:guid}/videos")]
    [RequestSizeLimit(125_829_120)]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> UploadVideo(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "El video es obligatorio" });

        if (file.Length > 120 * 1024 * 1024)
            return BadRequest(new { message = "El video no puede exceder 120 MB" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = file.ContentType.Split(';', 2)[0].Trim();
        var allowedExtensions = new HashSet<string> { ".mp4", ".webm", ".mov", ".m4v" };
        var allowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-m4v",
        };

        if (!allowedExtensions.Contains(extension) ||
            (!string.IsNullOrWhiteSpace(contentType) && !allowedContentTypes.Contains(contentType)))
        {
            return BadRequest(new { message = "Formato no permitido. Use mp4, webm, mov o m4v" });
        }

        await using (var signatureStream = file.OpenReadStream())
        {
            var header = new byte[12];
            var read = await signatureStream.ReadAsync(header, HttpContext.RequestAborted);
            if (!HasAllowedVideoSignature(header, read, extension))
                return BadRequest(new { message = "El contenido del video no es válido" });
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _fileStorageService.UploadFileAsync(
                $"campo/{id:N}/videos",
                file.FileName,
                contentType,
                stream,
                HttpContext.RequestAborted);
            var tarea = await _campoService.AgregarVideoAsync(id, url);
            return Ok(new { videoUrl = url, tarea });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("tareas/{id:guid}/compartir")]
    [RequierePermiso(Permisos.TramitesAsignar)]
    public async Task<IActionResult> CreateShareLink(Guid id)
    {
        var tarea = await _campoService.GetByIdAsync(id);
        if (tarea == null)
            return NotFound(new { message = "Tarea de campo no encontrada" });

        if (tarea.FotosUrls.Length == 0)
            return BadRequest(new { message = "La tarea todavía no tiene fotos para compartir" });

        var expiresAt = DateTimeOffset.UtcNow.AddDays(7);
        var token = CreateShareToken(id, expiresAt);
        var baseUrl = _configuration["PublicApp:BaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
            baseUrl = $"{Request.Scheme}://{Request.Host}";

        var downloadUrl = $"{baseUrl}/api/campo/compartir/{token}/descarga";
        var vehicle = string.IsNullOrWhiteSpace(tarea.VehiculoResumen)
            ? "vehículo"
            : tarea.VehiculoResumen;
        var shareText = $"Ingreso de {vehicle}{(string.IsNullOrWhiteSpace(tarea.Vin) ? string.Empty : $" · VIN {tarea.Vin}")}\nFotos del vehículo: {downloadUrl}";

        return Ok(new
        {
            tarea.Id,
            vehicle,
            vin = tarea.Vin,
            downloadUrl,
            shareText,
            expiresAt,
            photoUrls = tarea.FotosUrls,
            videoUrls = tarea.VideosUrls,
        });
    }

    /// <summary>Genera el enlace de fotos desde el registro administrativo del vehículo.</summary>
    [HttpGet("vehiculos/{vehiculoId:guid}/compartir")]
    [RequierePermiso(Permisos.TramitesAsignar)]
    public async Task<IActionResult> CreateVehicleShareLink(Guid vehiculoId)
    {
        var tareaId = await _db.TareasCampo
            .Where(t => t.FotosUrls.Length > 0
                        && (t.VehiculoId == vehiculoId
                            || (t.Tramite != null && t.Tramite.VehiculoId == vehiculoId)))
            .OrderByDescending(t => t.FechaCompletada ?? t.FechaCreacion)
            .Select(t => (Guid?)t.Id)
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

        if (!tareaId.HasValue)
            return NotFound(new { message = "El vehículo todavía no tiene fotos de campo para compartir" });

        return await CreateShareLink(tareaId.Value);
    }

    [HttpGet("compartir/{token}/descarga")]
    [AllowAnonymous]
    [EnableRateLimiting("Portal")]
    public async Task<IActionResult> DownloadSharedPhotos(string token)
    {
        var tareaId = ValidateShareToken(token);
        if (!tareaId.HasValue)
            return NotFound(new { message = "El enlace no es válido o ya expiró" });

        var tarea = await _db.TareasCampo
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tareaId.Value, HttpContext.RequestAborted);

        if (tarea == null || tarea.FotosUrls.Length == 0)
            return NotFound(new { message = "No hay fotos disponibles para este enlace" });

        await using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var client = _httpClientFactory.CreateClient();
            var added = 0;

            foreach (var photoUrl in tarea.FotosUrls.Distinct(StringComparer.Ordinal))
            {
                var mediaUri = BuildAllowedMediaUri(photoUrl);
                if (mediaUri == null)
                    continue;

                try
                {
                    using var response = await client.GetAsync(
                        mediaUri,
                        HttpCompletionOption.ResponseHeadersRead,
                        HttpContext.RequestAborted);
                    if (!response.IsSuccessStatusCode)
                        continue;

                    var extension = Path.GetExtension(mediaUri.AbsolutePath).ToLowerInvariant();
                    if (!Regex.IsMatch(extension, @"^\.(jpe?g|png|webp)$", RegexOptions.IgnoreCase))
                        extension = ".jpg";

                    var entry = archive.CreateEntry($"fotos/foto-{++added:00}{extension}", CompressionLevel.Fastest);
                    await using var entryStream = entry.Open();
                    await response.Content.CopyToAsync(entryStream, HttpContext.RequestAborted);
                }
                catch (HttpRequestException)
                {
                    // Una foto no disponible no debe impedir descargar las demás.
                }
            }

            if (added == 0)
                return NotFound(new { message = "No se pudieron localizar las fotos" });
        }

        zipStream.Position = 0;
        var fileName = $"fotos-{SafeFilePart(tarea.VehiculoId?.ToString() ?? tarea.Id.ToString("N"))}.zip";
        return File(zipStream.ToArray(), "application/zip", fileName);
    }

    [HttpDelete("tareas/{id:guid}/fotos")]
    [SoloAdministracion]
    public async Task<IActionResult> DeleteFoto(Guid id, [FromBody] EliminarFotoCampoRequest request)
    {
        try
        {
            return Ok(await _campoService.EliminarFotoAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("extract-vin")]
    [RequierePermiso(Permisos.CampoUsar)]
    public async Task<IActionResult> ExtractVin([FromBody] ExtractVinRequest request)
    {
        try
        {
            return Ok(await _campoService.ExtractVinFromImageAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("bandeja-admin")]
    [RequierePermiso(Permisos.TramitesAsignar)]
    public async Task<IActionResult> GetBandejaAdmin(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] Guid? operadorUsuarioId,
        [FromQuery] string? ubicacion)
    {
        var filtros = new BandejaCampoAdminFilters
        {
            Desde = desde,
            Hasta = hasta,
            OperadorUsuarioId = operadorUsuarioId,
            Ubicacion = ubicacion,
        };
        return Ok(await _campoService.GetBandejaAdminAsync(filtros));
    }

    [HttpPost("tareas/{id:guid}/solicitar-fotos")]
    [RequierePermiso(Permisos.TramitesAsignar)]
    public async Task<IActionResult> SolicitarFotos(Guid id, [FromBody] SolicitarFotosAdicionalesRequest request)
    {
        try
        {
            return Ok(await _campoService.SolicitarFotosAdicionalesAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("tareas/{id:guid}/descartar")]
    [RequierePermiso(Permisos.TramitesAsignar)]
    public async Task<IActionResult> Descartar(Guid id, [FromBody] DescartarTareaCampoRequest request)
    {
        try
        {
            return Ok(await _campoService.DescartarAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    private string CreateShareToken(Guid tareaId, DateTimeOffset expiresAt)
    {
        var payload = $"{tareaId:N}|{expiresAt.ToUnixTimeSeconds()}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = HMACSHA256.HashData(GetShareKey(), payloadBytes);
        return $"{ToBase64Url(payloadBytes)}.{ToBase64Url(signature)}";
    }

    private Guid? ValidateShareToken(string token)
    {
        try
        {
            var parts = token.Split('.', 2, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2)
                return null;

            var payloadBytes = FromBase64Url(parts[0]);
            var signature = FromBase64Url(parts[1]);
            var expectedSignature = HMACSHA256.HashData(GetShareKey(), payloadBytes);
            if (!CryptographicOperations.FixedTimeEquals(signature, expectedSignature))
                return null;

            var payload = Encoding.UTF8.GetString(payloadBytes).Split('|', 2);
            if (payload.Length != 2 || !Guid.TryParseExact(payload[0], "N", out var tareaId))
                return null;

            return long.TryParse(payload[1], out var expiresAt) &&
                   DateTimeOffset.UtcNow.ToUnixTimeSeconds() <= expiresAt
                ? tareaId
                : null;
        }
        catch
        {
            return null;
        }
    }

    private byte[] GetShareKey()
    {
        var secret = _configuration["CampoShare:SecretKey"]
            ?? _configuration["PortalAccess:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("CampoShare:SecretKey no está configurado");

        return Encoding.UTF8.GetBytes(secret);
    }

    private static string ToBase64Url(byte[] value) => Convert.ToBase64String(value)
        .Replace('+', '-')
        .Replace('/', '_')
        .TrimEnd('=');

    private static byte[] FromBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded += new string('=', (4 - padded.Length % 4) % 4);
        return Convert.FromBase64String(padded);
    }

    private static bool HasAllowedVideoSignature(byte[] header, int read, string extension)
    {
        if (extension == ".webm")
            return read >= 4 && header[..4].SequenceEqual(new byte[] { 0x1A, 0x45, 0xDF, 0xA3 });

        // MP4/M4V/MOV are ISO Base Media files and contain `ftyp` at offset 4.
        return read >= 8 && header[4..8].SequenceEqual(Encoding.ASCII.GetBytes("ftyp"));
    }

    private Uri? BuildAllowedMediaUri(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        if (url.StartsWith("/", StringComparison.Ordinal))
            return new Uri($"{Request.Scheme}://{Request.Host}{url}");

        if (!Uri.TryCreate(url, UriKind.Absolute, out var absolute) ||
            absolute.Scheme is not ("http" or "https"))
            return null;

        var configuredStorage = _configuration["Storage:R2:PublicBaseUrl"];
        if (Uri.TryCreate(configuredStorage, UriKind.Absolute, out var storageBase) &&
            string.Equals(absolute.Host, storageBase.Host, StringComparison.OrdinalIgnoreCase))
            return absolute;

        return null;
    }

    private static string SafeFilePart(string value) => Regex.Replace(value, @"[^A-Za-z0-9_-]", "-");
}
