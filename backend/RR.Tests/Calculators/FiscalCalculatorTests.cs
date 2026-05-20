using FluentAssertions;
using RR.Domain.Calculators;
using Xunit;

namespace RR.Tests.Calculators;

public class FiscalCalculatorTests
{
    [Fact]
    public void Calculate_Post2017_CalculatesCorrectTaxes()
    {
        // Arrange — fórmula Excel TABULADOR 2026:
        //   IGI = val × 10%
        //   DTA = MAX(val × 0.8%, $202)
        //   PREV = $161 cuota fija
        //   IVA = (val + IGI + DTA) × 16%   ← PREV NO va en la base del IVA
        var fiscal = new ParametrosFiscalesInput(
            Igi: 0.10m, Dta: 0.008m, DtaFijo: null, DtaMinimo: 202m,
            PrevFijo: 161m, PrvFijo: null, Iva: 0.16m);
        var valorPesos = 100000m;

        // Act
        var result = FiscalCalculator.Calculate("POST_2017", valorPesos, 0, fiscal);

        // Assert
        result.Igi.Should().Be(10000m);        // 100k × 0.10
        result.Dta.Should().Be(800m);          // MAX(100k × 0.008, 202) = 800
        result.Iva.Should().Be(17728m);        // (100k + 10k + 800) × 0.16
        result.Prev.Should().Be(161m);         // cuota fija TABULADOR 2026
        result.Prv.Should().Be(0);
        result.ImpuestosTotal.Should().Be(28689m); // IGI + DTA + IVA + PREV
    }

    [Fact]
    public void Calculate_Post2017_DtaMinimumApplies()
    {
        // Para vehículos baratos donde val × 0.8% < $202, debe aplicar el piso de $202
        var fiscal = new ParametrosFiscalesInput(
            Igi: 0.10m, Dta: 0.008m, DtaFijo: null, DtaMinimo: 202m,
            PrevFijo: null, PrvFijo: null, Iva: 0.16m);
        var valorPesos = 20000m;  // 20k × 0.008 = 160 < 202 → debe usar 202

        var result = FiscalCalculator.Calculate("POST_2017", valorPesos, 0, fiscal);

        result.Dta.Should().Be(202m);
    }

    [Fact]
    public void Calculate_Pre2016_CalculatesCorrectTaxes()
    {
        // Arrange — fórmula Excel TABULADOR 2026:
        //   IGI = val × 50%
        //   DTA = $408, PREV = $240, PRV = $290
        //   IVA = (val + IGI + DTA) × 16%   ← PREV y PRV NO van en la base
        var fiscal = new ParametrosFiscalesInput(
            Igi: 0.50m, Dta: null, DtaFijo: 408m, DtaMinimo: null,
            PrevFijo: 240m, PrvFijo: 290m, Iva: 0.16m);
        var valorPesos = 50000m;

        // Act
        var result = FiscalCalculator.Calculate("PRE_2016", valorPesos, 0, fiscal);

        // Assert
        result.Igi.Should().Be(25000m);        // 50k × 0.50
        result.Dta.Should().Be(408m);          // fijo
        result.Prev.Should().Be(240m);
        result.Prv.Should().Be(290m);
        result.Iva.Should().Be(12065.28m);     // (50k + 25k + 408) × 0.16 (sin PREV ni PRV)
        result.ImpuestosTotal.Should().Be(25000m + 408m + 12065.28m + 240m + 290m);
    }

    [Fact]
    public void Calculate_Amparo_AllInclusiveFixedPrice()
    {
        // AMPARO: el precio amparo (valorPesos) es all-inclusive.
        // Todas las partidas individuales son 0; ImpuestosTotal = valorPesos.
        var fiscal = new ParametrosFiscalesInput(
            Igi: 0.10m, Dta: 0.008m, DtaFijo: 408m, DtaMinimo: 202m,
            PrevFijo: 240m, PrvFijo: 290m, Iva: 0.16m);
        var valorPesos = 150000m;
        var honorarios = 15000m;

        var result = FiscalCalculator.Calculate("AMPARO", valorPesos, honorarios, fiscal);

        result.Igi.Should().Be(0);
        result.Dta.Should().Be(0);
        result.Prev.Should().Be(0);
        result.Prv.Should().Be(0);
        result.Iva.Should().Be(0);
        result.ImpuestosTotal.Should().Be(150000m);  // valorPesos íntegro
    }

    // ── Validación fuerte de parámetros NULL ───────────────────────────────────

    [Fact]
    public void Calculate_Post2017_NullIgi_ThrowsInvalidOperation()
    {
        // Si Igi viene NULL desde la BD, el sistema debe fallar ruidoso
        // en lugar de generar una cotización con IGI=$0 silencioso.
        var fiscal = new ParametrosFiscalesInput(
            Igi: null, Dta: 0.008m, DtaFijo: null, DtaMinimo: 202m,
            PrevFijo: 161m, PrvFijo: null, Iva: 0.16m);

        var act = () => FiscalCalculator.Calculate("POST_2017", 100000m, 0, fiscal);

        act.Should().Throw<InvalidOperationException>()
           .WithMessage("*Igi*obligatorio*POST_2017*");
    }

    [Fact]
    public void Calculate_Post2017_NullDta_ThrowsInvalidOperation()
    {
        var fiscal = new ParametrosFiscalesInput(
            Igi: 0.10m, Dta: null, DtaFijo: null, DtaMinimo: 202m,
            PrevFijo: 161m, PrvFijo: null, Iva: 0.16m);

        var act = () => FiscalCalculator.Calculate("POST_2017", 100000m, 0, fiscal);

        act.Should().Throw<InvalidOperationException>()
           .WithMessage("*Dta*obligatorio*POST_2017*");
    }

    [Fact]
    public void Calculate_Pre2016_NullIgi_ThrowsInvalidOperation()
    {
        var fiscal = new ParametrosFiscalesInput(
            Igi: null, Dta: null, DtaFijo: 408m, DtaMinimo: null,
            PrevFijo: 240m, PrvFijo: 290m, Iva: 0.16m);

        var act = () => FiscalCalculator.Calculate("PRE_2016", 50000m, 0, fiscal);

        act.Should().Throw<InvalidOperationException>()
           .WithMessage("*Igi*obligatorio*PRE_2016*");
    }

    [Fact]
    public void Calculate_Pre2016_NullDtaFijo_ThrowsInvalidOperation()
    {
        var fiscal = new ParametrosFiscalesInput(
            Igi: 0.50m, Dta: null, DtaFijo: null, DtaMinimo: null,
            PrevFijo: 240m, PrvFijo: 290m, Iva: 0.16m);

        var act = () => FiscalCalculator.Calculate("PRE_2016", 50000m, 0, fiscal);

        act.Should().Throw<InvalidOperationException>()
           .WithMessage("*DtaFijo*obligatorio*PRE_2016*");
    }
}
