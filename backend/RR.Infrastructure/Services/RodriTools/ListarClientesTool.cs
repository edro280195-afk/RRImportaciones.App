using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ListarClientesTool : IRodriTool
{
    public string Name => "listar_clientes";
    public string Description => "Lista los clientes registrados. Retorna nombre, apodo, teléfono, procedencia y conteo de trámites.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            search = new
            {
                type = "string",
                description = "Texto de búsqueda (nombre o apodo). Opcional."
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
        var search = args.TryGetProperty("search", out var s) ? s.GetString() : null;
        var limite = args.TryGetProperty("limite", out var l) ? l.GetInt32() : 20;
        if (limite > 50) limite = 50;

        var query = db.Clientes.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Nombre.Contains(search) || (c.Apodo ?? "").Contains(search));

        var results = await query
            .OrderBy(c => c.Nombre)
            .Take(limite)
            .Select(c => new
            {
                c.Id,
                c.Nombre,
                c.Apodo,
                c.Telefono,
                c.Procedencia,
                c.Activo
            })
            .ToListAsync();

        return JsonSerializer.Serialize(new
        {
            total = results.Count,
            clientes = results
        });
    }
}
