using RR.Application.DTOs.Cotizaciones;

namespace RR.Application.Interfaces;

public interface IBanxicoService
{
    Task<decimal> GetTipoCambioUsdMxnAsync();
    Task<TipoCambioDto?> GetTipoCambioFixAsync(DateTime? fecha = null);
    Task<TipoCambioDto?> GetTipoCambioDofAsync(DateTime? fecha = null);
}
