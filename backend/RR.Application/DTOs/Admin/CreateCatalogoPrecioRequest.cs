namespace RR.Application.DTOs.Admin;

public class CreateCatalogoPrecioRequest
{
    /// <summary>
    /// Código de la fracción arancelaria, ej. "8703.23.02".
    /// El servicio resuelve el UUID correspondiente en la BD.
    /// </summary>
    public string FraccionCodigo { get; set; } = string.Empty;

    public string MarcaTexto { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = "AUTOMOVIL";
    public string? Inciso { get; set; }
    public string? HojaOrigen { get; set; }
    public bool EsGenerico { get; set; }

    /// <summary>
    /// Precios por antigüedad a insertar. AntiguedadAnios debe ser único (1-12).
    /// </summary>
    public List<CreatePrecioAntiguedadItem> Precios { get; set; } = [];
}

public class CreatePrecioAntiguedadItem
{
    public int AntiguedadAnios { get; set; }
    public decimal PrecioUsd { get; set; }
}
