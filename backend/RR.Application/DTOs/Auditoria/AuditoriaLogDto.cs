namespace RR.Application.DTOs.Auditoria;

public class AuditoriaLogDto
{
    public Guid Id { get; set; }
    public Guid? UsuarioId { get; set; }
    public string? UsuarioNombre { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public string? EntidadId { get; set; }
    public string? ValoresAnteriores { get; set; }
    public string? ValoresNuevos { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Fecha { get; set; }
}
