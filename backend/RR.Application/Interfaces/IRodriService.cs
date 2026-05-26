using RR.Application.DTOs.Rodri;

namespace RR.Application.Interfaces;

public interface IRodriService
{
    Task<RodriChatResponse> ChatAsync(RodriChatRequest request);
    IAsyncEnumerable<RodriStreamChunk> ChatStreamAsync(RodriChatRequest request, CancellationToken cancellationToken = default);
    Task<RodriProvidersResponse> GetProvidersAsync();
}
