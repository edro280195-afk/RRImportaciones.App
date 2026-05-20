namespace RR.Application.DTOs.Tramites;

public class PedimentoDto
{
    public Guid Id { get; set; }
    public Guid TramiteId { get; set; }
    public string NumeroConsecutivo { get; set; } = string.Empty;
    public string NumeroPedimento { get; set; } = string.Empty;
    public string Tipo { get; set; } = "ORIGINAL";
    public DateTime? FechaEntrada { get; set; }
    public DateTime? FechaPago { get; set; }
    public string? ClienteApodo { get; set; }
    public string? ClienteNombre { get; set; }
    public string? EstadoLogistico { get; set; }
    public DateTime FechaCreacion { get; set; }
}
