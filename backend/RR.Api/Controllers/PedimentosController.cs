using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Tramites;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PedimentosController : ControllerBase
{
    private readonly IPedimentoService _pedimentoService;

    public PedimentosController(IPedimentoService pedimentoService)
    {
        _pedimentoService = pedimentoService;
    }

    [HttpGet]
    public async Task<ActionResult<List<PedimentoDto>>> GetAll([FromQuery] string? search)
    {
        var result = await _pedimentoService.GetAllAsync(search);
        return Ok(result);
    }
}
