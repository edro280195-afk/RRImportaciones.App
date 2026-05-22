using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using RR.Application.DTOs.Rodri;
using RR.Application.Interfaces;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/rodri")]
[Authorize(Roles = "ADMIN,DUEÑO")]
public class RodriController : ControllerBase
{
    private readonly IRodriService _rodriService;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public RodriController(
        IRodriService rodriService,
        IConfiguration config,
        IHttpClientFactory httpClientFactory)
    {
        _rodriService = rodriService;
        _config = config;
        _httpClientFactory = httpClientFactory;
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

    // ─────────────────────────────────────────────────────────────────────
    // TTS — convierte respuesta de Rodri a audio con ElevenLabs
    // ─────────────────────────────────────────────────────────────────────
    [HttpPost("tts")]
    public async Task<IActionResult> TextToSpeech([FromBody] RodriTtsRequest request)
    {
        var apiKey = _config["ElevenLabs:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(503, new { error = "ElevenLabs no está configurado en el servidor." });

        if (string.IsNullOrWhiteSpace(request.Texto))
            return BadRequest(new { error = "El texto no puede estar vacío." });

        var voiceId = _config["ElevenLabs:VoiceId"] ?? "pNInz6obpgDQGcFmaJgB";
        var modelId = _config["ElevenLabs:ModelId"] ?? "eleven_flash_v2_5";

        // Limpiar markdown y HTML para que la voz suene natural
        var texto = LimpiarParaTts(request.Texto);

        // Límite de caracteres para cuidar la cuota del plan gratuito
        if (texto.Length > 2000) texto = texto[..2000];

        var payload = JsonSerializer.Serialize(new
        {
            text = texto,
            model_id = modelId,
            voice_settings = new
            {
                stability = 0.50,
                similarity_boost = 0.75,
                style = 0.0,
                use_speaker_boost = true
            }
        });

        var client = _httpClientFactory.CreateClient();
        var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=mp3_44100_64")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        httpRequest.Headers.Add("xi-api-key", apiKey);

        using var response = await client.SendAsync(httpRequest);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            // Siempre 502 — NUNCA proxificar status de ElevenLabs directo.
            // Un 401 de ElevenLabs (API key inválida) o 429 (rate limit) jamás debe llegar
            // al frontend como 401, o el interceptor de auth lo confundirá con sesión expirada.
            return StatusCode(502, new { error = "Error de ElevenLabs", detalle = err });
        }

        var audioBytes = await response.Content.ReadAsByteArrayAsync();
        return File(audioBytes, "audio/mpeg");
    }

    // Limpia texto para que ElevenLabs no lea símbolos de markdown
    private static string LimpiarParaTts(string texto)
    {
        texto = Regex.Replace(texto, @"\*\*(.+?)\*\*", "$1");      // **negritas**
        texto = Regex.Replace(texto, @"\*(.+?)\*", "$1");          // *itálicas*
        texto = Regex.Replace(texto, @"`[^`]+`", "");               // `código`
        texto = Regex.Replace(texto, @"<[^>]+>", "");               // <html>
        texto = Regex.Replace(texto, @"#{1,6}\s", "");              // # títulos
        texto = Regex.Replace(texto, @"\[([^\]]+)\]\([^)]+\)", "$1"); // [links](url)
        texto = Regex.Replace(texto, @"\s+", " ").Trim();
        return texto;
    }
}
