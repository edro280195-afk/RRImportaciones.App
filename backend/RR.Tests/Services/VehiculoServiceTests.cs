using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Vehiculos;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class VehiculoServiceTests
{
    [Fact]
    public async Task CreateAsync_WithTemporaryClient_CreatesVehicleAndPendingReview()
    {
        var tenantId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = new VehiculoService(db, new TestCurrentUserService(), tenantContext);
        var marca = new Marca { Id = Guid.NewGuid(), Nombre = "Honda" };

        db.Marcas.Add(marca);
        await db.SaveChangesAsync();

        var result = await service.CreateAsync(new CreateVehiculoRequest
        {
            Vin = "1HGCV1F33JA235611",
            MarcaId = marca.Id,
            Modelo = "Accord",
            ClienteId = null,
            ClienteTemporalNombre = "Cliente capturado en patio",
            FechaIngresoPatio = DateTime.UtcNow,
        });

        result.ClienteId.Should().BeNull();
        result.ClienteTemporalNombre.Should().Be("Cliente capturado en patio");
        var temporal = await db.ClientesTemporales.SingleAsync();
        temporal.VehiculoId.Should().Be(result.Id);
        temporal.Estado.Should().Be("PENDIENTE");

        var list = await service.GetListAsync(null, null, null, null, null, null, null, null, null, null, 1, 20);
        list.Items.Should().ContainSingle(item => item.ClienteTemporalNombre == "Cliente capturado en patio");
    }

    [Fact]
    public async Task GetByIdAsync_WhenVehicleExists_ReturnsRequestedVehicle()
    {
        var tenantId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = new VehiculoService(db, new TestCurrentUserService(), tenantContext);

        var cliente = new Cliente
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Nombre = "Cliente prueba",
            Apodo = "Cliente prueba",
        };
        var acura = new Marca { Id = Guid.NewGuid(), Nombre = "Acura" };
        var honda = new Marca { Id = Guid.NewGuid(), Nombre = "Honda" };
        var modeloAcura = new Modelo { Id = Guid.NewGuid(), MarcaId = acura.Id, Nombre = "CL" };
        var modeloHonda = new Modelo { Id = Guid.NewGuid(), MarcaId = honda.Id, Nombre = "Accord" };
        var acuraId = Guid.NewGuid();
        var hondaId = Guid.NewGuid();

        db.Clientes.Add(cliente);
        db.Marcas.AddRange(acura, honda);
        db.Modelos.AddRange(modeloAcura, modeloHonda);
        db.Vehiculos.AddRange(
            new Vehiculo
            {
                Id = acuraId,
                TenantId = tenantId,
                ClienteId = cliente.Id,
                Vin = "19UYA42601A019296",
                VinCorto = "019296",
                MarcaId = acura.Id,
                ModeloId = modeloAcura.Id,
                Anno = 2001,
            },
            new Vehiculo
            {
                Id = hondaId,
                TenantId = tenantId,
                ClienteId = cliente.Id,
                Vin = "1HGCV1F33JA235611",
                VinCorto = "235611",
                MarcaId = honda.Id,
                ModeloId = modeloHonda.Id,
                Anno = 2018,
            });
        await db.SaveChangesAsync();

        var result = await service.GetByIdAsync(hondaId);

        result.Should().NotBeNull();
        result!.Id.Should().Be(hondaId);
        result.Vin.Should().Be("1HGCV1F33JA235611");
        result.MarcaNombre.Should().Be("Honda");
    }

    [Fact]
    public async Task GetByIdAsync_WhenCampoTaskHasPhotosLinkedByTramite_ReturnsPhotos()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = new VehiculoService(db, new TestCurrentUserService(), tenantContext);

        var vehiculo = new Vehiculo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Vin = "1HGCV1F33JA235611",
            VinCorto = "235611",
            FotosUrls = [],
        };
        var tramite = new Tramite
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            VehiculoId = vehiculo.Id,
            NumeroConsecutivo = "RR-0001",
        };
        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TramiteId = tramite.Id,
            Tipo = "FOTOS_YARDA",
            EstadoLogistico = "COMPLETADA",
            CreadoPor = userId,
            FotosUrls = ["/storage/campo/foto-historica.jpg"],
        };

        db.Vehiculos.Add(vehiculo);
        db.Tramites.Add(tramite);
        db.TareasCampo.Add(tarea);
        await db.SaveChangesAsync();

        var result = await service.GetByIdAsync(vehiculo.Id);

        result.Should().NotBeNull();
        result!.FotosUrls.Should().Contain("/storage/campo/foto-historica.jpg");
    }

    [Fact]
    public async Task UpdateAsync_WhenDateComesWithoutKind_SavesItAsUtc()
    {
        var tenantId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        await using var db = CreateDbContext(tenantContext);
        var service = new VehiculoService(db, new TestCurrentUserService(), tenantContext);

        var cliente = new Cliente
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Nombre = "Cliente prueba",
            Apodo = "Cliente prueba",
        };
        var marca = new Marca { Id = Guid.NewGuid(), Nombre = "Honda" };
        var vehiculo = new Vehiculo
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClienteId = cliente.Id,
            MarcaId = marca.Id,
            Vin = "1HGCV1F33JA235611",
        };

        db.Clientes.Add(cliente);
        db.Marcas.Add(marca);
        db.Vehiculos.Add(vehiculo);
        await db.SaveChangesAsync();

        var fechaIngreso = new DateTime(2026, 8, 15);
        await service.UpdateAsync(vehiculo.Id, new CreateVehiculoRequest
        {
            ClienteId = cliente.Id,
            MarcaId = marca.Id,
            Vin = vehiculo.Vin,
            FechaIngresoPatio = fechaIngreso,
        });

        var savedDate = (await db.Vehiculos.FindAsync(vehiculo.Id))!.FechaIngresoPatio;
        savedDate.Should().Be(DateTime.SpecifyKind(fechaIngreso, DateTimeKind.Utc));
        savedDate!.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    private static AppDbContext CreateDbContext(ITenantContext tenantContext)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"vehiculos-{Guid.NewGuid()}")
            .Options;

        return new AppDbContext(options, tenantContext);
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
        public Guid? UserId => Guid.NewGuid();
        public string? Username => "test";
        public string? Role => "ADMIN";
        public bool IsAuthenticated => true;
    }
}
