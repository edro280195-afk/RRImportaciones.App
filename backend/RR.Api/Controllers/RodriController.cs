using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RR.Application.DTOs.Rodri;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/rodri")]
[Authorize(Roles = "ADMIN")]
public class RodriController : ControllerBase
{
    private readonly IRodriService _rodriService;

    public RodriController(IRodriService rodriService)
    {
        _rodriService = rodriService;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] RodriChatRequest request)
    {
        var response = await _rodriService.ChatAsync(request);
        return Ok(response);
    }

    [HttpGet("providers")]
    public async Task<IActionResult> GetProviders()
    {
        var response = await _rodriService.GetProvidersAsync();
        return Ok(response);
    }
}
