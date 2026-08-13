using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using RR.Api.Auth;
using RR.Application.DTOs.Campo;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;
using System.IO.Compression;
using System.Text;
using System.Text.Encodings.Web;
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
    private readonly EntregaLinkTokenService _shareTokens;

    public CampoController(
        ICampoService campoService,
        IFileStorageService fileStorageService,
        AppDbContext db,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        EntregaLinkTokenService shareTokens)
    {
        _campoService = campoService;
        _fileStorageService = fileStorageService;
        _db = db;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _shareTokens = shareTokens;
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
        var token = _shareTokens.Generate();
        var entity = await _db.TareasCampo
            .FirstOrDefaultAsync(t => t.Id == id, HttpContext.RequestAborted);
        if (entity == null)
            return NotFound(new { message = "Tarea de campo no encontrada" });

        entity.ShareTokenHash = _shareTokens.Hash(token);
        entity.ShareTokenExpira = expiresAt.UtcDateTime;
        entity.ShareTokenRevocadoAt = null;
        await _db.SaveChangesAsync(HttpContext.RequestAborted);

        var galleryUrl = $"{GetPublicApiBaseUrl()}/api/campo/compartir/{Uri.EscapeDataString(token)}";
        var vehicle = string.IsNullOrWhiteSpace(tarea.VehiculoResumen)
            ? "vehículo"
            : tarea.VehiculoResumen;
        var shareText = $"Ingreso de {vehicle}{(string.IsNullOrWhiteSpace(tarea.Vin) ? string.Empty : $" · VIN {tarea.Vin}")}\nFotos del vehículo: {galleryUrl}";

        return Ok(new
        {
            tarea.Id,
            vehicle,
            vin = tarea.Vin,
            galleryUrl,
            // Alias temporal para clientes antiguos; ahora apunta a la galería HTML.
            downloadUrl = galleryUrl,
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

    /// <summary>Galería HTML pública protegida por un token temporal.</summary>
    [HttpGet("compartir/{token}")]
    [AllowAnonymous]
    [EnableRateLimiting("PublicShare")]
    public async Task<IActionResult> SharedPhotoGallery(string token)
    {
        var tarea = await GetSharedTaskAsync(token);
        if (tarea == null)
            return SharedLinkNotFound();

        var nonce = _shareTokens.Generate();
        var html = BuildGalleryHtml(tarea, nonce);
        ApplyPrivateResponseHeaders(nonce);
        return Content(html, "text/html", Encoding.UTF8);
    }

    /// <summary>Sirve una foto únicamente después de validar el token y su índice.</summary>
    [HttpGet("compartir/{token}/foto/{index:int}")]
    [AllowAnonymous]
    [EnableRateLimiting("PublicShare")]
    public async Task<IActionResult> SharedPhoto(string token, int index)
    {
        ApplyPrivateResponseHeaders();
        var tarea = await GetSharedTaskAsync(token);
        if (tarea == null || index < 0 || index >= tarea.FotosUrls.Length)
            return NotFound(new { message = "El enlace no es válido o ya expiró" });

        var media = await ReadAllowedMediaAsync(tarea.FotosUrls[index], HttpContext.RequestAborted);
        if (media == null)
            return NotFound(new { message = "La foto no está disponible" });

        return File(media.Bytes, media.ContentType);
    }

    [HttpGet("compartir/{token}/descarga")]
    [AllowAnonymous]
    [EnableRateLimiting("PublicShare")]
    public async Task<IActionResult> DownloadSharedPhotos(string token, [FromQuery(Name = "seleccion")] string? selection)
    {
        ApplyPrivateResponseHeaders();
        var tarea = await GetSharedTaskAsync(token);
        if (tarea == null)
            return NotFound(new { message = "No hay fotos disponibles para este enlace" });

        var indexes = ParsePhotoSelection(selection, tarea.FotosUrls.Length);
        if (indexes == null || indexes.Count == 0)
            return BadRequest(new { message = "La selección de fotos no es válida" });

        await using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var added = 0;

            foreach (var index in indexes)
            {
                var media = await ReadAllowedMediaAsync(tarea.FotosUrls[index], HttpContext.RequestAborted);
                if (media == null)
                    continue;

                var entry = archive.CreateEntry($"fotos/foto-{++added:00}{media.Extension}", CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await entryStream.WriteAsync(media.Bytes, HttpContext.RequestAborted);

                if (zipStream.Length > MaxShareZipBytes)
                    return StatusCode(StatusCodes.Status413PayloadTooLarge,
                        new { message = "La descarga seleccionada es demasiado grande" });
            }

            if (added == 0)
                return NotFound(new { message = "No se pudieron localizar las fotos" });
        }

        zipStream.Position = 0;
        var fileName = $"fotos-{SafeFilePart(tarea.Id.ToString("N"))}.zip";
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

    private const int MaxSharedPhotoBytes = 15 * 1024 * 1024;
    private const long MaxShareZipBytes = 100L * 1024 * 1024;

    private async Task<TareaCampo?> GetSharedTaskAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 200)
            return null;

        var tokenHash = _shareTokens.Hash(token);
        return await _db.TareasCampo
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(t => t.Tramite).ThenInclude(t => t!.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Tramite).ThenInclude(t => t!.Vehiculo).ThenInclude(v => v!.Modelo)
            .FirstOrDefaultAsync(t => t.ShareTokenHash == tokenHash
                                      && t.ShareTokenRevocadoAt == null
                                      && t.ShareTokenExpira.HasValue
                                      && t.ShareTokenExpira.Value > DateTime.UtcNow
                                      && t.FotosUrls.Length > 0,
                HttpContext.RequestAborted);
    }

    private IActionResult SharedLinkNotFound()
    {
        Response.StatusCode = StatusCodes.Status404NotFound;
        ApplyPrivateResponseHeaders();
        return Content("<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Enlace no disponible</title></head><body><h1>Este enlace no está disponible</h1><p>Puede haber vencido o haber sido revocado.</p></body></html>", "text/html", Encoding.UTF8);
    }

    private string BuildGalleryHtml(TareaCampo tarea, string nonce)
    {
        var vehicle = GetSharedVehicleName(tarea);
        var vin = GetSharedVin(tarea);
        var expires = tarea.ShareTokenExpira.HasValue
            ? tarea.ShareTokenExpira.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm", System.Globalization.CultureInfo.GetCultureInfo("es-MX"))
            : string.Empty;
        var encoder = HtmlEncoder.Default;

        var html = new StringBuilder("""
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Fotos de __VEHICLE__ · R&amp;R Importaciones</title>
  <style nonce="__NONCE__">
    :root { color-scheme: light; --ink:#111827; --muted:#667085; --line:#e6e9ef; --red:#c61d26; --red-dark:#991b1b; --soft:#f7f8fb; }
    * { box-sizing:border-box; }
    body { margin:0; background:linear-gradient(145deg,#fff 0%,#f5f7fb 100%); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .shell { width:min(1180px,100%); margin:auto; padding:28px 18px 52px; }
    .header { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:24px; }
    .brand { color:var(--red); font-size:11px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:7px 0 4px; font-size:clamp(24px,4vw,38px); line-height:1.08; letter-spacing:-.04em; }
    .meta { margin:0; color:var(--muted); font-size:14px; }
    .notice { margin:0 0 22px; padding:13px 15px; border:1px solid #dbe4f0; border-radius:14px; background:#fff; color:#526071; font-size:13px; line-height:1.45; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:25px; }
    button { font:inherit; }
    .action { min-height:52px; border:0; border-radius:13px; padding:0 19px; cursor:pointer; font-size:14px; font-weight:850; transition:transform .15s,box-shadow .15s,background .15s; }
    .action:hover { transform:translateY(-1px); box-shadow:0 8px 22px rgba(17,24,39,.12); }
    .action:focus-visible,.photo-card:focus-visible,.icon-btn:focus-visible { outline:3px solid rgba(198,29,38,.3); outline-offset:3px; }
    .action--all { color:#fff; background:var(--red); box-shadow:0 7px 18px rgba(198,29,38,.18); }
    .action--select { color:#263244; background:#fff; border:1px solid #d6dce6; }
    .action--download { color:#fff; background:#166534; }
    .action--cancel { color:#526071; background:#fff; border:1px solid #d6dce6; }
    .selection-bar { display:none; align-items:center; flex-wrap:wrap; gap:10px; margin:-8px 0 22px; padding:12px 14px; border:1px solid #bbf7d0; border-radius:13px; background:#f0fdf4; color:#166534; font-size:13px; font-weight:750; }
    .selection-bar.is-visible { display:flex; }
    .selection-bar .selection-count { flex:1; min-width:170px; }
    .masonry { columns:4 220px; column-gap:14px; }
    .photo-card { display:block; position:relative; width:100%; margin:0 0 14px; padding:0; overflow:hidden; border:1px solid var(--line); border-radius:15px; background:#fff; cursor:pointer; break-inside:avoid; box-shadow:0 5px 18px rgba(17,24,39,.06); }
    .photo-card img { display:block; width:100%; height:auto; min-height:130px; object-fit:cover; background:#eef1f5; }
    .photo-card .check { display:none; position:absolute; top:10px; right:10px; width:26px; height:26px; place-items:center; border:2px solid #fff; border-radius:50%; color:#fff; background:var(--red); box-shadow:0 2px 7px rgba(0,0,0,.25); font-weight:900; }
    .select-mode .photo-card .check { display:grid; }
    .select-mode .photo-card.is-selected { border:3px solid var(--red); }
    .select-mode .photo-card.is-selected .check { background:#166534; }
    .photo-label { display:block; padding:9px 11px; color:#667085; text-align:left; font-size:11px; font-weight:750; }
    .lightbox { position:fixed; inset:0; z-index:5; display:grid; grid-template-rows:auto 1fr auto; padding:18px; background:rgba(3,7,18,.94); }
    .lightbox[hidden] { display:none; }
    .lightbox-top { display:flex; align-items:center; justify-content:space-between; gap:12px; color:#fff; }
    .lightbox-title { font-size:13px; font-weight:800; }
    .lightbox-count { margin-left:8px; color:#aeb8c8; font-size:12px; }
    .icon-btn { width:42px; height:42px; border:1px solid rgba(255,255,255,.2); border-radius:12px; color:#fff; background:rgba(255,255,255,.1); cursor:pointer; font-size:22px; }
    .lightbox-stage { position:relative; display:grid; place-items:center; min-height:0; padding:18px 46px; }
    .lightbox-stage img { max-width:100%; max-height:100%; object-fit:contain; border-radius:10px; }
    .lightbox-nav { position:absolute; top:50%; transform:translateY(-50%); width:44px; height:60px; border:0; border-radius:12px; color:#fff; background:rgba(255,255,255,.13); cursor:pointer; font-size:35px; }
    .lightbox-nav--prev { left:0; } .lightbox-nav--next { right:0; }
    .lightbox-bottom { color:#aeb8c8; text-align:center; font-size:12px; }
    @media (max-width:700px) { .shell { padding:20px 13px 38px; } .header { display:block; } .actions { display:grid; } .action { width:100%; } .masonry { columns:2 145px; column-gap:10px; } .photo-card { margin-bottom:10px; border-radius:11px; } .photo-label { padding:7px 8px; } .lightbox { padding:11px; } }
  </style>
</head>
<body>
  <main class="shell">
    <header class="header">
      <div>
        <div class="brand">R&amp;R Importaciones · Evidencia fotográfica</div>
        <h1>__VEHICLE__</h1>
        <p class="meta">__VIN__ · __PHOTO_COUNT__ fotos</p>
      </div>
    </header>
    <p class="notice">Esta galería es privada y temporal. El enlace vence el __EXPIRES__. Las fotos se sirven mediante este enlace y no se muestran las rutas internas del almacenamiento.</p>
    <div class="actions">
      <button id="download-all" class="action action--all" type="button">Descargar todas las fotos (ZIP)</button>
      <button id="manual-toggle" class="action action--select" type="button">Seleccionar fotos para descargar</button>
    </div>
    <div id="selection-bar" class="selection-bar" role="status" aria-live="polite">
      <span id="selection-count" class="selection-count">0 fotos seleccionadas</span>
      <button id="download-selected" class="action action--download" type="button" disabled>Descargar seleccionadas</button>
      <button id="cancel-selection" class="action action--cancel" type="button">Cancelar</button>
    </div>
    <section id="gallery" class="masonry" aria-label="Galería de fotos">
__PHOTO_CARDS__
    </section>
  </main>
  <section id="lightbox" class="lightbox" role="dialog" aria-modal="true" aria-label="Foto ampliada" hidden>
    <div class="lightbox-top"><span><span id="lightbox-title" class="lightbox-title">Foto</span><span id="lightbox-count" class="lightbox-count"></span></span><button id="lightbox-close" class="icon-btn" type="button" aria-label="Cerrar">×</button></div>
    <div class="lightbox-stage"><button id="lightbox-prev" class="lightbox-nav lightbox-nav--prev" type="button" aria-label="Foto anterior">‹</button><img id="lightbox-image" alt="Foto ampliada"><button id="lightbox-next" class="lightbox-nav lightbox-nav--next" type="button" aria-label="Foto siguiente">›</button></div>
    <div class="lightbox-bottom">Usa las flechas del teclado o desliza visualmente con los botones para recorrer las fotos.</div>
  </section>
  <script nonce="__NONCE__">
    (() => {
      'use strict';
      const basePath = window.location.pathname;
      const cards = Array.from(document.querySelectorAll('.photo-card'));
      const selection = new Set();
      let selectMode = false;
      let currentIndex = 0;
      const lightbox = document.getElementById('lightbox');
      const lightboxImage = document.getElementById('lightbox-image');
      const lightboxTitle = document.getElementById('lightbox-title');
      const lightboxCount = document.getElementById('lightbox-count');
      const selectionBar = document.getElementById('selection-bar');
      const selectionCount = document.getElementById('selection-count');
      const downloadSelected = document.getElementById('download-selected');
      const photoUrl = index => basePath + '/foto/' + encodeURIComponent(String(index));
      const downloadUrl = indexes => basePath + '/descarga' + (indexes.length ? '?seleccion=' + encodeURIComponent(indexes.join(',')) : '');
      document.querySelectorAll('img[data-index]').forEach(image => { image.src = photoUrl(Number(image.dataset.index)); });
      const updateSelection = () => {
        document.body.classList.toggle('select-mode', selectMode);
        selectionBar.classList.toggle('is-visible', selectMode);
        selectionCount.textContent = selection.size + (selection.size === 1 ? ' foto seleccionada' : ' fotos seleccionadas');
        downloadSelected.disabled = selection.size === 0;
        cards.forEach(card => {
          const index = Number(card.dataset.index);
          const selected = selection.has(index);
          card.classList.toggle('is-selected', selected);
          const check = card.querySelector('.check');
          if (check) check.textContent = selected ? '✓' : '';
        });
      };
      const showPhoto = index => {
        currentIndex = (index + cards.length) % cards.length;
        lightboxImage.src = photoUrl(currentIndex);
        lightboxImage.alt = 'Foto ' + (currentIndex + 1) + ' ampliada';
        lightboxTitle.textContent = 'Foto ' + (currentIndex + 1);
        lightboxCount.textContent = 'de ' + cards.length;
      };
      const openLightbox = index => { showPhoto(index); lightbox.hidden = false; document.getElementById('lightbox-close').focus(); };
      const closeLightbox = () => { lightbox.hidden = true; };
      cards.forEach(card => card.addEventListener('click', () => {
        const index = Number(card.dataset.index);
        if (selectMode) { selection.has(index) ? selection.delete(index) : selection.add(index); updateSelection(); }
        else openLightbox(index);
      }));
      document.getElementById('download-all').addEventListener('click', () => { window.location.href = downloadUrl([]); });
      document.getElementById('manual-toggle').addEventListener('click', () => { selectMode = true; updateSelection(); });
      document.getElementById('cancel-selection').addEventListener('click', () => { selectMode = false; selection.clear(); updateSelection(); });
      downloadSelected.addEventListener('click', () => { if (selection.size) window.location.href = downloadUrl(Array.from(selection).sort((a,b) => a-b)); });
      document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
      document.getElementById('lightbox-prev').addEventListener('click', () => showPhoto(currentIndex - 1));
      document.getElementById('lightbox-next').addEventListener('click', () => showPhoto(currentIndex + 1));
      document.addEventListener('keydown', event => { if (lightbox.hidden) return; if (event.key === 'Escape') closeLightbox(); if (event.key === 'ArrowLeft') showPhoto(currentIndex - 1); if (event.key === 'ArrowRight') showPhoto(currentIndex + 1); });
      updateSelection();
    })();
  </script>
</body>
</html>
""");

        var cards = new StringBuilder();
        for (var index = 0; index < tarea.FotosUrls.Length; index++)
        {
            cards.Append("      <button class=\"photo-card\" type=\"button\" data-index=\"")
                .Append(index)
                .Append("\"><img data-index=\"")
                .Append(index)
                .Append("\" alt=\"Foto ")
                .Append(index + 1)
                .Append(" del vehículo\" loading=\"lazy\"><span class=\"check\" aria-hidden=\"true\"></span><span class=\"photo-label\">Foto ")
                .Append(index + 1)
                .Append("</span></button>\n");
        }

        return html
            .Replace("__VEHICLE__", encoder.Encode(vehicle))
            .Replace("__VIN__", encoder.Encode(string.IsNullOrWhiteSpace(vin) ? "Unidad" : $"VIN {vin}"))
            .Replace("__PHOTO_COUNT__", tarea.FotosUrls.Length.ToString(System.Globalization.CultureInfo.InvariantCulture))
            .Replace("__EXPIRES__", encoder.Encode(expires))
            .Replace("__PHOTO_CARDS__", cards.ToString())
            .Replace("__NONCE__", encoder.Encode(nonce))
            .ToString();
    }

    private async Task<SharedMedia?> ReadAllowedMediaAsync(string url, CancellationToken cancellationToken)
    {
        var mediaUri = BuildAllowedMediaUri(url);
        if (mediaUri == null)
            return null;

        try
        {
            var client = _httpClientFactory.CreateClient();
            using var response = await client.GetAsync(mediaUri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return null;

            if (response.Content.Headers.ContentLength > MaxSharedPhotoBytes)
                return null;

            await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
            await using var buffer = new MemoryStream();
            var chunk = new byte[81920];
            var total = 0L;
            int read;
            while ((read = await source.ReadAsync(chunk, cancellationToken)) > 0)
            {
                total += read;
                if (total > MaxSharedPhotoBytes)
                    return null;
                await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
            }

            var extension = GetImageExtension(mediaUri.AbsolutePath);
            var contentType = response.Content.Headers.ContentType?.MediaType?.ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(contentType))
                contentType = extension switch
                {
                    ".png" => "image/png",
                    ".webp" => "image/webp",
                    _ => "image/jpeg",
                };

            if (contentType is not ("image/jpeg" or "image/png" or "image/webp")
                || !HasAllowedImageSignature(buffer.GetBuffer(), (int)buffer.Length, contentType))
                return null;

            return new SharedMedia(buffer.ToArray(), contentType, extension);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    private static List<int>? ParsePhotoSelection(string? selection, int photoCount)
    {
        if (photoCount <= 0 || photoCount > 200)
            return null;
        if (string.IsNullOrWhiteSpace(selection))
            return Enumerable.Range(0, photoCount).ToList();
        if (selection.Length > 800)
            return null;

        var values = new SortedSet<int>();
        foreach (var part in selection.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!int.TryParse(part, System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var index)
                || index < 0 || index >= photoCount)
                return null;
            values.Add(index);
        }

        return values.Count == 0 ? null : values.ToList();
    }

    private string GetPublicApiBaseUrl()
    {
        var configured = _configuration["PublicApp:BaseUrl"]?.Trim().TrimEnd('/');
        if (Uri.TryCreate(configured, UriKind.Absolute, out var configuredUri)
            && !IsLocalDevelopmentHost(configuredUri.Host))
            return configured!;

        return $"{Request.Scheme}://{Request.Host}";
    }

    private static bool IsLocalDevelopmentHost(string host) =>
        host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || host.Equals("::1", StringComparison.OrdinalIgnoreCase);

    private static string GetSharedVehicleName(TareaCampo tarea)
    {
        var vehicle = tarea.Vehiculo ?? tarea.Tramite?.Vehiculo;
        var summary = string.Join(' ', new[]
        {
            vehicle?.Marca?.Nombre,
            vehicle?.Modelo?.Nombre,
            vehicle?.Anno?.ToString(System.Globalization.CultureInfo.InvariantCulture),
        }.Where(value => !string.IsNullOrWhiteSpace(value)));

        return !string.IsNullOrWhiteSpace(summary)
            ? summary
            : tarea.DescripcionVehiculo ?? "Vehículo";
    }

    private static string? GetSharedVin(TareaCampo tarea) =>
        tarea.VinConfirmado ?? tarea.Vehiculo?.Vin ?? tarea.Tramite?.Vehiculo?.Vin;

    private void ApplyPrivateResponseHeaders(string? nonce = null)
    {
        Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers["X-Frame-Options"] = "DENY";
        Response.Headers["Referrer-Policy"] = "no-referrer";
        Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        Response.Headers["Cross-Origin-Resource-Policy"] = "same-origin";
        Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin";
        Response.Headers["Content-Security-Policy"] = nonce == null
            ? "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
            : $"default-src 'none'; img-src 'self'; style-src 'nonce-{nonce}'; script-src 'nonce-{nonce}'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
    }

    private static string GetImageExtension(string path)
    {
        var extension = Path.GetExtension(path).ToLowerInvariant();
        return extension is ".jpg" or ".jpeg" or ".png" or ".webp" ? extension : ".jpg";
    }

    private static bool HasAllowedImageSignature(byte[] bytes, int length, string contentType)
    {
        if (contentType == "image/jpeg")
            return length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;

        if (contentType == "image/png")
        {
            byte[] signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            return length >= signature.Length && bytes.AsSpan(0, signature.Length).SequenceEqual(signature);
        }

        return contentType == "image/webp"
            && length >= 12
            && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8)
            && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8);
    }

    private sealed record SharedMedia(byte[] Bytes, string ContentType, string Extension);

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
        {
            if (!url.StartsWith("/storage/", StringComparison.OrdinalIgnoreCase)
                || url.Contains("..", StringComparison.Ordinal)
                || url.Contains("%2e", StringComparison.OrdinalIgnoreCase)
                || url.Contains('\\')
                || url.Contains("?", StringComparison.Ordinal)
                || url.Contains("#", StringComparison.Ordinal))
                return null;

            return new Uri($"{Request.Scheme}://{Request.Host}{url}");
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var absolute) ||
            absolute.Scheme is not ("http" or "https"))
            return null;

        if (absolute.Scheme != Uri.UriSchemeHttps && !IsLocalDevelopmentHost(absolute.Host))
            return null;

        var configuredStorage = _configuration["Storage:R2:PublicBaseUrl"];
        if (Uri.TryCreate(configuredStorage, UriKind.Absolute, out var storageBase) &&
            string.Equals(absolute.Host, storageBase.Host, StringComparison.OrdinalIgnoreCase))
            return absolute;

        return null;
    }

    private static string SafeFilePart(string value) => Regex.Replace(value, @"[^A-Za-z0-9_-]", "-");
}
