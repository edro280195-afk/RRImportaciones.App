using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.PartnersExternos;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/partners-externos")]
[Authorize]
public class PartnersExternosController : ControllerBase
{
    private readonly IPartnerExternoService _service;

    public PartnersExternosController(IPartnerExternoService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool soloActivos = true)
    {
        var result = await _service.GetAllAsync(soloActivos);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePartnerExternoRequest request)
    {
        var result = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePartnerExternoRequest request)
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
