namespace RR.Application.DTOs.Admin;

/// <summary>Fila de la lista paginada del catálogo Anexo 2.</summary>
public class CatalogoPrecioListDto
{
    public Guid Id { get; set; }
    public string Fraccion { get; set; } = string.Empty;
    public string FraccionDescripcion { get; set; } = string.Empty;
    public string? TipoVehiculo { get; set; }
    public Guid? MarcaId { get; set; }
    public string MarcaTexto { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string? Inciso { get; set; }
    public bool EsGenerico { get; set; }
    public string? HojaOrigen { get; set; }
    /// <summary>Años disponibles en PreciosPorAntiguedad (1-12).</summary>
    public List<int> AniosDisponibles { get; set; } = [];
    public decimal? PrecioMinUsd { get; set; }
    public decimal? PrecioMaxUsd { get; set; }
}

/// <summary>Detalle completo con tabla de precios por antigüedad.</summary>
public class CatalogoPrecioDetailDto : CatalogoPrecioListDto
{
    public List<PrecioAntiguedadDto> Precios { get; set; } = [];
}

public class PrecioAntiguedadDto
{
    public Guid Id { get; set; }
    public int AntiguedadAnios { get; set; }
    public decimal PrecioUsd { get; set; }
}

/// <summary>Estadísticas de cabecera para la página del catálogo.</summary>
public class CatalogoStatsDto
{
    public int TotalEntradas { get; set; }
    public int TotalFracciones { get; set; }
    public int EntradasGenericas { get; set; }
    public int EntradasEspecificas { get; set; }
}
