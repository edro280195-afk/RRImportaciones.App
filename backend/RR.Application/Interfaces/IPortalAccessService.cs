namespace RR.Application.Interfaces;

public interface IPortalAccessService
{
    string GenerateToken(Guid tramiteId);
    Guid? ValidateToken(string token);
}
