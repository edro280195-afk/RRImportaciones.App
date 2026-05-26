using RR.Application.DTOs.Common;
using RR.Application.DTOs.Vehiculos;

namespace RR.Application.Interfaces;

public interface IVehiculoService
{
    Task<PagedResult<VehiculoListDto>> GetListAsync(string? search, Guid? clienteId, string? clienteNombre, Guid? marcaId, int? annoMin, int? annoMax, bool? enPatio, string? estado, string? orderBy, string? orderDir, int page = 1, int pageSize = 20);
    Task<VehiculoDetailDto?> GetByIdAsync(Guid id);
    Task<VehiculoDetailDto> CreateAsync(CreateVehiculoRequest request);
    Task<VehiculoDetailDto> UpdateAsync(Guid id, CreateVehiculoRequest request);
    Task DeleteAsync(Guid id);
    Task UpdateInventarioAsync(Guid id, UpdateInventarioRequest request);
    Task<IEnumerable<VehiculoListDto>> GetInventarioActualAsync();
}
