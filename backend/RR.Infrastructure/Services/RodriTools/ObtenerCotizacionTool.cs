using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ObtenerCotizacionTool : IRodriTool
{
    public string Name => "obtener_cotizacion";
    public string Description => "Obtiene el detalle completo de una cotización por su ID o folio.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            id = new
            {
                type = "string",
                description = "ID de la cotización (UUID) o folio (ej. COT-202605-0001)."
            }
        },
        required = new[] { "id" }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var args = JsonSerializer.Deserialize<JsonElement>(argumentsJson);
        var idStr = args.GetProperty("id").GetString() ?? "";

        var query = db.Cotizaciones.Include(c => c.Cliente).AsQueryable();

        if (Guid.TryParse(idStr, out var guid))
            query = query.Where(c => c.Id == guid);
        else
            query = query.Where(c => c.Folio == idStr);

        var c = await query.FirstOrDefaultAsync();
        if (c == null)
            return JsonSerializer.Serialize(new { error = $"No se encontró cotización con ID o folio '{idStr}'." });

        return JsonSerializer.Serialize(new
        {
            c.Id,
            c.Folio,
            Cliente = c.Cliente?.Nombre ?? "Sin cliente",
            c.Vin,
            Vehiculo = $"{c.AnnoModelo} {c.MarcaTexto} {c.Modelo}".Trim(),
            c.CilindradaCm3,
            c.Categoria,
            c.Fraccion,
            c.RegimenFiscal,
            c.FuentePrecio,
            ValorAduanaUsd = c.ValorAduanaUsd,
            ValorPesos = c.ValorPesos,
            TipoCambioAplicado = c.TipoCambioAplicado,
            Igi = c.Igi,
            Dta = c.Dta,
            Iva = c.Iva,
            Prev = c.Prev,
            Prv = c.Prv,
            Honorarios = c.TotalHonorarios,
            Total = c.TotalGeneral,
            c.EstadoLogistico,
            c.FechaExpiracion,
            c.FechaCreacion,
            c.Notas
        });
    }
}
