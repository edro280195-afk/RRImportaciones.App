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

    // Antes Vehículos, Lotes y Pedimentos vivían pegados a TRAMITES_VER: no
    // había forma de dar acceso a "solo Vehículos" sin dar también Trámites,
    // Lotes y Pedimentos. Cada endpoint de estos tres módulos ahora acepta
    // TramitesVer/Crear/Editar/Borrar COMO ALTERNATIVA (OR), nunca en vez de
    // — así nadie que hoy entra por tener TRAMITES_VER pierde acceso; lo que
    // se gana es poder dar el permiso específico solo, sin el resto.
    public const string VehiculosVer = "VEHICULOS_VER";
    public const string VehiculosCrear = "VEHICULOS_CREAR";
    public const string VehiculosEditar = "VEHICULOS_EDITAR";
    public const string VehiculosBorrar = "VEHICULOS_BORRAR";

    public const string LotesVer = "LOTES_VER";
    public const string LotesCrear = "LOTES_CREAR";
    public const string LotesEditar = "LOTES_EDITAR";
    public const string LotesBorrar = "LOTES_BORRAR";

    public const string PedimentosVer = "PEDIMENTOS_VER";

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

    // CATALOGOS_VER/EDITAR se quedan como estaban: los siguen usando lecturas
    // cruzadas de formularios (p.ej. cotizar necesita leer Marcas sin tener
    // el módulo de catálogos abierto). MARCAS/BANCOS/TRAMITADORES/PARTNERS
    // son la versión fina para cuando se quiere delegar solo esa pantalla
    // del menú Catálogos, no las cuatro juntas.
    public const string CatalogosVer = "CATALOGOS_VER";
    public const string CatalogosEditar = "CATALOGOS_EDITAR";

    public const string MarcasVer = "MARCAS_VER";
    public const string MarcasEditar = "MARCAS_EDITAR";

    public const string BancosVer = "BANCOS_VER";
    public const string BancosEditar = "BANCOS_EDITAR";

    public const string TramitadoresVer = "TRAMITADORES_VER";
    public const string TramitadoresEditar = "TRAMITADORES_EDITAR";

    public const string PartnersVer = "PARTNERS_VER";
    public const string PartnersEditar = "PARTNERS_EDITAR";

    // Pantallas de administración que antes solo se podían dar con el rol
    // ADMIN completo (hardcoded en el frontend). Roles y Auditoría se quedan
    // fuera de este catálogo a propósito: editar permisos de un rol o el
    // registro de auditoría es delicado (quien puede tocar Roles puede
    // otorgarse a sí mismo más acceso), así que siguen exclusivas de
    // ADMIN/DUEÑO sin importar qué se marque aquí. Estas cuatro, en cambio,
    // son configuración operativa que sí tiene sentido delegar.
    public const string AdminParametrosFiscales = "ADMIN_PARAMETROS_FISCALES";
    public const string AdminImportador = "ADMIN_IMPORTADOR";
    public const string AdminPlantillas = "ADMIN_PLANTILLAS";
    public const string AdminCatalogoPrecios = "ADMIN_CATALOGO_PRECIOS";
}
