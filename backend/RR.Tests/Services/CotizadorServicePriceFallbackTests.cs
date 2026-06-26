using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class CotizadorServicePriceFallbackTests
{
    private const int AnnoModelo = 2018;
    private const string FraccionAutomovil = "8703.22.02";
    private const string GenericModelText = "PRECIOS ESTIMADOS APLICABLES A VEHICULOS EN CUYO ANO-MODELO NO SE ESTABLECE DICHO PRECIO, ASI COMO PARA OTROS MODELOS Y MARCAS DE VEHICULOS NO LISTADOS EN EL INCISO A DE ESTA FRACCION ARANCELARIA";

    [Fact]
    public async Task ObtenerCandidatosAsync_WhenSpecificDoesNotHaveExactAge_ReturnsGenericOnly()
    {
        var tenantContext = new TestTenantContext(Guid.NewGuid());
        await using var db = CreateDbContext(tenantContext);
        var antiguedad = GetAntiguedad();
        var (_, specific, generic) = await SeedCatalogAsync(db, antiguedad);
        var service = CreateService(db, tenantContext);

        var result = await service.ObtenerCandidatosAsync(CreateInput(specific.Id));

        result.Candidatos.Should().ContainSingle();
        result.Candidatos[0].PrecioEstimadoId.Should().Be(generic.Id);
        result.Candidatos[0].EsGenerico.Should().BeTrue();
        result.Candidatos[0].AntiguedadDisponible.Should().Be(antiguedad);
        result.Candidatos[0].EsAntiguedadExacta.Should().BeTrue();
        result.Candidatos[0].PrecioUsd.Should().Be(5555m);
    }

    [Fact]
    public async Task CalcularCotizacionAsync_WhenManualSpecificDoesNotHaveExactAge_UsesGenericPrice()
    {
        var tenantContext = new TestTenantContext(Guid.NewGuid());
        await using var db = CreateDbContext(tenantContext);
        var antiguedad = GetAntiguedad();
        var (_, specific, _) = await SeedCatalogAsync(db, antiguedad);
        await SeedFiscalConfigAsync(db);
        var service = CreateService(db, tenantContext);

        var result = await service.CalcularCotizacionAsync(CreateInput(specific.Id));

        result.FuentePrecio.Should().Be("GENERICO");
        result.PrecioMatchTipo.Should().Be("GENERICO");
        result.PrecioCatalogoModelo.Should().Be(GenericModelText);
        result.PrecioAntiguedadAnios.Should().Be(antiguedad);
        result.ValorAduanaUsd.Should().Be(5555m);
        result.PrecioEstimadoSeleccionadoId.Should().BeNull();
    }

    private static CotizacionInput CreateInput(Guid? precioEstimadoIdOverride = null)
    {
        return new CotizacionInput
        {
            Marca = "FORD",
            Modelo = "FOCUS",
            Anno = AnnoModelo,
            CilindradaCm3 = 1400,
            TipoVehiculo = "AUTOMOVIL",
            PrecioEstimadoIdOverride = precioEstimadoIdOverride,
            TcMargen = 0.30m,
            TipoTramite = "NORMAL",
        };
    }

    private static async Task<(Marca Marca, PrecioEstimado Specific, PrecioEstimado Generic)> SeedCatalogAsync(AppDbContext db, int antiguedad)
    {
        var fraccion = new FraccionArancelaria
        {
            Id = Guid.NewGuid(),
            Fraccion = FraccionAutomovil,
            Descripcion = "Automoviles hasta 1500 cc",
            TipoVehiculo = "AUTOMOVIL",
            Activo = true,
        };
        var marca = new Marca
        {
            Id = Guid.NewGuid(),
            Nombre = "FORD",
            Aliases = ["FORD"],
            Activo = true,
        };
        var nonExactAge = antiguedad == 1 ? 2 : antiguedad - 1;
        var specific = CreatePrecio(fraccion, marca, "FORD", "FOCUS", false, "A", (nonExactAge, 4444m));
        var generic = CreatePrecio(fraccion, null, "GENERICO", GenericModelText, true, "A", (antiguedad, 5555m));

        db.FraccionesArancelarias.Add(fraccion);
        db.Marcas.Add(marca);
        db.PreciosEstimados.AddRange(specific, generic);
        await db.SaveChangesAsync();
        return (marca, specific, generic);
    }

    private static PrecioEstimado CreatePrecio(
        FraccionArancelaria fraccion,
        Marca? marca,
        string marcaTexto,
        string modelo,
        bool esGenerico,
        string? inciso,
        params (int Age, decimal Usd)[] precios)
    {
        var precio = new PrecioEstimado
        {
            Id = Guid.NewGuid(),
            FraccionId = fraccion.Id,
            Fraccion = fraccion,
            MarcaId = marca?.Id,
            Marca = marca,
            Categoria = "AUTOMOVIL",
            Inciso = inciso,
            MarcaTexto = marcaTexto,
            Modelo = modelo,
            EsGenerico = esGenerico,
            HojaOrigen = "TEST",
        };

        foreach (var item in precios)
        {
            precio.PreciosPorAntiguedad.Add(new PrecioPorAntiguedad
            {
                Id = Guid.NewGuid(),
                PrecioEstimadoId = precio.Id,
                PrecioEstimado = precio,
                AntiguedadAnios = item.Age,
                PrecioUsd = item.Usd,
            });
        }

        return precio;
    }

    private static async Task SeedFiscalConfigAsync(AppDbContext db)
    {
        db.ParametrosFiscales.Add(new ParametroFiscal
        {
            Id = Guid.NewGuid(),
            Regimen = "POST_2017",
            Igi = 0.10m,
            Dta = 0.008m,
            Iva = 0.16m,
            PrevFijo = 0m,
            PrvFijo = 0m,
            VigenteDesde = DateTime.UtcNow.AddYears(-1).Date,
            Activo = true,
        });
        await db.SaveChangesAsync();
    }

    private static int GetAntiguedad()
        => Math.Clamp(DateTime.Today.Year - AnnoModelo, 1, 12);

    private static CotizadorService CreateService(AppDbContext db, ITenantContext tenantContext)
        => new(db, new TestNhtsaService(), new TestBanxicoService(), tenantContext, new TestCurrentUserService());

    private static AppDbContext CreateDbContext(ITenantContext tenantContext)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"cotizador-fallback-{Guid.NewGuid()}")
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
