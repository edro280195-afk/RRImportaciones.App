using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.DTOs.Rodri;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class RodriService : IRodriService
{
    private readonly HttpClient _httpClient;
    private readonly AppDbContext _db;
    private readonly string? _openAiKey;
    private readonly string? _geminiKey;
    private readonly string _provider;
    private readonly IEnumerable<IRodriTool> _tools;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly Dictionary<string, IRodriTool> _toolMap;
    private readonly ICurrentUserService _currentUser;

    // Cache del system prompt
    private string? _cachedSystemPrompt;
    private string? _cachedSystemPromptRole;
    private DateTime _promptCacheTime = DateTime.MinValue;
    private static readonly TimeSpan PromptCacheDuration = TimeSpan.FromSeconds(30);

    // Rate limiting
    private static readonly ConcurrentDictionary<string, List<DateTime>> _requestLog = new();
    private const int MaxRequestsPerMinute = 20;

    // Estados donde el vehículo aún está en proceso (no entregado al cliente)
    private static readonly string[] EstadosOperativos =
    [
        "PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS",
        "REQUISITOS_PENDIENTES", "BAJA_EN_PROCESO", "BAJA_COMPLETADA",
        "LISTO_PARA_PEDIMENTO", "PEDIMENTO_DOCUMENTADO", "PAGO_PEDIMENTO_PENDIENTE",
        "MANDADO_A_CRUCE", "EN_PROCESO", "ROJO_DESADUANADO"
    ];

    // Estados post-entrega: el vehículo ya salió de aduana o se entregó al cliente,
    // pero puede haber saldo pendiente de cobro. Un trámite aquí con saldo=0
    // debería moverse a COBRADO manualmente.
    private static readonly string[] EstadosPostEntrega =
    [
        "VERDE_ENTREGADO", "ENTREGADO_AL_CLIENTE", "AMARILLO_PENDIENTE_PAGO"
    ];

    // Todos los estados no cerrados (para queries generales)
    private static readonly string[] EstadosActivos =
    [
        "PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS",
        "REQUISITOS_PENDIENTES", "BAJA_EN_PROCESO", "BAJA_COMPLETADA",
        "LISTO_PARA_PEDIMENTO", "PEDIMENTO_DOCUMENTADO", "PAGO_PEDIMENTO_PENDIENTE",
        "MANDADO_A_CRUCE", "EN_PROCESO", "ROJO_DESADUANADO",
        "VERDE_ENTREGADO", "ENTREGADO_AL_CLIENTE", "AMARILLO_PENDIENTE_PAGO"
    ];

    public RodriService(
        HttpClient httpClient,
        AppDbContext db,
        IConfiguration config,
        IEnumerable<IRodriTool> tools,
        IServiceScopeFactory scopeFactory,
        ICurrentUserService currentUser)
    {
        _httpClient = httpClient;
        _db = db;
        _httpClient.Timeout = TimeSpan.FromSeconds(120);
        // Busca la clave en múltiples fuentes para mayor robustez (variables de entorno en Render
        // pueden estar en distintas capitalizaciones; .NET IConfiguration es case-insensitive,
        // pero el nombre exacto de la variable de entorno sí importa en Linux).
        _openAiKey = config["OpenAi:ApiKey"]
            ?? config["OpenAI:ApiKey"]
            ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY")
            ?? Environment.GetEnvironmentVariable("OpenAI_API_KEY")
            ?? Environment.GetEnvironmentVariable("OpenAi__ApiKey");
        _geminiKey = config["GeminiApiKey"];
        _provider = config["AiProvider"] ?? "openai";
        _tools = tools;
        _scopeFactory = scopeFactory;
        _toolMap = tools.ToDictionary(t => t.Name, StringComparer.OrdinalIgnoreCase);
        _currentUser = currentUser;
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET PROVIDERS
    // ─────────────────────────────────────────────────────────────────────
    public Task<RodriProvidersResponse> GetProvidersAsync()
    {
        var openAiAvailable = !string.IsNullOrWhiteSpace(_openAiKey);
        var geminiAvailable = !string.IsNullOrWhiteSpace(_geminiKey);

        return Task.FromResult(new RodriProvidersResponse
        {
            Default = _provider,
            Providers =
            [
                new RodriProviderInfo
                {
                    Id = "openai",
                    Label = "GPT-4o",
                    HasTools = true,
                    IsAvailable = openAiAvailable
                },
                new RodriProviderInfo
                {
                    Id = "gemini",
                    Label = "Gemini 2.5 Flash",
                    HasTools = true,
                    IsAvailable = geminiAvailable
                }
            ]
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // CHAT — punto de entrada principal
    // ─────────────────────────────────────────────────────────────────────
    public async Task<RodriChatResponse> ChatAsync(RodriChatRequest request)
    {
        try
        {
            // Rate limiting
            var ahora = DateTime.UtcNow;
            var ventana = ahora.AddMinutes(-1);
            var logs = _requestLog.GetOrAdd("global", _ => []);
            lock (logs)
            {
                logs.RemoveAll(t => t < ventana);
                if (logs.Count >= MaxRequestsPerMinute)
                {
                    return new RodriChatResponse
                    {
                        Respuesta = "Se ha alcanzado el límite de consultas por minuto. Espera unos segundos e intenta de nuevo.",
                        Error = true
                    };
                }
                logs.Add(ahora);
            }

            var systemPrompt = await GetCachedSystemPromptAsync(_currentUser.Role);

            // Elegir proveedor: request.Provider > config
            var activeProvider = (!string.IsNullOrWhiteSpace(request.Provider))
                ? request.Provider
                : _provider;

            if (activeProvider == "gemini")
                return await CallGeminiAsync(systemPrompt, request);
            else
                return await CallOpenAiAsync(systemPrompt, request);
        }
        catch (TaskCanceledException)
        {
            return new RodriChatResponse
            {
                Respuesta = "La consulta tardó demasiado. Intenta con una pregunta más específica.",
                Error = true
            };
        }
        catch (HttpRequestException)
        {
            return new RodriChatResponse
            {
                Respuesta = "No pude conectarme al servicio de IA. Revisa la conexión del servidor.",
                Error = true
            };
        }
        catch (Exception ex)
        {
            return new RodriChatResponse
            {
                Respuesta = $"Ocurrió un error al procesar tu solicitud: {ex.Message}",
                Error = true
            };
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // CHAT STREAMING
    // ─────────────────────────────────────────────────────────────────────
    public async IAsyncEnumerable<RodriStreamChunk> ChatStreamAsync(RodriChatRequest request, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        // Rate limiting
        var ahora = DateTime.UtcNow;
        var ventana = ahora.AddMinutes(-1);
        var logs = _requestLog.GetOrAdd("global", _ => []);
        lock (logs)
        {
            logs.RemoveAll(t => t < ventana);
            if (logs.Count >= MaxRequestsPerMinute)
            {
                yield return new RodriStreamChunk
                {
                    Type = "error",
                    Content = "Se ha alcanzado el límite de consultas por minuto. Espera unos segundos e intenta de nuevo."
                };
                yield break;
            }
            logs.Add(ahora);
        }

        RodriChatResponse response = null!;
        string? errorMessage = null;
        try
        {
            var systemPrompt = await GetCachedSystemPromptAsync(_currentUser.Role);
            var activeProvider = (!string.IsNullOrWhiteSpace(request.Provider)) ? request.Provider : _provider;

            if (activeProvider == "gemini")
                response = await CallGeminiAsync(systemPrompt, request);
            else
                response = await CallOpenAiAsync(systemPrompt, request);
        }
        catch (TaskCanceledException)
        {
            errorMessage = "La consulta tardó demasiado. Intenta con una pregunta más específica.";
        }
        catch (HttpRequestException)
        {
            errorMessage = "No pude conectarme al servicio de IA. Revisa la conexión del servidor.";
        }
        catch (Exception ex)
        {
            errorMessage = $"Ocurrió un error al procesar tu solicitud: {ex.Message}";
        }

        if (errorMessage != null)
        {
            yield return new RodriStreamChunk { Type = "error", Content = errorMessage };
            yield break;
        }

        // Enviar tool calls ejecutados
        if (response.ToolCallsEjecutados?.Count > 0)
        {
            foreach (var tool in response.ToolCallsEjecutados)
                yield return new RodriStreamChunk { Type = "tool_call", ToolName = tool };
        }

        // Enviar provider info
        yield return new RodriStreamChunk { Type = "provider", Provider = response.Provider, ProviderLabel = response.ProviderLabel };

        if (response.Error)
        {
            yield return new RodriStreamChunk { Type = "error", Content = response.Respuesta };
            yield break;
        }

        // Streaming del texto en chunks
        var text = response.Respuesta;
        if (string.IsNullOrEmpty(text))
        {
            yield return new RodriStreamChunk { Type = "done" };
            yield break;
        }

        var chunkSize = 3; // caracteres por chunk para sensación natural
        for (int i = 0; i < text.Length; i += chunkSize)
        {
            if (cancellationToken.IsCancellationRequested) yield break;
            var chunk = text.Substring(i, Math.Min(chunkSize, text.Length - i));
            yield return new RodriStreamChunk { Type = "token", Content = chunk };
            await Task.Delay(15, cancellationToken).ContinueWith(_ => { }, CancellationToken.None);
        }

        yield return new RodriStreamChunk { Type = "done" };
    }

    // ──── RUTA GEMINI ────────────────────────────────────────────────────
    private async Task<RodriChatResponse> CallGeminiAsync(string systemPrompt, RodriChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(_geminiKey))
        {
            return new RodriChatResponse
            {
                Respuesta = "Gemini no tiene API key configurada. Revisa GeminiApiKey en la configuración.",
                Error = true
            };
        }

        var toolDefs = BuildGeminiTools();
        var toolsEjecutados = new List<string>();
        var messages = BuildGeminiMessages(request);
        var finalResponse = await ExecuteGeminiFunctionCallingLoopAsync(messages, toolDefs, systemPrompt, toolsEjecutados, 0);

        return new RodriChatResponse
        {
            Respuesta = finalResponse,
            Error = finalResponse.StartsWith("Error") || finalResponse.StartsWith("El asistente llegó"),
            ToolCallsEjecutados = toolsEjecutados.Count > 0 ? toolsEjecutados : null,
            Provider = "gemini",
            ProviderLabel = "Gemini 2.5 Flash"
        };
    }

    private object BuildGeminiTools()
    {
        var declarations = new List<object>();
        foreach (var tool in _tools)
            declarations.Add(new
            {
                name = tool.Name,
                description = tool.Description,
                parameters = tool.ParametersSchema
            });
        return new[] { new { function_declarations = declarations } };
    }

    private List<object> BuildGeminiMessages(RodriChatRequest request)
    {
        var contents = new List<object>();
        foreach (var item in request.Historial)
        {
            var role = item.Role == "model" ? "model" : "user";
            contents.Add(new { role, parts = new[] { new { text = item.Texto } } });
        }

        // Mensaje actual del usuario, con imagen opcional
        var userParts = new List<object> { new { text = request.Mensaje } };
        if (!string.IsNullOrWhiteSpace(request.ImagenBase64) && !string.IsNullOrWhiteSpace(request.ImagenMime))
            userParts.Add(new { inline_data = new { mime_type = request.ImagenMime, data = request.ImagenBase64 } });
        contents.Add(new { role = "user", parts = userParts.ToArray() });

        return contents;
    }

    private async Task<string> ExecuteGeminiFunctionCallingLoopAsync(
        List<object> contents, object tools, string systemPrompt, List<string> toolsEjecutados, int depth)
    {
        if (depth >= 5)
            return "El asistente llegó al límite de operaciones encadenadas. Por favor reformula tu solicitud.";

        var payload = new Dictionary<string, object>
        {
            ["contents"] = contents,
            ["tools"] = tools,
            ["system_instruction"] = new { parts = new[] { new { text = systemPrompt } } },
            ["generationConfig"] = new { temperature = 0.4, maxOutputTokens = 4096 }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_geminiKey}";
        using var response = await SendWithRetryGeminiAsync(url, payload);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            return $"Error de Gemini ({(int)response.StatusCode}): {Truncate(errorBody, 200)}";
        }

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());

        if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return "Gemini no generó ninguna respuesta. Intenta reformular la pregunta.";

        var candidate = candidates[0];
        if (!candidate.TryGetProperty("content", out var content))
            return "Gemini respondió sin contenido.";

        var parts = content.GetProperty("parts");
        var textBuilder = new StringBuilder();
        List<object>? functionCallParts = null;

        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var textVal))
                textBuilder.Append(textVal.GetString());

            if (part.TryGetProperty("functionCall", out var funcCall))
            {
                functionCallParts ??= new List<object>();
                var name = funcCall.GetProperty("name").GetString()!;
                var args = funcCall.TryGetProperty("args", out var a) ? a.ToString() : "{}";
                functionCallParts.Add(new { functionCall = new { name, args = JsonDocument.Parse(args).RootElement.Clone() } });
            }
        }

        // Si hay function calls, ejecutarlos y loop
        if (functionCallParts != null && functionCallParts.Count > 0)
        {
            // Agregar la respuesta del modelo con los function calls al historial
            var modelParts = new List<object>();
            if (textBuilder.Length > 0)
                modelParts.Add(new { text = textBuilder.ToString() });
            modelParts.AddRange(functionCallParts);
            contents.Add(new { role = "model", parts = modelParts.ToArray() });

            foreach (var fc in functionCallParts)
            {
                // Extraer el nombre del function call de forma manual
                var json = JsonSerializer.Serialize(fc);
                using var fcDoc = JsonDocument.Parse(json);
                var name = fcDoc.RootElement.GetProperty("functionCall").GetProperty("name").GetString()!;
                var argsStr = fcDoc.RootElement.GetProperty("functionCall").GetProperty("args").GetRawText();

                toolsEjecutados.Add(name);

                string result;
                if (_toolMap.TryGetValue(name, out var tool))
                {
                    try
                    {
                        using var toolScope = _scopeFactory.CreateScope();
                        result = await tool.ExecuteAsync(argsStr, toolScope.ServiceProvider);
                    }
                    catch (Exception ex)
                    {
                        result = JsonSerializer.Serialize(new { error = $"Error ejecutando {name}: {ex.Message}" });
                    }
                }
                else
                {
                    result = JsonSerializer.Serialize(new { error = $"La herramienta '{name}' no está disponible." });
                }

                contents.Add(new
                {
                    role = "function",
                    parts = new[]
                    {
                        new
                        {
                            functionResponse = new
                            {
                                name,
                                response = new { result }
                            }
                        }
                    }
                });
            }

            return await ExecuteGeminiFunctionCallingLoopAsync(contents, tools, systemPrompt, toolsEjecutados, depth + 1);
        }

        return textBuilder.Length > 0 ? textBuilder.ToString() : "Gemini respondió sin texto. Intenta reformular.";
    }

    private static string? ExtractSystemFromContents(List<object> contents)
    {
        // El system prompt se pasa aparte en Gemini, no en contents
        // Lo extraemos del primer mensaje que tenga role "system" si existe
        return null; // Se maneja via system_instruction en el payload
    }

    private async Task<HttpResponseMessage> SendWithRetryGeminiAsync(string url, object payload)
    {
        HttpResponseMessage? lastResponse = null;

        for (var attempt = 1; attempt <= 2; attempt++)
        {
            lastResponse = await _httpClient.PostAsJsonAsync(url, payload);
            if (lastResponse.IsSuccessStatusCode || (int)lastResponse.StatusCode < 500)
                return lastResponse;

            if (attempt == 1)
            {
                lastResponse.Dispose();
                await Task.Delay(800);
            }
        }

        return lastResponse!;
    }

    private static string? TryReadGeminiText(JsonDocument doc)
    {
        if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return null;

        var first = candidates[0];
        if (!first.TryGetProperty("content", out var content) ||
            !content.TryGetProperty("parts", out var parts) ||
            parts.GetArrayLength() == 0)
            return null;

        return parts[0].TryGetProperty("text", out var text) ? text.GetString() : null;
    }

    // ──── RUTA OPENAI ───────────────────────────────────────────────────
    private async Task<RodriChatResponse> CallOpenAiAsync(string systemPrompt, RodriChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(_openAiKey))
        {
            return new RodriChatResponse
            {
                Respuesta = "OpenAI no tiene API key configurada. Configura OpenAi:ApiKey o la variable OPENAI_API_KEY.",
                Error = true
            };
        }

        var toolDefs = BuildOpenAiTools();

        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

        foreach (var item in request.Historial)
            messages.Add(new { role = item.Role, content = item.Texto });

        messages.Add(new { role = "user", content = request.Mensaje });

        var toolsEjecutados = new List<string>();
        var finalResponse = await ExecuteFunctionCallingLoopAsync(messages, toolDefs, toolsEjecutados, 0);

        // Si la respuesta es un mensaje de error, marcar Error=true para que el frontend
        // no llame a speak() ni TTS con texto de error
        var isError = finalResponse.StartsWith("Error de OpenAI")
                   || finalResponse.StartsWith("El asistente llegó al límite");

        return new RodriChatResponse
        {
            Respuesta = finalResponse,
            Error = isError,
            ToolCallsEjecutados = !isError && toolsEjecutados.Count > 0 ? toolsEjecutados : null,
            Provider = "openai",
            ProviderLabel = "GPT-4"
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // FUNCTION CALLING LOOP (OpenAI)
    // ─────────────────────────────────────────────────────────────────────
    private async Task<string> ExecuteFunctionCallingLoopAsync(
        List<object> messages, object? tools, List<string> toolsEjecutados, int depth)
    {
        if (depth >= 5)
            return "El asistente llegó al límite de operaciones encadenadas. Por favor reformula tu solicitud.";

        var requestBody = new Dictionary<string, object>
        {
            ["model"] = "gpt-4o",
            ["messages"] = messages,
            ["temperature"] = 0.3,
            ["max_tokens"] = 4096
        };

        if (tools != null)
            requestBody["tools"] = tools;

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _openAiKey);
        request.Content = content;

        using var response = await SendWithRetryOpenAiAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            try
            {
                using var errorDoc = JsonDocument.Parse(errorBody);
                var msg = errorDoc.RootElement.TryGetProperty("error", out var err)
                    ? err.TryGetProperty("message", out var m) ? m.GetString() ?? errorBody
                    : errorBody
                    : errorBody;
                return $"Error de OpenAI ({response.StatusCode}): {msg}";
            }
            catch
            {
                return $"Error de OpenAI ({response.StatusCode}): {errorBody}";
            }
        }

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());

        var choice = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message");

        var role = choice.GetProperty("role").GetString();
        var contentText = choice.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String
            ? c.GetString() ?? ""
            : "";

        if (choice.TryGetProperty("tool_calls", out var toolCalls) && toolCalls.GetArrayLength() > 0)
        {
            var assistantMsg = BuildAssistantMessageWithToolCalls(role!, contentText, toolCalls);
            messages.Add(assistantMsg);

            foreach (var tc in toolCalls.EnumerateArray())
            {
                var toolCallId = tc.GetProperty("id").GetString()!;
                var func = tc.GetProperty("function");
                var funcName = func.GetProperty("name").GetString()!;
                var funcArgs = func.GetProperty("arguments").GetString()!;

                toolsEjecutados.Add(funcName);

                string result;
                if (_toolMap.TryGetValue(funcName, out var tool))
                {
                    try
                    {
                        using var toolScope = _scopeFactory.CreateScope();
                        result = await tool.ExecuteAsync(funcArgs, toolScope.ServiceProvider);
                    }
                    catch (Exception ex)
                    {
                        result = JsonSerializer.Serialize(new { error = $"Error ejecutando {funcName}: {ex.Message}" });
                    }
                }
                else
                {
                    result = JsonSerializer.Serialize(new { error = $"La herramienta '{funcName}' no está disponible." });
                }

                messages.Add(new
                {
                    role = "tool",
                    tool_call_id = toolCallId,
                    content = result
                });
            }

            return await ExecuteFunctionCallingLoopAsync(messages, tools, toolsEjecutados, depth + 1);
        }

        return contentText;
    }

    private object BuildOpenAiTools()
    {
        var toolsList = new List<object>();
        foreach (var tool in _tools)
        {
            toolsList.Add(new
            {
                type = "function",
                function = new
                {
                    name = tool.Name,
                    description = tool.Description,
                    parameters = tool.ParametersSchema
                }
            });
        }
        return toolsList;
    }

    private static object BuildAssistantMessageWithToolCalls(string role, string content, JsonElement toolCalls)
    {
        var calls = new List<object>();
        foreach (var tc in toolCalls.EnumerateArray())
        {
            calls.Add(new
            {
                id = tc.GetProperty("id").GetString(),
                type = tc.GetProperty("type").GetString(),
                function = new
                {
                    name = tc.GetProperty("function").GetProperty("name").GetString(),
                    arguments = tc.GetProperty("function").GetProperty("arguments").GetString()
                }
            });
        }

        return new
        {
            role,
            content = string.IsNullOrEmpty(content) ? null : content,
            tool_calls = calls.ToArray()
        };
    }

    private async Task<HttpResponseMessage> SendWithRetryOpenAiAsync(HttpRequestMessage request)
    {
        HttpResponseMessage? lastResponse = null;

        for (var attempt = 1; attempt <= 2; attempt++)
        {
            if (attempt > 1)
            {
                var body = await request.Content!.ReadAsStringAsync();
                request = new HttpRequestMessage(HttpMethod.Post, request.RequestUri)
                {
                    Content = new StringContent(body, Encoding.UTF8, "application/json"),
                    Headers = { Authorization = new AuthenticationHeaderValue("Bearer", _openAiKey) }
                };
            }

            lastResponse = await _httpClient.SendAsync(request);
            if (lastResponse.IsSuccessStatusCode || (int)lastResponse.StatusCode < 500)
                return lastResponse;

            if (attempt == 1)
            {
                lastResponse.Dispose();
                await Task.Delay(1000);
            }
        }

        return lastResponse!;
    }

    // ─────────────────────────────────────────────────────────────────────
    // SYSTEM PROMPT — conocimiento del sistema + datos del negocio
    // ─────────────────────────────────────────────────────────────────────
    private async Task<string> GetCachedSystemPromptAsync(string? userRole)
    {
        if (_cachedSystemPrompt != null
            && _cachedSystemPromptRole == userRole
            && DateTime.UtcNow - _promptCacheTime < PromptCacheDuration)
            return _cachedSystemPrompt;

        _cachedSystemPrompt = await BuildSystemPromptAsync(userRole);
        _cachedSystemPromptRole = userRole;
        _promptCacheTime = DateTime.UtcNow;
        return _cachedSystemPrompt;
    }

    private async Task<string> BuildSystemPromptAsync(string? userRole)
    {
        var now = DateTime.UtcNow;
        var cultura = new CultureInfo("es-MX");

        var tramitesActivos = await _db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Tramitador)
            .Where(t => EstadosActivos.Contains(t.EstadoLogistico))
            .OrderBy(t => t.FechaCreacion)
            .ToListAsync();

        var pagosPorTramite = await _db.Pagos
            .GroupBy(p => p.TramiteId)
            .Select(g => new { TramiteId = g.Key, Total = g.Sum(p => p.Monto) })
            .ToDictionaryAsync(x => x.TramiteId, x => x.Total);

        var clientesCount = await _db.Clientes.CountAsync();

        var cotizacionesActivas = await _db.Cotizaciones
            .Include(c => c.Cliente)
            .Where(c => c.EstadoLogistico != "EXPIRADA" && c.EstadoLogistico != "RECHAZADA" && c.EstadoLogistico != "CONVERTIDA")
            .OrderByDescending(c => c.FechaCreacion)
            .ToListAsync();

        var pedimentosPendientesCount = await _db.Pedimentos
            .Where(p => p.EstadoLogistico != "PAGADO").CountAsync();

        var saldoTotalPendiente = tramitesActivos
            .Sum(t => t.CobroTotal - pagosPorTramite.GetValueOrDefault(t.Id, 0));
        var tramitesPorEstatus = tramitesActivos
            .GroupBy(t => t.EstadoLogistico)
            .ToDictionary(g => g.Key, g => g.Count());

        var enRetencion = tramitesActivos
            .Where(t => t.EstadoLogistico == "EN_RETENCION" && t.FechaEstadoActual.HasValue
                        && (now - t.FechaEstadoActual.Value).TotalDays > 7)
            .ToList();

        var sinMovimiento = tramitesActivos
            .Where(t => t.FechaEstadoActual.HasValue
                        && (now - t.FechaEstadoActual.Value).TotalDays > 15
                        && t.EstadoLogistico != "EN_RETENCION")
            .ToList();

        var cotizacionesXVencer = cotizacionesActivas
            .Where(c => c.FechaExpiracion.HasValue
                        && c.FechaExpiracion.Value <= now.AddDays(3)
                        && c.EstadoLogistico == "ENVIADA")
            .ToList();

        // ─────────────────────────────────────────────────────────────────
        var sb = new StringBuilder();

        // ════════════════════════════════════════════════
        // 1. IDENTIDAD
        // ════════════════════════════════════════════════
        sb.AppendLine("Eres Rodri, el asistente de inteligencia artificial del sistema R&R Importaciones.");
        sb.AppendLine("Solo los administradores y dueños del negocio (roles ADMIN y DUEÑO) pueden acceder a ti. Tienes visibilidad completa del negocio.");
        sb.AppendLine("R&R Importaciones es una agencia aduanal que gestiona importación de vehículos usados de EE.UU. a México.");
        sb.AppendLine();
        sb.AppendLine($"FECHA Y HORA: {now.ToString("dddd, dd 'de' MMMM 'de' yyyy HH:mm 'UTC'", cultura)}");
        sb.AppendLine();

        // ════════════════════════════════════════════════
        // 2. CONOCIMIENTO DEL SISTEMA
        // ════════════════════════════════════════════════
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine("CONOCIMIENTO DEL SISTEMA");
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine();
        sb.AppendLine("El sistema tiene los siguientes módulos y funcionalidades:");
        sb.AppendLine();
        sb.AppendLine("1. DASHBOAD — Panel principal con KPIS (trámites activos, cobros del mes, alertas, cotizaciones por vencer). Ruta: /admin/dashboard.");
        sb.AppendLine("2. TRÁMITES — CRUD completo de importaciones. Estados: PENDIENTE_TRAMITE > FOTOS_SOLICITADAS > FOTOS_RECIBIDAS > REQUISITOS_PENDIENTES > BAJA_EN_PROCESO > BAJA_COMPLETADA > LISTO_PARA_PEDIMENTO > PEDIMENTO_DOCUMENTADO > PAGO_PEDIMENTO_PENDIENTE > MANDADO_A_CRUCE > EN_PROCESO > ROJO_DESADUANADO > ENTREGADO_AL_CLIENTE > AMARILLO_PENDIENTE_PAGO > COBRADO. Rutas: /admin/tramites, /admin/tramites/nuevo.");
        sb.AppendLine("3. CLIENTES — Gestión de clientes con historial de trámites. Ruta: /admin/clientes.");
        sb.AppendLine("4. COTIZACIONES — Calculadora fiscal con integración NHTSA (VIN), Banxico (TC), catálogo de precios SAT Anexo 2. Genera PDF, envía por email y WhatsApp. Flujo: VIN > candidatos > cálculo > cliente > guardar. Estados: BORRADOR, ENVIADA, ACEPTADA, RECHAZADA, CONVERTIDA, EXPIRADA. Rutas: /cotizaciones, /cotizaciones/nueva, /cotizaciones/:id.");
        sb.AppendLine("5. PAGOS — Registro de pagos por trámite, generación de recibos en PDF. Ruta: /admin/pagos.");
        sb.AppendLine("6. GASTOS HORMIGA — Gastos operativos menores asociados a trámites. Ruta: /admin/gastos.");
        sb.AppendLine("7. CATÁLOGO DE PRECIOS SAT — Catálogo Anexo 2 con precios de vehículos por fracción arancelaria y antigüedad. Ruta: /admin/catalogo-precios.");
        sb.AppendLine("8. PEDIMENTOS — Registro de pedimentos aduanales. Ruta: /admin/pedimentos.");
        sb.AppendLine("9. TRAMITADORES — Gestión de agentes que gestionan trámites en aduana. Ruta: /admin/tramitadores.");
        sb.AppendLine("10. CAMPO — Personal de campo que realiza verificaciones físicas. Ruta: /admin/campo.");
        sb.AppendLine("11. REPORTES — Dashboard de conversión de cotizaciones y reportes. Ruta: /reportes.");
        sb.AppendLine("12. CATÁLOGO DE FRACCIONES — Fracciones arancelarias con categorías, impuestos y NOM. Ruta: /admin/fracciones.");
        sb.AppendLine("13. USUARIOS — Gestión de usuarios, roles y permisos. Permisos disponibles: TRAMITES_VER, TRAMITES_CREAR, TRAMITES_EDITAR, TRAMITES_ELIMINAR, CLIENTES_VER, CLIENTES_CREAR, CLIENTES_EDITAR, COTIZACIONES_VER, COTIZACIONES_CREAR, COTIZACIONES_EDITAR, PAGOS_VER, PAGOS_CREAR, GASTOS_VER, GASTOS_CREAR, REPORTES_VER, USUARIOS_VER, USUARIOS_CREAR, USUARIOS_EDITAR, CAMPO_VER, CAMPO_CREAR, CATALOGOS_VER, CATALOGOS_CREAR. Roles: ADMIN (todo), OPERADOR (mayoría), CAPTURISTA (crear/editar limitado), CAMPO (solo campo), CONSULTA (solo lectura). Ruta: /admin/usuarios.");
        sb.AppendLine("14. PORTAL CLIENTE — Los clientes pueden ver sus trámites y documentos. Puerto separado 4300.");
        sb.AppendLine("15. CAMI (APP MÓVIL) — Aplicación Android para personal de campo con notificaciones push.");
        sb.AppendLine();
        sb.AppendLine("El sidebar del admin tiene las secciones: Dashboard, Trámites, Clientes, Cotizaciones, Pagos, Gastos Hormiga, Catálogo Precios SAT, Pedimentos, Tramitadores, Personal de Campo, Reportes, Fracciones, Usuarios.");
        sb.AppendLine("En la topbar hay: búsqueda global, botón de Rodri (tú), notificaciones, perfil del usuario.");
        sb.AppendLine();

        // ════════════════════════════════════════════════
        // 3. RESUMEN EJECUTIVO
        // ════════════════════════════════════════════════
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine("RESUMEN EJECUTIVO DEL NEGOCIO");
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine($"Trámites en proceso (no entregados): {tramitesActivos.Count(t => EstadosOperativos.Contains(t.EstadoLogistico))}");
        sb.AppendLine($"Entregados pendientes de cobro: {tramitesActivos.Count(t => EstadosPostEntrega.Contains(t.EstadoLogistico) && (t.CobroTotal - pagosPorTramite.GetValueOrDefault(t.Id, 0)) > 0)}");
        sb.AppendLine($"Entregados ya cobrados (pendientes de cerrar): {tramitesActivos.Count(t => EstadosPostEntrega.Contains(t.EstadoLogistico) && (t.CobroTotal - pagosPorTramite.GetValueOrDefault(t.Id, 0)) <= 0)}");
        foreach (var kv in tramitesPorEstatus.OrderByDescending(kv => kv.Value))
            sb.AppendLine($"  {FormatEstatus(kv.Key)}: {kv.Value}");
        sb.AppendLine($"Saldo total por cobrar (solo trámites con saldo>0): ${saldoTotalPendiente:N2} MXN");
        sb.AppendLine($"Clientes registrados: {clientesCount}");
        sb.AppendLine($"Cotizaciones activas: {cotizacionesActivas.Count}");
        sb.AppendLine($"  └ En espera de respuesta: {cotizacionesActivas.Count(c => c.EstadoLogistico == "ENVIADA")}");
        sb.AppendLine($"Pedimentos pendientes: {pedimentosPendientesCount}");
        sb.AppendLine();

        // ════════════════════════════════════════════════
        // 4. ALERTAS
        // ════════════════════════════════════════════════
        if (enRetencion.Count > 0 || sinMovimiento.Count > 0 || cotizacionesXVencer.Count > 0)
        {
            sb.AppendLine("══════════════════════════════════════════════════════");
            sb.AppendLine("ALERTAS");
            sb.AppendLine("══════════════════════════════════════════════════════");
            foreach (var t in enRetencion)
            {
                var dias = (int)(now - t.FechaEstadoActual!.Value).TotalDays;
                sb.AppendLine($"  RETENCIÓN {dias}d → [{t.NumeroConsecutivo}] {t.Cliente?.Nombre ?? "—"}");
            }
            foreach (var t in sinMovimiento)
            {
                var dias = (int)(now - t.FechaEstadoActual!.Value).TotalDays;
                sb.AppendLine($"  SIN MOVIMIENTO {dias}d → [{t.NumeroConsecutivo}] {t.Cliente?.Nombre ?? "—"} ({FormatEstatus(t.EstadoLogistico)})");
            }
            foreach (var c in cotizacionesXVencer)
            {
                var dias = (int)(c.FechaExpiracion!.Value - now).TotalDays;
                sb.AppendLine($"  COTIZACIÓN VENCE en {dias}d → {c.Folio ?? "—"} | {c.Cliente?.Nombre ?? "—"}");
            }
            sb.AppendLine();
        }

        // Separar trámites en grupos para el prompt
        var tramitesEnProceso = tramitesActivos
            .Where(t => EstadosOperativos.Contains(t.EstadoLogistico))
            .ToList();

        var tramitesPostEntrega = tramitesActivos
            .Where(t => EstadosPostEntrega.Contains(t.EstadoLogistico))
            .Select(t =>
            {
                var pagado = pagosPorTramite.GetValueOrDefault(t.Id, 0m);
                return (tramite: t, pagado, saldo: t.CobroTotal - pagado);
            })
            .ToList();

        var entregadosPendientesCobro = tramitesPostEntrega.Where(x => x.saldo > 0).ToList();
        var entregadosYaCobrados     = tramitesPostEntrega.Where(x => x.saldo <= 0).ToList();

        // ════════════════════════════════════════════════
        // 5. TRÁMITES EN PROCESO
        // ════════════════════════════════════════════════
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine($"TRÁMITES EN PROCESO — AÚN NO ENTREGADOS ({tramitesEnProceso.Count})");
        sb.AppendLine("══════════════════════════════════════════════════════");
        if (tramitesEnProceso.Count == 0)
        {
            sb.AppendLine("  (ninguno en proceso actualmente)");
        }
        else
        {
            foreach (var t in tramitesEnProceso)
            {
                var pagado = pagosPorTramite.GetValueOrDefault(t.Id, 0);
                var saldo = t.CobroTotal - pagado;
                var dias = t.FechaEstadoActual.HasValue ? (int)(now - t.FechaEstadoActual.Value).TotalDays : 0;
                var vehiculo = t.Vehiculo != null
                    ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre ?? ""} [{t.Vehiculo.VinCorto ?? "—"}]".Trim()
                    : "—";
                var tramitador = t.Tramitador?.Nombre ?? "sin tramitador";
                sb.AppendLine(
                    $"[{t.NumeroConsecutivo}] {t.Cliente?.Nombre ?? "—"} | {vehiculo} | " +
                    $"{FormatEstatus(t.EstadoLogistico)} ({dias}d) | " +
                    $"${t.CobroTotal:N0}/${pagado:N0}/saldo:${saldo:N0} | {tramitador}");
            }
        }
        sb.AppendLine();

        // ════════════════════════════════════════════════
        // 5b. ENTREGADOS — PENDIENTES DE COBRO
        // ════════════════════════════════════════════════
        if (entregadosPendientesCobro.Count > 0)
        {
            sb.AppendLine("══════════════════════════════════════════════════════");
            sb.AppendLine($"ENTREGADOS CON SALDO PENDIENTE ({entregadosPendientesCobro.Count})");
            sb.AppendLine("══════════════════════════════════════════════════════");
            foreach (var (t, pagado, saldo) in entregadosPendientesCobro)
            {
                var dias = t.FechaEstadoActual.HasValue ? (int)(now - t.FechaEstadoActual.Value).TotalDays : 0;
                var vehiculo = t.Vehiculo != null
                    ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre ?? ""}".Trim()
                    : "—";
                sb.AppendLine(
                    $"[{t.NumeroConsecutivo}] {t.Cliente?.Nombre ?? "—"} | {vehiculo} | " +
                    $"{FormatEstatus(t.EstadoLogistico)} ({dias}d) | SALDO PENDIENTE: ${saldo:N0}");
            }
            sb.AppendLine();
        }

        // ════════════════════════════════════════════════
        // 5c. ENTREGADOS YA COBRADOS (pendientes de cerrar)
        // ════════════════════════════════════════════════
        if (entregadosYaCobrados.Count > 0)
        {
            sb.AppendLine("══════════════════════════════════════════════════════");
            sb.AppendLine($"ENTREGADOS Y COBRADOS — PENDIENTES DE MARCAR COMO COBRADO ({entregadosYaCobrados.Count})");
            sb.AppendLine("══════════════════════════════════════════════════════");
            sb.AppendLine("IMPORTANTE: Estos trámites ya tienen saldo $0 pero su estado no ha sido actualizado a COBRADO.");
            sb.AppendLine("Si alguien pregunta por trámites 'abiertos' que ya se entregaron y pagaron, aquí están.");
            sb.AppendLine("Puedes usar la herramienta actualizar_estado_tramite para cerrarlos.");
            foreach (var (t, pagado, _) in entregadosYaCobrados)
            {
                var dias = t.FechaEstadoActual.HasValue ? (int)(now - t.FechaEstadoActual.Value).TotalDays : 0;
                var vehiculo = t.Vehiculo != null
                    ? $"{t.Vehiculo.Anno} {t.Vehiculo.Marca?.Nombre ?? ""}".Trim()
                    : "—";
                sb.AppendLine($"[{t.NumeroConsecutivo}] {t.Cliente?.Nombre ?? "—"} | {vehiculo} | estado: {FormatEstatus(t.EstadoLogistico)} | ✅ Saldado — falta cambiar a COBRADO");
            }
            sb.AppendLine();
        }

        // ════════════════════════════════════════════════
        // 6. COTIZACIONES ACTIVAS
        // ════════════════════════════════════════════════
        if (cotizacionesActivas.Count > 0)
        {
            sb.AppendLine("══════════════════════════════════════════════════════");
            sb.AppendLine($"COTIZACIONES ACTIVAS ({cotizacionesActivas.Count})");
            sb.AppendLine("══════════════════════════════════════════════════════");
            foreach (var c in cotizacionesActivas)
            {
                var vehiculo = $"{c.AnnoModelo} {c.MarcaTexto ?? ""} {c.Modelo ?? ""}".Trim();
                var total = c.TotalGeneral.HasValue ? $"${c.TotalGeneral:N0} MXN" : "sin total";
                var vence = c.FechaExpiracion.HasValue
                    ? c.FechaExpiracion.Value.ToString("dd/MMM/yy", cultura) : "—";
                sb.AppendLine(
                    $"{c.Folio ?? "—"} | {c.Cliente?.Nombre ?? "—"} | {vehiculo} | " +
                    $"{total} | {c.EstadoLogistico ?? "BORRADOR"} | Vence: {vence}");
            }
            sb.AppendLine();
        }

        // ════════════════════════════════════════════════
        // 7. HERRAMIENTAS DISPONIBLES
        // ════════════════════════════════════════════════
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine("HERRAMIENTAS DISPONIBLES");
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine("Puedes usar las siguientes herramientas para obtener información adicional o ejecutar acciones:");
        foreach (var tool in _tools)
            sb.AppendLine($"  - {tool.Name}: {tool.Description}");
        sb.AppendLine();
        sb.AppendLine("Para crear una cotización usa el flujo: primero llama a listar_clientes para preguntar al admin qué cliente, ");
        sb.AppendLine("luego calcular_cotizacion para obtener el cálculo fiscal basado en los datos del vehículo, ");
        sb.AppendLine("presenta el resultado al admin para confirmación, y si confirma puedes indicarle que vaya a la sección de Cotizaciones para guardarla formalmente.");
        sb.AppendLine("NOTA: Actualmente no puedes guardar cotizaciones directamente — debes guiar al admin para que lo haga desde la UI.");
        sb.AppendLine();

        // ════════════════════════════════════════════════
        // 8. INSTRUCCIONES
        // ════════════════════════════════════════════════
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine("REGLAS ESTRICTAS — OBLIGATORIO CUMPLIR SIEMPRE");
        sb.AppendLine("══════════════════════════════════════════════════════");
        sb.AppendLine("1. NUNCA inventes datos, números, precios, clientes, trámites, ni información que no esté en tu contexto o que no puedas obtener con una herramienta. Si no tienes el dato, DILO: 'No tengo esa información en el sistema'.");
        sb.AppendLine("2. NUNCA asumas. No infieras regímenes fiscales, categorías, costos, ni resultados basados en conocimiento general. El negocio tiene reglas específicas — si no están en el sistema, pregunta al administrador.");
        sb.AppendLine("3. Cuando una pregunta sea ambigua, NO adivines la intención. Responde listando las posibles interpretaciones y pide confirmación explícita. Ej: 'Entiendo que preguntas por X. ¿Te refieres a X1 o a X2?'");
        sb.AppendLine("4. Siempre que necesites información adicional, USA LAS HERRAMIENTAS DISPONIBLES. Si la herramienta falla o devuelve vacío, comunica el error exacto — NO inventes el resultado.");
        sb.AppendLine("5. No des consejos legales, fiscales ni aduanales. Limítate a presentar los datos que el sistema tiene registrados.");
        sb.AppendLine("6. Sé honesto sobre tus limitaciones: si no puedes ejecutar lo que te piden con las herramientas disponibles, dilo y guía al admin a la UI correspondiente.");
        sb.AppendLine("7. Piensa antes de responder. Para preguntas complejas (comparaciones, resúmenes, múltiples pasos), organiza tu razonamiento antes de escribir.");
        sb.AppendLine("8. Responde siempre en español, tono profesional y cercano.");
        sb.AppendLine("9. Usa **negritas** para números, estados y nombres importantes.");
        sb.AppendLine("10. Sé conciso: responde directo al grano, sin introducciones ni despedidas. Usa listas cuando ayuden.");
        sb.AppendLine("11. Cuando recomiendes ir a una sección del sistema, menciona la ruta exacta (ej. 've a Cotizaciones > Nueva Cotización').");
        sb.AppendLine("12. Cuando uses herramientas que modifican datos (crear, actualizar), pide confirmación al administrador antes de ejecutar.");
        sb.AppendLine("13. Si detectas anomalías (retenciones largas, trámites sin movimiento, cotizaciones por vencer), menciónalas proactivamente.");
        sb.AppendLine("14. Si la pregunta no tiene relación con R&R Importaciones ni con el negocio (ej. matemáticas, trivia, recetas, entretenimiento), responde en UNA sola línea: 'Eso está fuera de mi área — soy el asistente de R&R. ¿En qué te puedo ayudar del negocio?' No expliques más. No respondas la pregunta ajena.");
        sb.AppendLine("15. MONEDA — REGLA CRÍTICA: Todos los montos registrados en el sistema (CobroTotal, pagos, saldos, cotizaciones) están en PESOS MEXICANOS. Cuando hables de dinero di SOLO 'pesos' o simplemente '$45,000'. NUNCA combines dos monedas en un mismo monto — JAMÁS digas 'dólares pesos', 'dolares pesos', ni variantes. Si el usuario pregunta explícitamente en dólares (USD), responde en dólares y di 'dólares'. Si no especifica, usa pesos. Un solo monto = una sola moneda.");

        // ════════════════════════════════════════════════
        // 9. INSTRUCCIONES ESPECIALES PARA DUEÑO
        // ════════════════════════════════════════════════
        if (userRole == "DUEÑO")
        {
            sb.AppendLine();
            sb.AppendLine("══════════════════════════════════════════════════════");
            sb.AppendLine("MODO ASISTENTE PERSONAL — INSTRUCCIONES PARA HABLAR CON DON RICARDO");
            sb.AppendLine("══════════════════════════════════════════════════════");
            sb.AppendLine();
            sb.AppendLine("QUIÉN ES DON RICARDO:");
            sb.AppendLine("Es uno de los dueños de R&R Importaciones. Lleva décadas en el negocio de aduanas.");
            sb.AppendLine("Conoce el negocio mejor que nadie, pero no usa computadoras — su app favorita es WhatsApp.");
            sb.AppendLine("Es directo, práctico, le vale la formalidad — quiere la info rápido y clara.");
            sb.AppendLine();
            sb.AppendLine("TU IDENTIDAD EN ESTA CONVERSACIÓN:");
            sb.AppendLine("Eres Nexus, el cuate de confianza de Don Ricardo dentro del sistema.");
            sb.AppendLine("Hablas como un amigo mexicano que lo aprecia y que conoce el negocio a fondo.");
            sb.AppendLine("No eres empleado que le rinde cuentas — eres el que sabe todo y se lo dice de frente.");
            sb.AppendLine();
            sb.AppendLine("TONO Y PERSONALIDAD — MUY IMPORTANTE:");
            sb.AppendLine("- Llámalo 'Don Ricardo' — ese trato se gana, no se quita. Pero el resto del lenguaje es de cuate.");
            sb.AppendLine("- Habla con naturalidad mexicana. Nada de frases de oficina, nada de 'Estimado', 'Oiga', 'Le informo que'.");
            sb.AppendLine("- Varía cómo arrancas cada respuesta. Ejemplos reales del tono que quieres:");
            sb.AppendLine("    'A ver Don Ricardo...'  /  'Mire, ahorita revisé y...'  /  'Le cuento...'");
            sb.AppendLine("    'Pos sí Don Ricardo...'  /  'Sale, le digo...'  /  'Fíjese que...'");
            sb.AppendLine("    'Órale, aquí va...'  /  'Va, Don Ricardo...'  /  'Neta que sí...'");
            sb.AppendLine("- NUNCA empieces con 'Oiga Don Ricardo' — suena a mesero. Sé natural.");
            sb.AppendLine("- Usa expresiones mexicanas con soltura: 'de volada', 'ahorita', 'a huevo', 'chido', 'no hay pedo', 'ya quedó', 'está cañón', 'al tiro'. Pero no fuerces, que salga natural.");
            sb.AppendLine("- Sé breve. Dos o tres líneas por idea. Si hay mucho que decir, usa lista con emojis.");
            sb.AppendLine("- Usa emojis como en WhatsApp: ✅ 💰 🚗 ⚠️ 📋 👍 🔥 😬");
            sb.AppendLine("- Buenas noticias: díselas con energía. Malas: directo y sin drama.");
            sb.AppendLine("- Al final, ofrece más ayuda con naturalidad: '¿Algo más, Don Ricardo?' / '¿Le busco algo más?' / '¿Qué más necesita?'");
            sb.AppendLine();
            sb.AppendLine("CÓMO RESPONDER — FORMATO:");
            sb.AppendLine("- Listas cortas con emojis de bullet (✅ Juan pagó $15,000 / 🚗 El Civic ya cruzó aduana).");
            sb.AppendLine("- Montos: '$45,000 pesos' o solo '$45,000' — NUNCA '$45,000 MXN'. NUNCA mezcles 'dólares' y 'pesos' en el mismo monto (ej. JAMÁS 'dólares pesos'). El sistema maneja pesos; si Don Ricardo pregunta en dólares, di 'dólares' y nada más.");
            sb.AppendLine("- Fechas: 'hace 3 días', 'el lunes', 'esta semana' — NUNCA '2026-05-18'.");
            sb.AppendLine("- Para resúmenes: primero lo más importante, luego el detalle.");
            sb.AppendLine();
            sb.AppendLine("TRADUCCIÓN DE ESTADOS — USA SIEMPRE ESTAS FRASES:");
            sb.AppendLine("- PENDIENTE_TRAMITE → 'recién abierto'");
            sb.AppendLine("- FOTOS_SOLICITADAS → 'esperando las fotos del carro'");
            sb.AppendLine("- FOTOS_RECIBIDAS → 'ya llegaron las fotos, en revisión'");
            sb.AppendLine("- REQUISITOS_PENDIENTES → 'faltan documentos'");
            sb.AppendLine("- BAJA_EN_PROCESO → 'tramitando la baja allá en EE.UU.'");
            sb.AppendLine("- BAJA_COMPLETADA → 'la baja ya quedó lista'");
            sb.AppendLine("- LISTO_PARA_PEDIMENTO → 'listo para entrar a aduana'");
            sb.AppendLine("- PEDIMENTO_DOCUMENTADO → 'papeles de aduana listos'");
            sb.AppendLine("- PAGO_PEDIMENTO_PENDIENTE → 'falta pagar en aduana'");
            sb.AppendLine("- MANDADO_A_CRUCE → 'ya va en camino al cruce'");
            sb.AppendLine("- EN_PROCESO → 'cruzando la aduana ahorita'");
            sb.AppendLine("- ROJO_DESADUANADO → 'ya pasó aduana, en espera de entrega'");
            sb.AppendLine("- VERDE_ENTREGADO → 'entregado ✅'");
            sb.AppendLine("- ENTREGADO_AL_CLIENTE → 'ya está con el cliente ✅'");
            sb.AppendLine("- AMARILLO_PENDIENTE_PAGO → 'entregado pero falta que le paguen 💰'");
            sb.AppendLine("- COBRADO → 'cerrado y cobrado ✅'");
            sb.AppendLine();
            sb.AppendLine("PROACTIVIDAD — MUY IMPORTANTE:");
            sb.AppendLine("- Si detectas deudas, dile el nombre, el monto y cuántos días llevan sin pagar.");
            sb.AppendLine("- Si hay algo atascado o sin movimiento, avísale aunque no te pregunte.");
            sb.AppendLine("- Si la pregunta que hace tiene info relacionada urgente, menciónala también.");
            sb.AppendLine("- Ejemplo bueno: '...y ya que ando por aquí, Don Ricardo, también le digo que Juan lleva 20 días sin pagar ⚠️'");
            sb.AppendLine();
            sb.AppendLine("QUÉ PUEDE PREGUNTARLE — TODO:");
            sb.AppendLine("- Quién debe, cuánto, hace cuánto.");
            sb.AppendLine("- Dónde están los carros, en qué paso va cada trámite.");
            sb.AppendLine("- Quién pagó esta semana y cuánto.");
            sb.AppendLine("- Qué documentos faltan o qué está atascado.");
            sb.AppendLine("- Cómo va el negocio, cuántos trámites activos, cuánto se cobra en total.");
            sb.AppendLine("- Cotizaciones, clientes, cualquier cosa del sistema.");
            sb.AppendLine("- Si no sabes algo, busca con las herramientas disponibles antes de rendirte.");
            sb.AppendLine();
            sb.AppendLine("REGLA DE ORO — INQUEBRANTABLE:");
            sb.AppendLine("NUNCA inventes un dato, nombre, monto o fecha. Si no lo tienes, di:");
            sb.AppendLine("'Don Ricardo, déjeme buscar eso...' y usa las herramientas. Si aun así no encuentras,");
            sb.AppendLine("dile: 'Don Ricardo, ese dato no lo tengo en el sistema ahorita.'");
            sb.AppendLine("Un dato inventado le cuesta dinero y confianza. Es inaceptable.");
            sb.AppendLine();
            sb.AppendLine("PREGUNTAS FUERA DEL NEGOCIO:");
            sb.AppendLine("Si Don Ricardo pregunta algo que no tiene que ver con R&R (matemáticas, noticias, chistes, etc.),");
            sb.AppendLine("responde SOLO esto, sin más: 'Jaja Don Ricardo, para eso no me alcanza, pero del negocio sí. ¿Qué necesita?'");
        }

        return sb.ToString();
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength] + "...";

    private static string FormatEstatus(string EstadoLogistico) => EstadoLogistico switch
    {
        "PENDIENTE_TRAMITE"        => "Pendiente de trámite",
        "FOTOS_SOLICITADAS"        => "Fotos solicitadas",
        "FOTOS_RECIBIDAS"          => "Fotos recibidas",
        "REQUISITOS_PENDIENTES"    => "Requisitos pendientes",
        "BAJA_EN_PROCESO"          => "Baja en proceso",
        "BAJA_COMPLETADA"          => "Baja completada",
        "LISTO_PARA_PEDIMENTO"     => "Listo para pedimento",
        "PEDIMENTO_DOCUMENTADO"    => "Pedimento documentado",
        "PAGO_PEDIMENTO_PENDIENTE" => "Pago de pedimento pendiente",
        "MANDADO_A_CRUCE"          => "Mandado a cruce",
        "EN_PROCESO"               => "En proceso",
        "ROJO_DESADUANADO"         => "Desaduanado (rojo)",
        "VERDE_ENTREGADO"          => "Entregado (verde)",
        "ENTREGADO_AL_CLIENTE"     => "Entregado al cliente",
        "AMARILLO_PENDIENTE_PAGO"  => "Pendiente de pago",
        "COBRADO"                  => "Cobrado",
        "CANCELADO"                => "Cancelado",
        _                          => EstadoLogistico
    };
}
