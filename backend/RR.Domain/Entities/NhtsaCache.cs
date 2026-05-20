namespace RR.Domain.Entities;

public class NhtsaCache
{
    public string Vin { get; set; } = string.Empty;
    public string ResponseJson { get; set; } = "{}";
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
}
