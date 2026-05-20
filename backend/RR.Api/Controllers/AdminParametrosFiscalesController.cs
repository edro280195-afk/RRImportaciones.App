using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/admin/parametros-fiscales")]
[Authorize(Roles = "ADMIN")]
public class AdminParametrosFiscalesController : ControllerBase
{
    private readonly IParametroFiscalService _service;

    public AdminParametrosFiscalesController(IParametroFiscalService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpPut("{regimen}")]
    public async Task<IActionResult> Update(string regimen, [FromBody] UpdateParametroFiscalRequest request)
    {
        return Ok(await _service.UpdateAsync(regimen, request));
    }
}
