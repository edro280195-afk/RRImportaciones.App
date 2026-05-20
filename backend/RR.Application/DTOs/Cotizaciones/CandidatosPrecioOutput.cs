namespace RR.Application.DTOs.Cotizaciones;

/// <summary>
/// Candidato individual del catálogo Anexo 2 para que el admin elija cuál usar.
/// </summary>
public class CandidatoPrecio
{
    public Guid PrecioEstimadoId { get; set; }
    public string Fraccion { get; set; } = string.Empty;
    public string ModeloCatalogo { get; set; } = string.Empty;
    public string MarcaTextoCatalogo { get; set; } = string.Empty;
    public string HojaOrigen { get; set; } = string.Empty;

    /// <summary>ESPECIFICO | MARCA | GENERICO</summary>
    public string MatchTipo { get; set; } = string.Empty;

    /// <summary>Score de similitud de nombre (0–100).</summary>
    public int Score { get; set; }

    /// <summary>Antigüedad que se usará (la disponible más cercana a la real).</summary>
    public int AntiguedadDisponible { get; set; }

    /// <summary>True si la antigüedad disponible coincide exactamente con la real del vehículo.</summary>
    public bool EsAntiguedadExacta { get; set; }

    /// <summary>Precio en USD correspondiente a la antigüedad disponible.</summary>
    public decimal PrecioUsd { get; set; }

    /// <summary>True para el candidato que el sistema elegiría automáticamente.</summary>
    public bool EsSugerido { get; set; }

    /// <summary>Años disponibles en el catálogo para esta entrada.</summary>
    public List<int> AniosDisponibles { get; set; } = [];
}

/// <summary>
/// Respuesta del endpoint /candidatos: lista de entradas del catálogo que podrían
/// corresponder al vehículo, para que el admin elija la correcta.
/// </summary>
public class CandidatosPrecioOutput
{
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public int? Anno { get; set; }
    public int AntiguedadAnios { get; set; }

    /// <summary>
    /// True cuando no hay un ganador claro y el admin debe elegir.
    /// False cuando hay un único ESPECIFICO con año exacto.
    /// </summary>
    public bool RequiereSeleccion { get; set; }

    public List<CandidatoPrecio> Candidatos { get; set; } = [];
}
