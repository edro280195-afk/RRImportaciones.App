using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using RR.Application.Interfaces;

namespace RR.Infrastructure.Middleware;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = context.User.FindFirst("tenant_id")?.Value;
            if (Guid.TryParse(tenantClaim, out var tenantId))
            {
                tenantContext.SetTenant(tenantId);
            }
        }

        await _next(context);
    }
}
