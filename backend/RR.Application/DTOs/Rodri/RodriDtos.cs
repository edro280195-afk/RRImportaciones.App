namespace RR.Application.DTOs.Rodri;

public class RodriChatRequest
{
    public string Mensaje { get; set; } = string.Empty;
    public List<RodriHistorialItem> Historial { get; set; } = [];
    /// <summary>Proveedor a usar: "openai" | "gemini". Omite para usar el default de configuración.</summary>
    public string? Provider { get; set; }
    /// <summary>Imagen en base64 (opcional) para análisis multimodal.</summary>
    public string? ImagenBase64 { get; set; }
    /// <summary>Tipo MIME de la imagen (ej. "image/jpeg").</summary>
    public string? ImagenMime { get; set; }
    /// <summary>ID de la conversación persistida en base de datos.</summary>
    public Guid? ConversacionId { get; set; }
}

public class RodriHistorialItem
{
    public string Role { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
}

public class RodriChatResponse
{
    public string Respuesta { get; set; } = string.Empty;
    public bool Error { get; set; }
    public List<string>? ToolCallsEjecutados { get; set; }
    /// <summary>Proveedor que generó la respuesta ("openai" | "gemini").</summary>
    public string? Provider { get; set; }
    /// <summary>Nombre legible del proveedor ("GPT-4" | "Gemini 2.5 Flash").</summary>
    public string? ProviderLabel { get; set; }
    /// <summary>ID de la conversación asociada a esta respuesta.</summary>
    public Guid? ConversacionId { get; set; }
}

/// <summary>Chunk individual para el streaming SSE.</summary>
public class RodriStreamChunk
{
    public string Type { get; set; } = ""; // "token" | "tool_call" | "done" | "error"
    public string? Content { get; set; }
    public string? ToolName { get; set; }
    public string? Provider { get; set; }
    public string? ProviderLabel { get; set; }
    public Guid? ConversacionId { get; set; }
}

public class RodriProviderInfo
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool HasTools { get; set; }
    public bool IsAvailable { get; set; }
}

public class RodriProvidersResponse
{
    public List<RodriProviderInfo> Providers { get; set; } = [];
    public string Default { get; set; } = "openai";
}

public class RodriTtsRequest
{
    /// <summary>Texto que Rodri leerá en voz alta. Se limpia de markdown antes de enviar a ElevenLabs.</summary>
    public string Texto { get; set; } = string.Empty;
}

public class RodriToolDefinition
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public object Parameters { get; set; } = new { };
    public bool RequiresConfirmation { get; set; }
}

public class ConversacionNexusDto
{
    public Guid Id { get; set; }
    public string? Titulo { get; set; }
    public string? Resumen { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime FechaUltimaActividad { get; set; }
}

public class MensajeNexusDto
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public string? ImagenMime { get; set; }
    public bool TieneImagen { get; set; }
    public List<string>? ToolCalls { get; set; }
    public DateTime Fecha { get; set; }
}
