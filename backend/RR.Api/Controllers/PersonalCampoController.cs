using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Api.Auth;
using RR.Application.DTOs.PersonalCampo;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/personal-campo")]
[Authorize]
public class PersonalCampoController : ControllerBase
{
    private readonly IPersonalCampoService _service;

    public PersonalCampoController(IPersonalCampoService service) => _service = service;

    [HttpGet]
    [RequierePermiso(Permisos.UsuariosVer, Permisos.TramitesAsignar, Permisos.CatalogosVer)]
    public async Task<IActionResult> GetAll([FromQuery] bool soloActivos = true)
    {
        var result = await _service.GetAllAsync(soloActivos);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequierePermiso(Permisos.UsuariosVer, Permisos.TramitesAsignar, Permisos.CatalogosVer)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [RequierePermiso(Permisos.CatalogosEditar)]
    public async Task<IActionResult> Create([FromBody] CreatePersonalCampoRequest request)
    {
        var result = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso(Permisos.CatalogosEditar)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePersonalCampoRequest request)
    {
        try
        {
            var result = await _service.UpdateAsync(id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso(Permisos.CatalogosEditar)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
