namespace RR.Application.DTOs.Marcas;

public class MarcaDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string[] Aliases { get; set; } = [];
}
