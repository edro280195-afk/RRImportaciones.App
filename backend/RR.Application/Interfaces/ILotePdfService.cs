namespace RR.Application.Interfaces;

public interface ILotePdfService
{
    Task<byte[]> GeneratePdfAsync(Guid loteId);
}
