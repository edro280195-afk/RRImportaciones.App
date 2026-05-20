namespace RR.Domain.Enums;

public static class EstadoLogistico
{
    public const string PENDIENTE = "PENDIENTE";
    public const string RECEPCION_EN_YARDA = "RECEPCION_EN_YARDA";
    public const string REVISION_DOCUMENTAL = "REVISION_DOCUMENTAL";
    public const string LISTO_PARA_ADUANA = "LISTO_PARA_ADUANA";
    public const string PEDIMENTO_DOCUMENTADO = "PEDIMENTO_DOCUMENTADO";
    public const string MODULACION_EN_CRUCE = "MODULACION_EN_CRUCE";
    public const string SEMAFORO_VERDE = "SEMAFORO_VERDE";
    public const string SEMAFORO_ROJO = "SEMAFORO_ROJO";
    public const string LIBERADO = "LIBERADO";
    public const string ENTREGADO_AL_CLIENTE = "ENTREGADO_AL_CLIENTE";
    public const string CANCELADO = "CANCELADO";

    public static readonly string[] Todos = 
    [
        PENDIENTE, RECEPCION_EN_YARDA, REVISION_DOCUMENTAL, 
        LISTO_PARA_ADUANA, PEDIMENTO_DOCUMENTADO, MODULACION_EN_CRUCE, 
        SEMAFORO_VERDE, SEMAFORO_ROJO, LIBERADO, ENTREGADO_AL_CLIENTE, CANCELADO
    ];
}
