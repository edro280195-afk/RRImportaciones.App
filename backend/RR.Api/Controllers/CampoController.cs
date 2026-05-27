using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Campo;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/campo")]
[Authorize]
public class CampoController : ControllerBase
{
    private readonly ICampoService _campoService;
    private readonly IFileStorageService _fileStorageService;

    public CampoController(ICampoService campoService, IFileStorageService fileStorageService)
    {
        _campoService = campoService;
        _fileStorageService = fileStorageService;
    }

    [HttpGet("tareas")]
    public async Task<IActionResult> GetTareas([FromQuery] string? EstadoLogistico)
    {
        return Ok(await _campoService.GetTareasAsync(EstadoLogistico));
    }

    [HttpGet("tareas/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tarea = await _campoService.GetByIdAsync(id);
        return tarea == null ? NotFound(new { message = "Tarea de campo no encontrada" }) : Ok(tarea);
    }

    [HttpPost("tareas")]
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
    public async Task<IActionResult> CrearPreInspeccion([FromBody] CrearPreInspeccionRequest request)
    {
        return Ok(await _campoService.CrearPreInspeccionAsync(request));
    }

    [HttpPost("tareas/{id:guid}/vincular")]
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
    [HttpPost("extract-vin")]
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
}
