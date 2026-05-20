namespace RR.Application.Interfaces;

public interface ITenantContext
{
    Guid TenantId { get; }
    bool HasTenant { get; }
    void SetTenant(Guid tenantId);
}
