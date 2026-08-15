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

    [Fact]
    public async Task CompletarAsync_ConIncidencia_DejaLaTareaCompletadaYConservaElReporte()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext, userId);
        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Tipo = "PRE_INSPECCION",
            EstadoLogistico = "TOMADA",
            CreadoPor = userId,
            TomadaPorUsuarioId = userId,
            FotosUrls = [],
        };
        db.TareasCampo.Add(tarea);
        await db.SaveChangesAsync();

        await service.CompletarAsync(tarea.Id, new CompletarTareaCampoRequest
        {
            Incidencia = "La unidad no fue localizada en la yarda.",
        });

        tarea.EstadoLogistico.Should().Be("COMPLETADA");
        tarea.Incidencia.Should().Be("La unidad no fue localizada en la yarda.");
    }

    [Fact]
    public async Task GetTareasAsync_ConIncidenciaHistorica_SeExponeComoCompletadaYConservaLasFotos()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext, userId);
        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Tipo = "PRE_INSPECCION",
            EstadoLogistico = "INCIDENCIA",
            CreadoPor = userId,
            FotosUrls = ["/storage/campo/foto-1.jpg", "/storage/campo/foto-2.jpg"],
            Incidencia = "Cambiar llanta, lado izquierdo atrás chofer",
            FechaCreacion = DateTime.UtcNow,
            FechaCompletada = DateTime.UtcNow,
        };
        db.TareasCampo.Add(tarea);
        await db.SaveChangesAsync();

        var tareas = await service.GetTareasAsync(null);

        var resultado = tareas.Should().ContainSingle().Subject;
        resultado.Estatus.Should().Be("COMPLETADA");
        resultado.Incidencia.Should().Be(tarea.Incidencia);
        resultado.FotosUrls.Should().BeEquivalentTo(tarea.FotosUrls);
    }

    [Fact]
    public async Task CrearPreInspeccionAsync_WithSameClientOperationId_ReturnsSameTask()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext, userId);
        var operationId = Guid.NewGuid();

        var request = new CrearPreInspeccionRequest
        {
            ClientOperationId = operationId,
            Vin = "1HGCV1F33JA235611",
            DescripcionVehiculo = "Honda Accord en yarda",
        };

        var first = await service.CrearPreInspeccionAsync(request);
        var second = await service.CrearPreInspeccionAsync(request);

        second.Id.Should().Be(first.Id);
        (await db.TareasCampo.CountAsync()).Should().Be(1);
        (await db.Vehiculos.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CrearPreInspeccionAsync_ConNombreLibre_CreaClienteTemporal()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext, userId);

        await service.CrearPreInspeccionAsync(new CrearPreInspeccionRequest
        {
            ClientOperationId = Guid.NewGuid(),
            Vin = "1HGCV1F33JA235611",
            ClienteNombreLibre = "Cliente de campo",
            DescripcionVehiculo = "Honda Accord",
        });

        var temporal = await db.ClientesTemporales.SingleAsync();
        temporal.NombrePropuesto.Should().Be("Cliente de campo");
        temporal.Estado.Should().Be("PENDIENTE");
        temporal.VehiculoId.Should().NotBeNull();
        temporal.TareaCampoId.Should().NotBeNull();
    }

    [Fact]
    public async Task RegistrarMediaAsync_WithSameClientMediaId_IsIdempotent()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext, userId);
        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Tipo = "PRE_INSPECCION",
            EstadoLogistico = "ABIERTA",
            CreadoPor = userId,
            FotosUrls = [],
            VideosUrls = [],
        };
        db.TareasCampo.Add(tarea);
        await db.SaveChangesAsync();

        var mediaId = Guid.NewGuid().ToString();
        var first = await service.RegistrarMediaAsync(
            tarea.Id,
            mediaId,
            "FOTO",
            "/storage/campo/foto-1.jpg",
            "foto-1.jpg",
            "image/jpeg",
            1200);
        var second = await service.RegistrarMediaAsync(
            tarea.Id,
            mediaId,
            "FOTO",
            "/storage/campo/foto-1-reintentada.jpg",
            "foto-1.jpg",
            "image/jpeg",
            1200);

        first.YaExistia.Should().BeFalse();
        second.YaExistia.Should().BeTrue();
        (await db.TareasCampoMedios.CountAsync()).Should().Be(1);
        (await db.TareasCampoMedios.SingleAsync()).Url.Should().Be("/storage/campo/foto-1.jpg");
        (await db.TareasCampo.SingleAsync()).FotosUrls.Should().ContainSingle();
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

        var notifications = new Mock<INotificacionEventoService>();
        notifications
            .Setup(x => x.EmitirAsync(It.IsAny<NotificacionEvento>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new CampoService(
            db,
            new TestCurrentUserService(userId),
            realtime.Object,
            Mock.Of<IEmailService>(),
            new ConfigurationBuilder().Build(),
            Mock.Of<IWhatsAppService>(),
            notifications.Object);
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
