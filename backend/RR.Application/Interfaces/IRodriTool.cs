using RR.Application.DTOs.Rodri;

namespace RR.Application.Interfaces;

public interface IRodriTool
{
    string Name { get; }
    string Description { get; }
    object ParametersSchema { get; }
    bool RequiresConfirmation { get; }
    Task<string> ExecuteAsync(string argumentsJson, IServiceProvider serviceProvider);
}
