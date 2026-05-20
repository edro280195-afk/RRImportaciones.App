namespace RR.Application.Interfaces;

public interface ICotizacionPdfService
{
    Task<byte[]> GeneratePdfAsync(Guid cotizacionId);
}
