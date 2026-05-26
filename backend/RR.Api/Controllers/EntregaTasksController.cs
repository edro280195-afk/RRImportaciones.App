using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Entregas;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/entregas-campo")]
[Authorize]
public class EntregaTasksController : ControllerBase
{
    private readonly IEntregaTaskService _service;
    private readonly IFileStorageService _fileStorage;
    private readonly ICurrentUserService _currentUser;

    public EntregaTasksController(IEntregaTaskService service, IFileStorageService fileStorage, ICurrentUserService currentUser)
    {
        _service = service;
        _fileStorage = fileStorage;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetTareas([FromQuery] Guid? choferUserId, [FromQuery] string? estado)
    {
        // Si el usuario que consulta es chofer y no especifica otro ID, usar el propio
        var filtroChofer = choferUserId;
        return Ok(await _service.GetTareasAsync(filtroChofer, estado));
    }

    [HttpGet("mias")]
    public async Task<IActionResult> GetMias()
    {
        var userId = _currentUser.UserId;
        return Ok(await _service.GetTareasAsync(userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tarea = await _service.GetByIdAsync(id);
        return tarea == null ? NotFound(new { message = "Tarea de entrega no encontrada" }) : Ok(tarea);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearTareaEntregaRequest request)
    {
        try
        {
            return Ok(await _service.CrearAsync(request));
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

    [HttpPost("{id:guid}/tomar")]
    public async Task<IActionResult> Tomar(Guid id)
    {
        try
        {
            return Ok(await _service.TomarAsync(id));
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

    [HttpPost("{id:guid}/registrar")]
    public async Task<IActionResult> RegistrarEntrega(Guid id, [FromBody] RegistrarEntregaRequest request)
    {
        try
        {
            return Ok(await _service.RegistrarEntregaAsync(id, request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/fotos")]
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
            var url = await _fileStorage.UploadFileAsync($"entregas/{id:N}", file.FileName, file.ContentType, stream, HttpContext.RequestAborted);
            var tarea = await _service.AgregarFotoAsync(id, url);
            return Ok(new { fotoUrl = url, tarea });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
