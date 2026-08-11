namespace RR.Api.Auth;

/// <summary>
/// Códigos del catálogo de permisos (tabla Permisos, sembrada en DbInitializer).
///
/// Están aquí como constantes para que un error de dedo en un controlador sea
/// un error de compilación y no un endpoint que nadie puede usar.
/// </summary>
public static class Permisos
{
    public const string TramitesVer = "TRAMITES_VER";
    public const string TramitesCrear = "TRAMITES_CREAR";
    public const string TramitesEditar = "TRAMITES_EDITAR";
    public const string TramitesBorrar = "TRAMITES_BORRAR";
    public const string TramitesAsignar = "TRAMITES_ASIGNAR";

    public const string ClientesVer = "CLIENTES_VER";
    public const string ClientesCrear = "CLIENTES_CREAR";
    public const string ClientesEditar = "CLIENTES_EDITAR";

    public const string CotizacionesVer = "COTIZACIONES_VER";
    public const string CotizacionesCrear = "COTIZACIONES_CREAR";
    public const string CotizacionesEditar = "COTIZACIONES_EDITAR";

    public const string PagosVer = "PAGOS_VER";
    public const string PagosRegistrar = "PAGOS_REGISTRAR";

    public const string GastosVer = "GASTOS_VER";
    public const string GastosRegistrar = "GASTOS_REGISTRAR";

    public const string ReportesFinancieros = "REPORTES_FINANCIEROS";

    public const string UsuariosVer = "USUARIOS_VER";
    public const string UsuariosCrear = "USUARIOS_CREAR";
    public const string UsuariosEditar = "USUARIOS_EDITAR";
    public const string UsuariosBorrar = "USUARIOS_BORRAR";

    public const string EventosCrear = "EVENTOS_CREAR";
    public const string CampoUsar = "CAMPO_USAR";

    public const string CatalogosVer = "CATALOGOS_VER";
    public const string CatalogosEditar = "CATALOGOS_EDITAR";
}
