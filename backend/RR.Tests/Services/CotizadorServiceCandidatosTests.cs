using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class CotizadorServiceCandidatosTests
{
    [Fact]
    public async Task ObtenerCandidatosAsync_VehiculoAmparo_NoConsultaCatalogoAnexo2()
    {
        var tenantContext = new TestTenantContext(Guid.NewGuid());
        await using var db = CreateDbContext(tenantContext);
        var service = CreateService(db, tenantContext);

        var result = await service.ObtenerCandidatosAsync(new CotizacionInput
        {
            Marca = "CHEVROLET",
            Modelo = "Silverado",
            Anno = 2019,
            CilindradaCm3 = 5300,
            TipoVehiculo = "PICKUP",
        });

        result.RegimenFiscal.Should().Be("AMPARO");
        result.RequiereSeleccion.Should().BeFalse();
        result.Candidatos.Should().BeEmpty();
    }

    [Fact]
    public async Task ObtenerCandidatosAsync_RamDecodificadoPorNhtsa_MatcheaEntradaDodgeDelCatalogo()
    {
        var tenantContext = new TestTenantContext(Guid.NewGuid());
        await using var db = CreateDbContext(tenantContext);
        var antiguedad = Math.Clamp(DateTime.Today.Year - 2018, 1, 12);
        await SeedRamCatalogAsync(db, antiguedad);
        var service = CreateService(db, tenantContext);

        var result = await service.ObtenerCandidatosAsync(new CotizacionInput
        {
            Marca = "RAM",
            Modelo = "3500",
            Anno = 2018,
            CilindradaCm3 = 6700,
            TipoVehiculo = "PICKUP",
        });

        result.RegimenFiscal.Should().Be("POST_2017");
        result.Candidatos.Should().ContainSingle(c => !c.EsGenerico);
        var candidato = result.Candidatos.Single(c => !c.EsGenerico);
        candidato.ModeloCatalogo.Should().Contain("RAM 3500");
        candidato.MarcaTextoCatalogo.Should().Be("DODGE");
        candidato.EsAntiguedadExacta.Should().BeTrue();
        candidato.PrecioUsd.Should().Be(7740m);
    }

    private static async Task SeedRamCatalogAsync(AppDbContext db, int antiguedad)
    {
        var fraccion = new FraccionArancelaria
        {
            Id = Guid.NewGuid(),
            Fraccion = "8704.31.05",
            Descripcion = "Pick-ups",
            TipoVehiculo = "PICKUP",
            Activo = true,
        };
        var ram = new Marca { Id = Guid.NewGuid(), Nombre = "Ram", Aliases = ["RAM"], Activo = true };
        var dodge = new Marca { Id = Guid.NewGuid(), Nombre = "Dodge", Aliases = ["DODGE"], Activo = true };

        var precio = new PrecioEstimado
        {
            Id = Guid.NewGuid(),
            FraccionId = fraccion.Id,
            Fraccion = fraccion,
            MarcaId = dodge.Id,
            Marca = dodge,
            Categoria = "PICKUP",
            Inciso = null,
            MarcaTexto = "DODGE",
            Modelo = "RAM 3500 PICKUP-1 TON-V8-DUAL REAR WHEELS",
            EsGenerico = false,
            HojaOrigen = "TEST",
        };
        precio.PreciosPorAntiguedad.Add(new PrecioPorAntiguedad
        {
            Id = Guid.NewGuid(),
            PrecioEstimadoId = precio.Id,
            PrecioEstimado = precio,
            AntiguedadAnios = antiguedad,
            PrecioUsd = 7740m,
        });

        db.FraccionesArancelarias.Add(fraccion);
        db.Marcas.AddRange(ram, dodge);
        db.PreciosEstimados.Add(precio);
        await db.SaveChangesAsync();
    }

    private static CotizadorService CreateService(AppDbContext db, ITenantContext tenantContext)
        => new(db, new TestNhtsaService(), new TestBanxicoService(), tenantContext, new TestCurrentUserService());

    private static AppDbContext CreateDbContext(ITenantContext tenantContext)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"cotizador-candidatos-{Guid.NewGuid()}")
            .Options;

        return new AppDbContext(options, tenantContext);
    }

    private sealed class TestNhtsaService : INhtsaService
    {
        public Task<VehicleDecodedDto?> DecodeVinAsync(string vin)
            => Task.FromResult<VehicleDecodedDto?>(null);
    }

    private sealed class TestBanxicoService : IBanxicoService
    {
        private readonly TipoCambioDto _tipoCambio = new()
        {
            Fecha = DateOnly.FromDateTime(DateTime.Today),
            TipoCambio = 20m,
            Fuente = "TEST",
            Contexto = "DOF",
            FetchedAt = DateTime.UtcNow,
            IsStale = false,
        };

        public Task<decimal> GetTipoCambioUsdMxnAsync()
            => Task.FromResult(_tipoCambio.TipoCambio);

        public Task<TipoCambioDto?> GetTipoCambioFixAsync(DateTime? fecha = null)
            => Task.FromResult<TipoCambioDto?>(_tipoCambio);

        public Task<TipoCambioDto?> GetTipoCambioDofAsync(DateTime? fecha = null)
            => Task.FromResult<TipoCambioDto?>(_tipoCambio);
    }

    private sealed class TestTenantContext(Guid tenantId) : ITenantContext
    {
        public Guid TenantId { get; private set; } = tenantId;
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
