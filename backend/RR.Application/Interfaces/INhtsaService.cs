using RR.Application.DTOs.Cotizaciones;

namespace RR.Application.Interfaces;

public interface INhtsaService
{
    Task<VehicleDecodedDto?> DecodeVinAsync(string vin);
}
