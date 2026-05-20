using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class NhtsaService : INhtsaService
{
    private readonly HttpClient _httpClient;
    private readonly AppDbContext _db;
    private readonly ILogger<NhtsaService> _logger;

    public NhtsaService(HttpClient httpClient, AppDbContext db, ILogger<NhtsaService> logger)
    {
        _httpClient = httpClient;
        _db = db;
        _logger = logger;
    }

    public async Task<VehicleDecodedDto?> DecodeVinAsync(string vin)
    {
        vin = vin.Trim().ToUpperInvariant();
        if (vin.Length != 17)
            return null;

        var cache = await _db.NhtsaCache.FindAsync(vin);
        if (cache is not null && cache.FetchedAt >= DateTime.UtcNow.AddDays(-30))
            return Parse(vin, cache.ResponseJson);

        try
        {
            var json = await _httpClient.GetStringAsync($"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json");
            var dto = Parse(vin, json);
            if (dto is null)
                return null;

            if (cache is null)
            {
                _db.NhtsaCache.Add(new NhtsaCache { Vin = vin, ResponseJson = json, FetchedAt = DateTime.UtcNow });
            }
            else
            {
                cache.ResponseJson = json;
                cache.FetchedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al decodificar VIN {Vin} en NHTSA", vin);
            return cache is null ? null : Parse(vin, cache.ResponseJson);
        }
    }

    private static VehicleDecodedDto? Parse(string vin, string json)
    {
        using var doc = JsonDocument.Parse(json);
        var results = doc.RootElement.GetProperty("Results");
        if (results.GetArrayLength() == 0)
            return null;

        var r = results[0];
        return new VehicleDecodedDto
        {
            Vin = vin,
            Make = Read(r, "Make"),
            Model = Read(r, "Model"),
            ModelYear = int.TryParse(Read(r, "ModelYear"), out var year) ? year : null,
            Manufacturer = Read(r, "Manufacturer"),
            VehicleType = Read(r, "VehicleType"),
            BodyClass = Read(r, "BodyClass"),
            EngineCylinders = int.TryParse(Read(r, "EngineCylinders"), out var cyl) ? cyl : null,
            DisplacementCC = decimal.TryParse(Read(r, "DisplacementCC"), out var cc) ? cc : null,
            FuelTypePrimary = Read(r, "FuelTypePrimary"),
            PlantCountry = Read(r, "PlantCountry"),
        };
    }

    private static string? Read(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value))
            return null;

        var text = value.GetString();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }
}
