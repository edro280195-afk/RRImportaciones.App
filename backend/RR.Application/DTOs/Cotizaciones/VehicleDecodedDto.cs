namespace RR.Application.DTOs.Cotizaciones;

public class VehicleDecodedDto
{
    public string Vin { get; set; } = string.Empty;
    public string? Make { get; set; }
    public string? Model { get; set; }
    public int? ModelYear { get; set; }
    public string? Manufacturer { get; set; }
    public string? VehicleType { get; set; }
    public string? BodyClass { get; set; }
    public int? EngineCylinders { get; set; }
    public decimal? DisplacementCC { get; set; }
    public string? FuelTypePrimary { get; set; }
    public string? PlantCountry { get; set; }
}
