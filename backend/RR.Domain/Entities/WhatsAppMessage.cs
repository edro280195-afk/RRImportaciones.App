using RR.Domain.Interfaces;

namespace RR.Domain.Entities;

public class WhatsAppMessage : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    /// <summary>Número destino en formato E.164 sin el prefijo whatsapp: (ej. +5216671234567).</summary>
    public string To { get; set; } = string.Empty;

    /// <summary>Etiqueta interna del tipo de mensaje (PRE_INSPECCION_ADMIN, COTIZACION_CLIENTE, SOLICITUD_FOTOS).</summary>
    public string Template { get; set; } = string.Empty;

    /// <summary>Texto plano del mensaje enviado.</summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>PENDING | SENT | FAILED.</summary>
    public string Status { get; set; } = "PENDING";

    /// <summary>SID/ID del proveedor (Twilio MessageSid u otro).</summary>
    public string? ExternalId { get; set; }

    /// <summary>Mensaje de error si falló el envío.</summary>
    public string? Error { get; set; }

    /// <summary>Referencia opcional a la entidad relacionada (cotización, tarea de campo, etc.).</summary>
    public Guid? RefEntityId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
