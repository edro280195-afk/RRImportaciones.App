using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;

namespace RR.Api;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";

        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(config.GetConnectionString("DefaultConnection"),
            b => b.MigrationsAssembly("RR.Migrations"));

        return new AppDbContext(optionsBuilder.Options, new TenantContext());
    }
}
