using RR.Application.DTOs.Rodri;

namespace RR.Application.Interfaces;

public interface IRodriService
{
    Task<RodriChatResponse> ChatAsync(RodriChatRequest request);
    Task<RodriProvidersResponse> GetProvidersAsync();
}
