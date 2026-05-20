using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace RR.Infrastructure.Data;

public class TenantModelCacheKeyFactory : IModelCacheKeyFactory
{
    public object Create(DbContext context, bool designTime)
    {
        if (context is AppDbContext appContext)
            return (context.GetType(), appContext.CurrentTenantId, designTime);
        return context.GetType();
    }
}
