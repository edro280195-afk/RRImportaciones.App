using System.Reflection;
using FluentAssertions;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class CotizadorServiceMatchingTests
{
    [Fact]
    public void ScoreModelMatch_GrandCherokeeWithOcrZero_MatchesAsSpecific()
    {
        var score = ScoreModelMatch("Grand Cherokee", "GRAND CHER0KEE-6 CYL.", 6, "CAMIONETA");

        score.Should().BeGreaterThanOrEqualTo(100);
    }

    [Fact]
    public void ScoreModelMatch_GrandCherokeeCanFallBackToCherokeeVariant()
    {
        var score = ScoreModelMatch("Grand Cherokee", "CHEROKEE-6 CYL.", 6, "CAMIONETA");

        score.Should().BeGreaterThan(0);
    }

    [Theory]
    [InlineData("AUTOMOVIL", "MULTIPURPOSE PASSENGER VEHICLE (MPV)", "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)", 3600, "8703.24.02", "CAMIONETA")]
    [InlineData("AUTOMOVIL", "MULTIPURPOSE PASSENGER VEHICLE (MPV)", "Sport Utility Vehicle (SUV)", 2400, "8703.23.02", "CAMIONETA")]
    [InlineData("CAMIONETA", null, null, 1400, "8703.22.02", "CAMIONETA")]
    [InlineData("AUTOMOVIL", "PASSENGER CAR", "Sedan/Saloon", 2000, "8703.23.02", "AUTOMOVIL")]
    [InlineData("TRACTOCAMION", null, null, 12800, "8701.21.01", "TRACTOCAMION")]
    [InlineData("AUTOMOVIL", "TRUCK", "Pickup", 3500, "8704.31.05", "PICKUP")]
    public void DetermineFraccion_ClasificaCategoriaYFraccionEsperada(
        string? tipoVehiculo, string? vehicleType, string? bodyClass, int cc, string fraccionEsperada, string categoriaEsperada)
    {
        var (fraccion, categoria) = DetermineFraccion(cc, tipoVehiculo, vehicleType, bodyClass, null);

        fraccion.Should().Be(fraccionEsperada);
        categoria.Should().Be(categoriaEsperada);
    }

    [Fact]
    public void DetermineFraccion_HibridoUsaFraccionHibrida()
    {
        var (fraccion, categoria) = DetermineFraccion(2000, "AUTOMOVIL", null, null, "Gasoline, Hybrid");

        fraccion.Should().Be("8703.40.02");
        categoria.Should().Be("HIBRIDO");
    }

    [Fact]
    public void GetFraccionesBusqueda_HibridosIncluyeFraccionesDelCatalogo()
    {
        var fracciones = GetFraccionesBusqueda("8703.40.02");

        fracciones.Should().Contain(["8703.40.02", "8703.40.03", "8703.60.02", "8703.60.03"]);
    }

    [Fact]
    public void GetFraccionesBusqueda_GasolinaIncluyeGrupoCompleto()
    {
        var fracciones = GetFraccionesBusqueda("8703.23.02");

        fracciones.Should().Contain(["8703.21.01", "8703.22.02", "8703.23.02", "8703.24.02"]);
    }

    [Fact]
    public void GetFraccionesBusqueda_PickupIncluyeFraccionDelPdfYDelExcel()
    {
        var fracciones = GetFraccionesBusqueda("8704.31.05");

        fracciones.Should().BeEquivalentTo(["8704.31.05", "8704.31.01"]);
    }

    private static int ScoreModelMatch(string input, string candidate, int? cylinders, string categoria)
    {
        var method = typeof(CotizadorService).GetMethod(
            "ScoreModelMatch",
            BindingFlags.NonPublic | BindingFlags.Static);

        method.Should().NotBeNull();

        return (int)method!.Invoke(null, [input, candidate, cylinders, categoria])!;
    }

    private static (string Fraccion, string Categoria) DetermineFraccion(
        int? cc, string? tipoVehiculo, string? vehicleType, string? bodyClass, string? fuelType)
    {
        var method = typeof(CotizadorService).GetMethod(
            "DetermineFraccion",
            BindingFlags.NonPublic | BindingFlags.Static);

        method.Should().NotBeNull();

        return ((string, string))method!.Invoke(null, [cc, tipoVehiculo, vehicleType, bodyClass, fuelType])!;
    }

    private static string[] GetFraccionesBusqueda(string fraccionPrimaria)
    {
        var method = typeof(CotizadorService).GetMethod(
            "GetFraccionesBusqueda",
            BindingFlags.NonPublic | BindingFlags.Static);

        method.Should().NotBeNull();

        return (string[])method!.Invoke(null, [fraccionPrimaria])!;
    }
}
