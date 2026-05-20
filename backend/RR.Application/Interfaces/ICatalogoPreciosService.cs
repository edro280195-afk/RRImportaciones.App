using RR.Application.DTOs.Admin;
using RR.Application.DTOs.Common;

namespace RR.Application.Interfaces;

public interface ICatalogoPreciosService
{
    Task<PagedResult<CatalogoPrecioListDto>> GetListAsync(
        string? search,
        string? fraccion,
        Guid? marcaId,
        string? tipoVehiculo,
        bool? esGenerico,
        int page,
        int pageSize);

    Task<CatalogoPrecioDetailDto?> GetByIdAsync(Guid id);
    Task<CatalogoStatsDto> GetStatsAsync();
    Task<CatalogoPrecioDetailDto> CreateAsync(CreateCatalogoPrecioRequest request);
    Task<CatalogoPrecioDetailDto> UpdateAsync(Guid id, UpdateCatalogoPrecioRequest request);
    Task DeleteAsync(Guid id);
}
