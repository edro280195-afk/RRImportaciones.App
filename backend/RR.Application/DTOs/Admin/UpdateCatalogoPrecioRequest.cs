namespace RR.Application.DTOs.Admin;

public class UpdateCatalogoPrecioRequest
{
    public string MarcaTexto { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string? Inciso { get; set; }
    public string? HojaOrigen { get; set; }
    public bool EsGenerico { get; set; }
    /// <summary>
    /// Precios por antigüedad a guardar. Se actualizan los PrecioUsd
    /// de los registros existentes identificados por AntiguedadAnios.
    /// No se crean ni eliminan filas de antigüedad desde este endpoint.
    /// </summary>
    public List<UpdatePrecioAntiguedadItem> Precios { get; set; } = [];
}

public class UpdatePrecioAntiguedadItem
{
    public Guid Id { get; set; }
    public decimal PrecioUsd { get; set; }
}
