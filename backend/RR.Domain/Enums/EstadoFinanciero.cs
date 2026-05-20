namespace RR.Domain.Enums;

public static class EstadoFinanciero
{
    public const string ADEUDO_TOTAL = "ADEUDO_TOTAL";
    public const string PAGO_PARCIAL = "PAGO_PARCIAL";
    public const string LIQUIDADO = "LIQUIDADO";

    public static readonly string[] Todos = [ADEUDO_TOTAL, PAGO_PARCIAL, LIQUIDADO];
}
