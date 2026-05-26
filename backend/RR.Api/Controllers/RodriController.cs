using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Rodri;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

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

    [HttpPost("chat-stream")]
    public async Task ChatStream([FromBody] RodriChatRequest request, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        await foreach (var chunk in _rodriService.ChatStreamAsync(request, cancellationToken))
        {
            var json = JsonSerializer.Serialize(chunk);
            await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
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

    // ─────────────────────────────────────────────────────────────────────
    // STT — Speech-to-Text con Whisper (mejor calidad)
    // ─────────────────────────────────────────────────────────────────────
    [HttpPost("stt")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB máx
    public async Task<IActionResult> SpeechToText(IFormFile audio)
    {
        var apiKey = _config["OpenAi:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(503, new { error = "OpenAI no está configurado para transcripción." });

        if (audio == null || audio.Length == 0)
            return BadRequest(new { error = "No se recibió audio." });

        using var form = new MultipartFormDataContent();
        var streamContent = new StreamContent(audio.OpenReadStream());
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(audio.ContentType ?? "audio/webm");
        form.Add(streamContent, "file", audio.FileName ?? "audio.webm");
        form.Add(new StringContent("whisper-1"), "model");
        form.Add(new StringContent("es"), "language");
        // Vocabulario del negocio para mejorar precisión
        form.Add(new StringContent(
            "VIN, pedimento, aduana, fracción arancelaria, R&R Importaciones, " +
            "cotización, trámite, tramitador, desaduanamiento, despacho, " +
            "Nexus, folio, cobro, importación, cruce, retención"), "prompt");

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        var response = await client.PostAsync(
            "https://api.openai.com/v1/audio/transcriptions", form);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            return StatusCode(502, new { error = "Error de Whisper", detalle = err });
        }

        var result = await response.Content.ReadAsStringAsync();
        return Content(result, "application/json");
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

    [HttpGet("conversaciones")]
    public async Task<IActionResult> ListConversaciones(
        [FromServices] AppDbContext db,
        [FromServices] ICurrentUserService currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (!userId.HasValue) return Unauthorized();

        var list = await db.ConversacionesNexus
            .Where(c => c.UserId == userId.Value)
            .OrderByDescending(c => c.FechaUltimaActividad)
            .Select(c => new ConversacionNexusDto
            {
                Id = c.Id,
                Titulo = c.Titulo,
                Resumen = c.Resumen,
                FechaCreacion = c.FechaCreacion,
                FechaUltimaActividad = c.FechaUltimaActividad
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpGet("conversaciones/{id:guid}")]
    public async Task<IActionResult> GetConversacion(
        Guid id,
        [FromServices] AppDbContext db,
        [FromServices] ICurrentUserService currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (!userId.HasValue) return Unauthorized();

        var conv = await db.ConversacionesNexus
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId.Value, ct);
        if (conv == null) return NotFound("Conversación no encontrada.");

        var rawMsgs = await db.MensajesNexus
            .Where(m => m.ConversacionId == id)
            .OrderBy(m => m.Orden)
            .ToListAsync(ct);

        var msgs = rawMsgs.Select(m => new MensajeNexusDto
        {
            Id = m.Id,
            Role = m.Role,
            Texto = m.Texto,
            ImagenMime = m.ImagenMime,
            TieneImagen = m.TieneImagen,
            ToolCalls = !string.IsNullOrEmpty(m.ToolCallsJson) 
                ? JsonSerializer.Deserialize<List<string>>(m.ToolCallsJson, (JsonSerializerOptions)null!) 
                : null,
            Fecha = m.Fecha
        }).ToList();

        return Ok(msgs);
    }

    [HttpDelete("conversaciones/{id:guid}")]
    public async Task<IActionResult> DeleteConversacion(
        Guid id,
        [FromServices] AppDbContext db,
        [FromServices] ICurrentUserService currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (!userId.HasValue) return Unauthorized();

        var conv = await db.ConversacionesNexus
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId.Value, ct);
        if (conv == null) return NotFound("Conversación no encontrada.");

        var msgs = await db.MensajesNexus.Where(m => m.ConversacionId == id).ToListAsync(ct);
        db.MensajesNexus.RemoveRange(msgs);
        db.ConversacionesNexus.Remove(conv);

        await db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }
}
