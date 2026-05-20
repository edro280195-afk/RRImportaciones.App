namespace RR.Domain.Entities;

public class TipoGastoHormiga
{
    public Guid Id { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;

    public ICollection<GastoHormiga> Gastos { get; set; } = new List<GastoHormiga>();
}
