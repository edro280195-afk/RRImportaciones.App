using RR.Application.DTOs.Cotizaciones;

namespace RR.Application.Interfaces;

public interface IParametroFiscalService
{
    Task<List<ParametroFiscalDto>> GetAllAsync();
    Task<ParametroFiscalDto> UpdateAsync(string regimen, UpdateParametroFiscalRequest request);
}
