namespace RR.Application.DTOs.Rodri;

public class RodriChatRequest
{
    public string Mensaje { get; set; } = string.Empty;
    public List<RodriHistorialItem> Historial { get; set; } = [];
    /// <summary>Proveedor a usar: "openai" | "gemini". Omite para usar el default de configuración.</summary>
    public string? Provider { get; set; }
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

public class RodriToolDefinition
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public object Parameters { get; set; } = new { };
    public bool RequiresConfirmation { get; set; }
}
