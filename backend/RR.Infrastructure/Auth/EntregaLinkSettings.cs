namespace RR.Infrastructure.Auth;

public class EntregaLinkSettings
{
    public string BaseUrl { get; set; } = "http://localhost:4200";
    public int ExpirationDays { get; set; } = 30;
}
