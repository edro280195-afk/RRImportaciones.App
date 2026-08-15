using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Clientes;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class ClienteServiceTests
{
    [Fact]
    public async Task AprobarTemporalAsync_CreaClienteOficialYRelacionaVehiculo()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);

        var vehiculo = new Vehiculo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Vin = "1HGCV1F33JA235611",
            VinCorto = "235611",
            Estado = "PENDIENTE_DE_TRAMITE",
        };
        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            VehiculoId = vehiculo.Id,
            Tipo = "PRE_INSPECCION",
            EstadoLogistico = "COMPLETADA",
            DescripcionVehiculo = "Honda Accord",
            CreadoPor = userId,
        };
        var temporal = new ClienteTemporal
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            NombrePropuesto = "Cliente capturado en patio",
            TareaCampoId = tarea.Id,
            VehiculoId = vehiculo.Id,
            CapturadoPor = userId,
        };
        db.Vehiculos.Add(vehiculo);
        db.TareasCampo.Add(tarea);
        db.ClientesTemporales.Add(temporal);
        await db.SaveChangesAsync();

        var service = new ClienteService(db, new TestCurrentUserService(userId));
        var result = await service.AprobarTemporalAsync(temporal.Id, new AprobarClienteTemporalRequest
        {
            Apodo = "Cliente patio",
            NombreCompleto = "Cliente capturado en patio",
            Telefono = "5551234567",
        });

        result.Estado.Should().Be("APROBADA");
        result.ClienteId.Should().NotBeNull();
        (await db.Clientes.CountAsync()).Should().Be(1);
        (await db.Vehiculos.SingleAsync()).ClienteId.Should().Be(result.ClienteId);
        (await db.ClientesTemporales.IgnoreQueryFilters().SingleAsync()).Estado.Should().Be("APROBADA");
    }

    private static AppDbContext CreateDbContext(ITenantContext tenantContext)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"cliente-temporal-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options, tenantContext);
    }

    private sealed class TestTenantContext : ITenantContext
    {
        public TestTenantContext(Guid tenantId) => TenantId = tenantId;
        public Guid TenantId { get; private set; }
        public bool HasTenant { get; private set; } = true;
        public void SetTenant(Guid tenantId) => TenantId = tenantId;
    }

    private sealed class TestCurrentUserService : ICurrentUserService
    {
        private readonly Guid _userId;
        public TestCurrentUserService(Guid userId) => _userId = userId;
        public Guid? UserId => _userId;
        public string? Username => "admin";
        public string? Role => "ADMIN";
        public bool IsAuthenticated => true;
    }
}
