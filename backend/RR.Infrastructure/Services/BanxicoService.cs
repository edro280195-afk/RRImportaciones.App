using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class BanxicoService : IBanxicoService
{
    private readonly HttpClient _httpClient;
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BanxicoService> _logger;

    public BanxicoService(HttpClient httpClient, AppDbContext db, IConfiguration configuration, ILogger<BanxicoService> logger)
    {
        _httpClient = httpClient;
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<decimal> GetTipoCambioUsdMxnAsync()
    {
        var result = await GetTipoCambioFixAsync();
        return result?.TipoCambio ?? throw new InvalidOperationException("No se pudo obtener el tipo de cambio de Banxico");
    }

    public async Task<TipoCambioDto?> GetTipoCambioFixAsync(DateTime? fecha = null)
    {
        return await GetTipoCambioInternalAsync(fecha, "FIX");
    }

    public async Task<TipoCambioDto?> GetTipoCambioDofAsync(DateTime? fecha = null)
    {
        return await GetTipoCambioInternalAsync(fecha, "DOF");
    }

    private async Task<TipoCambioDto?> GetTipoCambioInternalAsync(DateTime? fecha, string contexto)
    {
        var referenceDate = fecha?.Date ?? DateTime.Today;
        var targetDate = DateOnly.FromDateTime(referenceDate);

        // Intentar obtener de cache (solo para FIX exacto o si ya procesamos el DOF)
        var cached = await _db.TiposCambioCache.FirstOrDefaultAsync(x => x.Fecha == targetDate && x.Fuente == contexto);
        if (cached is not null)
        {
            return new TipoCambioDto
            {
                Fecha = cached.Fecha,
                TipoCambio = cached.Tc,
                Fuente = cached.Fuente,
                Contexto = contexto,
                FetchedAt = cached.FetchedAt,
                IsStale = false
            };
        }

        try
        {
            var token = _configuration["BanxicoApiToken"];
            // Para DOF, necesitamos ver el FIX del dia habil anterior.
            // Pedimos los ultimos 5 datos para asegurar que tenemos el anterior incluso en fines de semana.
            var endpoint = $"https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno";
            if (fecha.HasValue || contexto == "DOF")
            {
                // Si es DOF, pedimos un rango para encontrar el anterior al targetDate
                var start = referenceDate.AddDays(-7).ToString("yyyy-MM-dd");
                var end = referenceDate.ToString("yyyy-MM-dd");
                endpoint = $"https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/{start}/{end}";
            }

            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            if (!string.IsNullOrWhiteSpace(token))
                request.Headers.Add("Bmx-Token", token);

            using var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();

            var dataPoints = ParseSeriesData(json);
            if (dataPoints.Count == 0) throw new InvalidOperationException("Banxico no devolvio datos");

            TipoCambioData selected;
            if (contexto == "DOF")
            {
                // El DOF de hoy es el FIX del dia habil ANTERIOR.
                selected = dataPoints
                    .Where(x => x.Fecha < targetDate)
                    .OrderByDescending(x => x.Fecha)
                    .FirstOrDefault() ?? dataPoints.OrderByDescending(x => x.Fecha).First();
                
                // Si el ultimo dato es el de hoy y pedimos DOF, y no hay mas, usamos el ultimo.
                // Pero lo normal es que tengamos varios.
            }
            else
            {
                // FIX normal: el mas cercano o exacto al targetDate (OrderBy ascendente = menor diferencia primero)
                selected = dataPoints
                    .OrderBy(x => Math.Abs((x.Fecha.ToDateTime(TimeOnly.MinValue) - referenceDate).TotalDays))
                    .First();
            }

            var entry = new TipoCambioCache
            {
                Fecha = targetDate,
                Tc = selected.Dato,
                Fuente = contexto, // Guardamos si es el que se uso como DOF o FIX para esta fecha
                FetchedAt = DateTime.UtcNow,
            };

            // Upsert seguro: si dos requests llegan al mismo tiempo el segundo simplemente ignora el conflicto
            _db.TiposCambioCache.Add(entry);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                // Registro ya insertado por request concurrente — no es error
                _db.ChangeTracker.Clear();
            }

            return new TipoCambioDto
            {
                Fecha = targetDate,
                TipoCambio = selected.Dato,
                Fuente = "BANXICO",
                Contexto = contexto,
                Nota = contexto == "DOF" ? $"Publicado en DOF el {targetDate:dd/MM/yyyy} (Determinado FIX el {selected.Fecha:dd/MM/yyyy})" : null,
                FetchedAt = entry.FetchedAt,
                IsStale = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener tipo de cambio Banxico ({Contexto}) para {Fecha}", contexto, targetDate);
            var last = await _db.TiposCambioCache.Where(x => x.Fuente == contexto).OrderByDescending(x => x.Fecha).FirstOrDefaultAsync();
            return last is null
                ? null
                : new TipoCambioDto
                {
                    Fecha = last.Fecha,
                    TipoCambio = last.Tc,
                    Fuente = last.Fuente,
                    Contexto = contexto,
                    FetchedAt = last.FetchedAt,
                    IsStale = true
                };
        }
    }

    private class TipoCambioData
    {
        public DateOnly Fecha { get; set; }
        public decimal Dato { get; set; }
    }

    private static List<TipoCambioData> ParseSeriesData(string json)
    {
        var list = new List<TipoCambioData>();
        using var doc = JsonDocument.Parse(json);
        var series = doc.RootElement.GetProperty("bmx").GetProperty("series")[0];
        var datos = series.GetProperty("datos");

        foreach (var item in datos.EnumerateArray())
        {
            var fechaStr = item.GetProperty("fecha").GetString();
            var datoStr = item.GetProperty("dato").GetString();

            if (DateOnly.TryParseExact(fechaStr, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha) &&
                decimal.TryParse(datoStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var dato))
            {
                list.Add(new TipoCambioData { Fecha = fecha, Dato = dato });
            }
        }
        return list;
    }
}
