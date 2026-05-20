using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ListarCotizacionesTool : IRodriTool
{
    public string Name => "listar_cotizaciones";
    public string Description => "Lista las cotizaciones con filtros opcionales. Retorna folio, vehículo, cliente, estado y total.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            estado = new
            {
                type = "string",
                description = "Filtrar por estado: BORRADOR, ENVIADA, ACEPTADA, RECHAZADA, CONVERTIDA, EXPIRADA. Opcional.",
                @enum = new[] { "BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA", "CONVERTIDA", "EXPIRADA" }
            },
            search = new
            {
                type = "string",
                description = "Texto de búsqueda (folio, vehículo, cliente). Opcional."
            },
            limite = new
            {
                type = "integer",
                description = "Máximo de resultados (default 20, max 50). Opcional."
            }
        }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var args = JsonSerializer.Deserialize<JsonElement>(argumentsJson);
        var estado = args.TryGetProperty("estado", out var e) ? e.GetString() : null;
        var search = args.TryGetProperty("search", out var s) ? s.GetString() : null;
        var limite = args.TryGetProperty("limite", out var l) ? l.GetInt32() : 20;
        if (limite > 50) limite = 50;

        var query = db.Cotizaciones.Include(c => c.Cliente).AsQueryable();

        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(c => c.EstadoLogistico == estado);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c =>
                (c.Folio ?? "").Contains(search) ||
                (c.MarcaTexto ?? "").Contains(search) ||
                (c.Modelo ?? "").Contains(search) ||
                (c.Cliente != null && c.Cliente.Nombre.Contains(search)));

        var results = await query
            .OrderByDescending(c => c.FechaCreacion)
            .Take(limite)
            .Select(c => new
            {
                c.Id,
                c.Folio,
                Vehiculo = (c.MarcaTexto + " " + c.Modelo).Trim(),
                c.AnnoModelo,
                Cliente = c.Cliente != null ? c.Cliente.Nombre : null,
                c.EstadoLogistico,
                c.TotalGeneral,
                c.FechaCreacion,
                c.FechaExpiracion
            })
            .ToListAsync();

        return JsonSerializer.Serialize(new
        {
            total = results.Count,
            cotizaciones = results
        });
    }
}
