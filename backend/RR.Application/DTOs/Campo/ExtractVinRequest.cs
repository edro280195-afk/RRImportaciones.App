namespace RR.Application.DTOs.Campo;

public class ExtractVinRequest
{
    public string ImagenBase64 { get; set; } = string.Empty;
    public string ImagenMime { get; set; } = "image/jpeg";
}

public class ExtractVinResponse
{
    public string Vin { get; set; } = string.Empty;
}
