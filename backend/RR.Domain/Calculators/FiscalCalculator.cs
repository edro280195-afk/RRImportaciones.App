namespace RR.Domain.Calculators;

public record ParametrosFiscalesInput(
    decimal? Igi,
    decimal? Dta,
    decimal? DtaFijo,
    decimal? DtaMinimo,   // POST_2017: piso para DTA porcentual (Excel TABULADOR 2026: $202)
    decimal? PrevFijo,
    decimal? PrvFijo,     // PRE_2016 lo cobra (Excel: $290). POST_2017 = 0.
    decimal Iva
);

public record FiscalResult(
    decimal IgiPorcentaje,
    decimal Igi,
    decimal Dta,
    decimal Iva,
    decimal Prev,
    decimal Prv,
    decimal ImpuestosTotal
);

/// <summary>
/// Calculadora fiscal alineada al Excel TABULADOR 2026 de R&R Importaciones.
///
/// Fórmulas verificadas contra el tabulador oficial:
///
///   POST_2017: IGI  = val × 10%
///              DTA  = MAX(val × 0.8%, $202)   ← piso mínimo SAT
///              PREV = $161 cuota fija
///              PRV  = $0
///              IVA  = (val + IGI + DTA) × 16% ← PREV y PRV NO van en la base del IVA
///              Total = IGI + DTA + IVA + PREV
///
///   PRE_2016:  IGI  = val × 50%
///              DTA  = $408 cuota fija
///              PREV = $240 cuota fija
///              PRV  = $290 cuota fija
///              IVA  = (val + IGI + DTA) × 16% ← PREV y PRV NO van en la base del IVA
///              Total = IGI + DTA + IVA + PREV + PRV
///
///   AMPARO:    Precio all-inclusive; ImpuestosTotal = valorPesos, partidas individuales en $0.
///
/// Validación fuerte: si faltan parámetros obligatorios (Igi, Dta/DtaFijo) el método
/// lanza InvalidOperationException con mensaje que indica qué falta y cómo corregirlo.
/// Esto evita generar cotizaciones con IGI=$0 por registros incompletos en la BD.
/// </summary>
public static class FiscalCalculator
{
    public static FiscalResult Calculate(
        string regimen,
        decimal valorPesos,
        decimal honorarios,
        ParametrosFiscalesInput fiscal)
    {
        // ── AMPARO (vehículos 2019-2021): precio fijo all-inclusive ─────────────────
        if (regimen == "AMPARO")
        {
            return new FiscalResult(
                IgiPorcentaje: 0m,
                Igi: 0m,
                Dta: 0m,
                Iva: 0m,
                Prev: 0m,
                Prv: 0m,
                ImpuestosTotal: valorPesos
            );
        }

        // ── Validación fuerte de parámetros obligatorios ─────────────────────────────
        // Fallar ruidoso antes de calcular ceros silenciosos que generarían
        // cotizaciones incorrectas sin que nadie lo note.
        if (regimen == "POST_2017")
        {
            if (fiscal.Igi is null)
                throw new InvalidOperationException(
                    "El parámetro fiscal Igi es obligatorio para el régimen POST_2017 pero " +
                    "viene NULL desde la base de datos. Ve a /admin/parametros-fiscales y " +
                    "completa el registro activo (Igi = 0.10).");

            if (fiscal.Dta is null)
                throw new InvalidOperationException(
                    "El parámetro fiscal Dta es obligatorio para el régimen POST_2017 pero " +
                    "viene NULL desde la base de datos. Ve a /admin/parametros-fiscales y " +
                    "completa el registro activo (Dta = 0.008).");
        }
        else if (regimen == "PRE_2016")
        {
            if (fiscal.Igi is null)
                throw new InvalidOperationException(
                    "El parámetro fiscal Igi es obligatorio para el régimen PRE_2016 pero " +
                    "viene NULL desde la base de datos. Ve a /admin/parametros-fiscales y " +
                    "completa el registro activo (Igi = 0.50).");

            if (fiscal.DtaFijo is null)
                throw new InvalidOperationException(
                    "El parámetro fiscal DtaFijo es obligatorio para el régimen PRE_2016 pero " +
                    "viene NULL desde la base de datos. Ve a /admin/parametros-fiscales y " +
                    "completa el registro activo (DtaFijo = 408).");
        }

        // ── POST_2017 y PRE_2016 ───────────────────────────────────────────────────
        // Después de la validación, los nulables obligatorios ya son seguros de usar con !
        var igiPorcentaje = fiscal.Igi!.Value;
        var igi = Math.Round(valorPesos * igiPorcentaje, 2);

        decimal dta;
        if (regimen == "POST_2017")
        {
            var dtaCalc = Math.Round(valorPesos * fiscal.Dta!.Value, 2);
            var dtaMin  = fiscal.DtaMinimo ?? 202m;     // piso Excel TABULADOR 2026
            dta = Math.Max(dtaCalc, dtaMin);
        }
        else
        {
            dta = fiscal.DtaFijo!.Value;                // PRE_2016: cuota fija
        }

        // PrevFijo y PrvFijo son opcionales por régimen (pueden ser 0 o null → 0)
        var prev = fiscal.PrevFijo ?? 0m;
        var prv  = fiscal.PrvFijo  ?? 0m;

        // IVA: la base SOLO incluye valor + IGI + DTA (ni PREV ni PRV)
        // Referencia: Art. 14-A Ley Aduanera y confirmado en Excel TABULADOR 2026
        var iva = Math.Round((valorPesos + igi + dta) * fiscal.Iva, 2);

        // Total de contribuciones: todas las partidas suman
        var impuestos = igi + dta + iva + prev + prv;

        return new FiscalResult(
            IgiPorcentaje: igiPorcentaje,
            Igi: igi,
            Dta: dta,
            Iva: iva,
            Prev: prev,
            Prv: prv,
            ImpuestosTotal: impuestos
        );
    }
}
