using RR.Application.DTOs.Common;

namespace RR.Application.DTOs.TiposGasto;

public class TipoGastoDto
{
    public Guid Id { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; }
}
