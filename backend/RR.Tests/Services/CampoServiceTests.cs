using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using RR.Application.DTOs.Campo;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class CampoServiceTests
{
    [Fact]
    public async Task AgregarFotoAsync_WhenTaskIsLinkedByTramite_CopiesPhotoToVehicle()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext, userId);

        var vehiculo = CreateVehiculo(tenantId);
        var tramite = CreateTramite(tenantId, vehiculo.Id);
        var tarea = CreateTareaCampo(tenantId, tramite.Id, userId);
        db.Vehiculos.Add(vehiculo);
        db.Tramites.Add(tramite);
        db.TareasCampo.Add(tarea);
        await db.SaveChangesAsync();

        const string fotoUrl = "/storage/campo/foto-1.jpg";

        await service.AgregarFotoAsync(tarea.Id, fotoUrl);

        vehiculo.FotosUrls.Should().Contain(fotoUrl);
    }

    [Fact]
    public async Task CompletarAsync_WhenTaskIsLinkedByTramite_CopiesRequestPhotosToVehicle()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext, userId);

        var vehiculo = CreateVehiculo(tenantId);
        var tramite = CreateTramite(tenantId, vehiculo.Id);
        var tarea = CreateTareaCampo(tenantId, tramite.Id, userId);
        db.Vehiculos.Add(vehiculo);
        db.Tramites.Add(tramite);
        db.TareasCampo.Add(tarea);
        await db.SaveChangesAsync();

        var fotos = new[] { "/storage/campo/foto-1.jpg", "/storage/campo/foto-2.jpg" };

        await service.CompletarAsync(tarea.Id, new CompletarTareaCampoRequest
        {
            Ubicacion = "Patio norte",
            VinConfirmado = vehiculo.VinCorto,
            FotosUrls = fotos,
        });

        vehiculo.FotosUrls.Should().BeEquivalentTo(fotos);
    }

    private static CampoService CreateService(AppDbContext db, ITenantContext tenantContext, Guid userId)
    {
        var realtime = new Mock<IRealtimeNotifier>();
        realtime
            .Setup(x => x.CampoActualizadoAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        realtime
            .Setup(x => x.TramiteActualizadoAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        realtime
            .Setup(x => x.TareaCampoCompletadaAsync(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new CampoService(
            db,
            new TestCurrentUserService(userId),
            realtime.Object,
            Mock.Of<IEmailService>(),
            new ConfigurationBuilder().Build(),
            Mock.Of<IWhatsAppService>(),
            Mock.Of<IPushNotificationService>());
    }

    private static AppDbContext CreateDbContext(ITenantContext tenantContext)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"campo-{Guid.NewGuid()}")
            .Options;

        return new AppDbContext(options, tenantContext);
    }

    private static Vehiculo CreateVehiculo(Guid tenantId)
    {
        return new Vehiculo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Vin = "1HGCV1F33JA235611",
            VinCorto = "235611",
            Estado = "EN_TRAMITE",
            FotosUrls = [],
        };
    }

    private static Tramite CreateTramite(Guid tenantId, Guid vehiculoId)
    {
        return new Tramite
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            NumeroConsecutivo = "RR-0001",
            VehiculoId = vehiculoId,
            EstadoLogistico = "FOTOS_SOLICITADAS",
        };
    }

    private static TareaCampo CreateTareaCampo(Guid tenantId, Guid tramiteId, Guid userId)
    {
        return new TareaCampo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TramiteId = tramiteId,
            Tipo = "FOTOS_YARDA",
            EstadoLogistico = "TOMADA",
            CreadoPor = userId,
            TomadaPorUsuarioId = userId,
            FotosUrls = [],
        };
    }

    private sealed class TestTenantContext : ITenantContext
    {
        public TestTenantContext(Guid tenantId)
        {
            TenantId = tenantId;
        }

        public Guid TenantId { get; private set; }
        public bool HasTenant { get; private set; } = true;

        public void SetTenant(Guid tenantId)
        {
            TenantId = tenantId;
            HasTenant = true;
        }
    }

    private sealed class TestCurrentUserService : ICurrentUserService
    {
        private readonly Guid _userId;

        public TestCurrentUserService(Guid userId)
        {
            _userId = userId;
        }

        public Guid? UserId => _userId;
        public string? Username => "campo";
        public string? Role => "CAMPO";
        public bool IsAuthenticated => true;
    }
}
