using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Api.Auth;
using RR.Application.DTOs.Entregas;
using RR.Application.DTOs.Tramites;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/tramites")]
[Authorize]
public class TramitesController : ControllerBase
{
    private readonly ITramiteService _tramiteService;
    private readonly IWebHostEnvironment _environment;
    private readonly IFileStorageService _fileStorageService;
    private readonly IPermisosUsuario _permisos;

    public TramitesController(
        ITramiteService tramiteService,
        IWebHostEnvironment environment,
        IFileStorageService fileStorageService,
        IPermisosUsuario permisos)
    {
        _tramiteService = tramiteService;
        _environment = environment;
        _fileStorageService = fileStorageService;
        _permisos = permisos;
    }

    [HttpGet]
    // PAGOS_VER también entra: la pantalla de pagos necesita la lista de
    // trámites para poder elegir contra cuál se registra el cobro, y los roles
    // de oficina no tienen TRAMITES_VER. Lo que sí se les recorta es el dinero
    // del trámite ajeno a su permiso — de eso se encarga FiltroDinero.
    [RequierePermiso(Permisos.TramitesVer, Permisos.PagosVer)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? estado,
        [FromQuery] Guid? tramitadorId,
        [FromQuery] Guid? clienteId,
        [FromQuery] Guid? aduanaId,
        [FromQuery] Guid? loteId,
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta,
        [FromQuery] string? orderBy,
        [FromQuery] string? orderDir,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _tramiteService.GetListAsync(search, estado, tramitadorId, clienteId, aduanaId, fechaDesde, fechaHasta, orderBy, orderDir, page, pageSize, loteId);
        return Ok(await FiltroDinero.AplicarAsync(_permisos, User, result));
    }

    [HttpGet("{id:guid}")]
    [RequierePermiso(Permisos.TramitesVer)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _tramiteService.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Trámite no encontrado" });
        return Ok(await FiltroDinero.AplicarAsync(_permisos, User, result));
    }

    [HttpPost]
    [RequierePermiso(Permisos.TramitesCrear)]
    public async Task<IActionResult> Create([FromBody] CreateTramiteRequest request)
    {
        try
        {
            var result = await _tramiteService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso(Permisos.TramitesEditar)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTramiteRequest request)
    {
        try
        {
            var result = await _tramiteService.UpdateAsync(id, request);
            return Ok(result);
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

    [HttpPost("{id:guid}/cambiar-estado")]
    [RequierePermiso(Permisos.TramitesEditar)]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CambiarEstadoRequest request)
    {
        try
        {
            var result = await _tramiteService.CambiarEstadoAsync(id, request);
            return Ok(result);
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

    [HttpPost("{id:guid}/pedimentos")]
    [RequierePermiso(Permisos.TramitesEditar)]
    public async Task<IActionResult> AgregarPedimento(Guid id, [FromBody] AgregarPedimentoRequest request)
    {
        try
        {
            var result = await _tramiteService.AgregarPedimentoAsync(id, request);
            return Ok(result);
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

    [HttpPost("{id:guid}/entregas")]
    [RequierePermiso(Permisos.TramitesEditar)]
    public async Task<IActionResult> AgregarEntrega(Guid id, [FromBody] CreateEntregaRequest request)
    {
        try
        {
            var result = await _tramiteService.AgregarEntregaAsync(id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/notas")]
    [RequierePermiso(Permisos.EventosCrear)]
    public async Task<IActionResult> AgregarNota(Guid id, [FromBody] AgregarNotaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Contenido))
            return BadRequest(new { message = "El contenido de la nota no puede estar vacío" });

        try
        {
            var result = await _tramiteService.AgregarNotaAsync(id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/documentos")]
    [RequierePermiso(Permisos.TramitesEditar)]
    public async Task<IActionResult> GuardarDocumento(Guid id, [FromBody] GuardarDocumentoTramiteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TipoDocumento))
            return BadRequest(new { message = "El tipo de documento es obligatorio" });

        try
        {
            var result = await _tramiteService.GuardarDocumentoAsync(id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // El dashboard resume cobranza y márgenes del negocio completo: es
    // información de dirección, no de la operación diaria de un rol
    // específico. Coincide con el mismo criterio del frontend
    // (AuthService.puedeVerDashboard) que oculta la sección "Inicio" del
    // menú y la ruta /inicio a cualquiera que no sea de estos tres roles.
    // Como el acceso completo ya es exclusivo de estos roles, no hace falta
    // además poner en ceros CobradoMes/PorCobrar para nadie más.
    [HttpGet("dashboard")]
    [Authorize(Roles = "ADMIN,DUEÑO,GERENTE")]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await _tramiteService.GetDashboardAsync();
        return Ok(result);
    }

    [HttpPost("upload-evidencia")]
    [RequestSizeLimit(10_485_760)]
    [RequierePermiso(Permisos.EventosCrear)]
    public async Task<IActionResult> UploadEvidencia(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo no válido" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".pdf" };
        if (!allowed.Contains(extension))
            return BadRequest(new { message = "Formato no permitido. Use jpg, jpeg, png o pdf" });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _fileStorageService.UploadFileAsync("evidencias", file.FileName, file.ContentType, stream, HttpContext.RequestAborted);
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error al subir evidencia: " + ex.Message });
        }
    }

    [HttpPost("upload-documento")]
    [RequestSizeLimit(10_485_760)]
    [RequierePermiso(Permisos.TramitesEditar)]
    public async Task<IActionResult> UploadDocumento(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "El documento es obligatorio" });

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "El documento no puede exceder 10 MB" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".pdf" };
        if (!allowed.Contains(extension))
            return BadRequest(new { message = "Formato no permitido. Use jpg, jpeg, png o pdf" });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _fileStorageService.UploadFileAsync("documentos", file.FileName, file.ContentType, stream, HttpContext.RequestAborted);
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error al subir documento: " + ex.Message });
        }
    }
}
