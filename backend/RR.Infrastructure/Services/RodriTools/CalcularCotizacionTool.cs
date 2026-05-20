using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services.RodriTools;

public class CalcularCotizacionTool : IRodriTool
{
    public string Name => "calcular_cotizacion";
    public string Description => "Ejecuta el motor de cálculo fiscal para una cotización. Necesita datos del vehículo (marca, modelo, año, cilindrada), o un VIN para decodificar automáticamente. Retorna desglose completo de impuestos y totales.";
    public bool RequiresConfirmation => false;

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            vin = new
            {
                type = "string",
                description = "VIN de 17 caracteres del vehículo. Si se proporciona, se decodifica automáticamente (marca, modelo, año, cilindrada). Opcional si se envían los datos manualmente."
            },
            marca = new
            {
                type = "string",
                description = "Nombre de la marca (ej. HONDA, TOYOTA). Requerido si no hay VIN."
            },
            modelo = new
            {
                type = "string",
                description = "Modelo del vehículo (ej. CIVIC, COROLLA). Requerido si no hay VIN."
            },
            anno = new
            {
                type = "integer",
                description = "Año del modelo. Requerido si no hay VIN."
            },
            cilindrada = new
            {
                type = "integer",
                description = "Cilindrada en cm³. Requerido si no hay VIN."
            }
        }
    };

    public async Task<string> ExecuteAsync(string argumentsJson, IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var cotizador = scope.ServiceProvider.GetRequiredService<ICotizadorService>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var args = JsonSerializer.Deserialize<JsonElement>(argumentsJson);

        var input = new CotizacionInput();

        if (args.TryGetProperty("vin", out var vin) && !string.IsNullOrWhiteSpace(vin.GetString()))
        {
            input.Vin = vin.GetString();
            // Decode VIN via NHTSA to fill marca, modelo, anno, cilindrada
            try
            {
                var nhtsa = scope.ServiceProvider.GetRequiredService<INhtsaService>();
                var decoded = await nhtsa.DecodeVinAsync(input.Vin);
                input.Marca = decoded.Make ?? decoded.Manufacturer;
                input.Modelo = decoded.Model;
                input.Anno = decoded.ModelYear;
                if (decoded.DisplacementCC.HasValue && decoded.DisplacementCC.Value > 0)
                    input.CilindradaCm3 = (int)decoded.DisplacementCC.Value;
            }
            catch
            {
                return JsonSerializer.Serialize(new { error = "No se pudo decodificar el VIN. Verifica que sea correcto." });
            }
        }
        else
        {
            input.Marca = args.GetProperty("marca").GetString();
            input.Modelo = args.GetProperty("modelo").GetString();
            input.Anno = args.GetProperty("anno").GetInt32();
            input.CilindradaCm3 = args.GetProperty("cilindrada").GetInt32();
        }

        try
        {
            var result = await cotizador.CalcularCotizacionAsync(input);
            return JsonSerializer.Serialize(new
            {
                ok = true,
                vehiculo = $"{result.Anno} {result.Marca} {result.Modelo}".Trim(),
                result.Vin,
                result.Fraccion,
                result.RegimenFiscal,
                result.FuentePrecio,
                result.ValorAduanaUsd,
                ValorPesos = result.ValorPesos,
                result.TipoCambioAplicado,
                result.IgiPorcentaje,
                result.Igi,
                result.Dta,
                result.Iva,
                result.Prev,
                result.Prv,
                Impuestos = result.ImpuestosTotal,
                result.Honorarios,
                Total = result.Total,
                Advertencia = result.PrecioAdvertencia
            });
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { error = $"Error al calcular: {ex.Message}" });
        }
    }
}
