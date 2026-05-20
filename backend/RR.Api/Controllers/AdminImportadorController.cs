using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Importador;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/admin/importador")]
[Authorize]
public class AdminImportadorController : ControllerBase
{
    private readonly IDataImportService _dataImportService;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IWebHostEnvironment _environment;

    public AdminImportadorController(
        IDataImportService dataImportService,
        ITenantContext tenantContext,
        ICurrentUserService currentUser,
        IWebHostEnvironment environment)
    {
        _dataImportService = dataImportService;
        _tenantContext = tenantContext;
        _currentUser = currentUser;
        _environment = environment;
    }

    [HttpPost("validar")]
    public async Task<IActionResult> Validar(IFormFile file, CancellationToken cancellationToken)
    {
        return await RunImport(file, dryRun: true, cancellationToken);
    }

    [HttpPost("importar")]
    public async Task<IActionResult> Importar(IFormFile file, CancellationToken cancellationToken)
    {
        return await RunImport(file, dryRun: false, cancellationToken);
    }

    private async Task<IActionResult> RunImport(IFormFile file, bool dryRun, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != "ADMIN")
            return Forbid();

        if (!_tenantContext.HasTenant)
            return BadRequest(new { message = "No se encontró tenant en la sesión" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Debe subir un archivo Excel" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".xlsx")
            return BadRequest(new { message = "Solo se aceptan archivos .xlsx" });

        var uploadsPath = Path.Combine(_environment.ContentRootPath, "storage", "imports");
        Directory.CreateDirectory(uploadsPath);
        var tempPath = Path.Combine(uploadsPath, $"{Guid.NewGuid()}{extension}");

        await using (var stream = System.IO.File.Create(tempPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        try
        {
            var result = await _dataImportService.ImportTramitesAsync(new ImportTramitesRequest
            {
                FilePath = tempPath,
                TenantId = _tenantContext.TenantId,
                DryRun = dryRun,
            }, cancellationToken);

            return Ok(result);
        }
        finally
        {
            if (System.IO.File.Exists(tempPath))
                System.IO.File.Delete(tempPath);
        }
    }
}
