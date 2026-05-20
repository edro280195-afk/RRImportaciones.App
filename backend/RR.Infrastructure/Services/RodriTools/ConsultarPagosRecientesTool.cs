using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class ConsultarPagosRecientesTool : IRodriTool
{
    public string Name => "consultar_pagos_recientes";
    public string Description => "Muestra los últimos pagos recibidos de clientes, con nombre del cliente, monto, fecha y trámite relacionado.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            limite = new
            {
                type = "integer",
                description = "Cantidad de pagos a retornar (default 15, max 50). Opcional."
            },
            dias = new
            {
                type = "integer",
                description = "Filtrar pagos de los últimos N días. Opcional."
            }
        }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var args = JsonSerializer.Deserialize<JsonElement>(argumentsJson);
        var limite = args.TryGetProperty("limite", out var l) ? Math.Min(l.GetInt32(), 50) : 15;
        var dias = args.TryGetProperty("dias", out var d) ? d.GetInt32() : (int?)null;

        var query = db.Pagos
            .Include(p => p.Tramite).ThenInclude(t => t.Cliente)
            .Where(p => p.SeCobraAlCliente || p.TipoMovimiento == "PAGO_CLIENTE")
            .AsQueryable();

        if (dias.HasValue)
        {
            var desde = DateTime.UtcNow.AddDays(-dias.Value);
            query = query.Where(p => p.FechaPago >= desde);
        }

        var pagos = await query
            .OrderByDescending(p => p.FechaPago)
            .Take(limite)
            .ToListAsync();

        var resultado = pagos.Select(p => new
        {
            cliente = p.Tramite?.Cliente?.Nombre ?? "—",
            tramite = p.Tramite?.NumeroConsecutivo ?? "—",
            monto = p.Monto,
            moneda = p.Moneda,
            fecha = p.FechaPago.ToString("dd/MM/yyyy"),
            metodo = p.Metodo,
            verificado = p.Verificado
        }).ToList();

        return JsonSerializer.Serialize(new
        {
            total_pagos = resultado.Count,
            monto_total = resultado.Sum(x => x.monto),
            pagos = resultado
        });
    }
}
