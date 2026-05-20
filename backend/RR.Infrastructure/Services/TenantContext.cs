using RR.Application.Interfaces;

namespace RR.Infrastructure.Services;

public class TenantContext : ITenantContext
{
    public Guid TenantId { get; private set; }
    public bool HasTenant { get; private set; }

    public void SetTenant(Guid tenantId)
    {
        TenantId = tenantId;
        HasTenant = true;
    }
}
