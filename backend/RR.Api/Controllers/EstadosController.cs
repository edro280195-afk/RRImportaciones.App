using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/estados")]
[Authorize]
public class EstadosController : ControllerBase
{
    private readonly ITramiteStateService _stateService;

    public EstadosController(ITramiteStateService stateService)
    {
        _stateService = stateService;
    }

    [HttpGet("{estadoActual}/transiciones")]
    public IActionResult GetTransiciones(string estadoActual)
    {
        var transiciones = _stateService.GetTransicionesPermitidas(estadoActual);
        return Ok(transiciones);
    }
}
