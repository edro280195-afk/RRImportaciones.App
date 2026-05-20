using RR.Application.DTOs.Importador;

namespace RR.Application.Interfaces;

public interface IDataImportService
{
    Task<ImportResultDto> ImportTramitesAsync(ImportTramitesRequest request, CancellationToken cancellationToken = default);
}
