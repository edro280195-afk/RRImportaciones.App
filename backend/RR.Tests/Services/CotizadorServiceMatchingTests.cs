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

    private static int ScoreModelMatch(string input, string candidate, int? cylinders, string categoria)
    {
        var method = typeof(CotizadorService).GetMethod(
            "ScoreModelMatch",
            BindingFlags.NonPublic | BindingFlags.Static);

        method.Should().NotBeNull();

        return (int)method!.Invoke(null, [input, candidate, cylinders, categoria])!;
    }
}
