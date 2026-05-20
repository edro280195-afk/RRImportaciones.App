namespace RR.Application.DTOs.GastosHormiga;

public class GastoHormigaResumenDto
{
    public decimal TotalPeriodo { get; set; }
    public decimal TotalCargableCliente { get; set; }
    public decimal TotalCostoPropio { get; set; }
    public List<GastoHormigaCategoriaDto> PorCategoria { get; set; } = [];
    public List<GastoHormigaClienteDto> PorCliente { get; set; } = [];
    public List<GastoHormigaTramitadorDto> PorTramitador { get; set; } = [];
}

public class GastoHormigaCategoriaDto
{
    public string Categoria { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public int Cantidad { get; set; }
}

public class GastoHormigaClienteDto
{
    public Guid? ClienteId { get; set; }
    public string Cliente { get; set; } = "Sin cliente";
    public decimal Total { get; set; }
    public int Cantidad { get; set; }
}

public class GastoHormigaTramitadorDto
{
    public Guid? TramitadorId { get; set; }
    public string Tramitador { get; set; } = "Sin tramitador";
    public decimal Total { get; set; }
    public int Cantidad { get; set; }
}
