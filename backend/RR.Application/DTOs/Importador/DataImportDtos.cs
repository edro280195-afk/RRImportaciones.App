namespace RR.Application.DTOs.Importador;

public class ImportTramitesRequest
{
    public string FilePath { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public bool DryRun { get; set; }
}

public class ImportResultDto
{
    public bool DryRun { get; set; }
    public int RegistrosDetectados { get; set; }
    public int Insertados { get; set; }
    public int Saltados { get; set; }
    public int Rechazados { get; set; }
    public List<string> Warnings { get; set; } = [];
    public List<string> Errores { get; set; } = [];
    public List<string> Log { get; set; } = [];
    public string? LogPath { get; set; }
}
