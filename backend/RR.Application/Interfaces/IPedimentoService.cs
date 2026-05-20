using RR.Application.DTOs.Tramites;

namespace RR.Application.Interfaces;

public interface IPedimentoService
{
    Task<List<PedimentoDto>> GetAllAsync(string? search = null);
}
