using System.Security.Claims;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.LotesImportacion;
using RR.Application.DTOs.Tramites;

namespace RR.Api.Auth;

/// <summary>
/// Borra de los DTOs de trámite lo que el usuario no tiene permiso de ver.
///
/// Gatear <c>/api/pagos</c> y <c>/api/gastos-hormiga</c> no era suficiente: el
/// detalle del trámite trae los pagos, los gastos y los saldos dentro de la
/// misma respuesta, así que cualquiera con TRAMITES_VER —un yardero, por
/// ejemplo— podía leer toda la cobranza pidiendo <c>/api/tramites/{id}</c>.
/// </summary>
public static class FiltroDinero
{
    public static async Task<TramiteDetailDto> AplicarAsync(
        IPermisosUsuario permisos,
        ClaimsPrincipal user,
        TramiteDetailDto tramite)
    {
        var verCobranza = await permisos.TieneAlgunoAsync(user, [Permisos.PagosVer, Permisos.PagosRegistrar]);
        var verGastos = await permisos.TieneAlgunoAsync(user, [Permisos.GastosVer, Permisos.GastosRegistrar]);

        if (!verCobranza)
        {
            tramite.CobroTotal = 0m;
            tramite.Honorarios = 0m;
            tramite.CargoExpress = 0m;
            tramite.TotalPagado = 0m;
            tramite.SaldoPendiente = 0m;
            tramite.Pagos.Clear();

            // Las contribuciones del pedimento también son dinero; el número de
            // pedimento y su estado sí se quedan, que es lo que necesita campo.
            foreach (var pedimento in tramite.Pedimentos)
            {
                pedimento.Igi = null;
                pedimento.Dta = null;
                pedimento.Iva = null;
                pedimento.TotalContribuciones = null;
                pedimento.CobroAdicional = 0m;
            }
        }

        if (!verGastos)
            tramite.GastosHormiga.Clear();

        return tramite;
    }

    public static async Task<PagedResult<TramiteListDto>> AplicarAsync(
        IPermisosUsuario permisos,
        ClaimsPrincipal user,
        PagedResult<TramiteListDto> lista)
    {
        if (await permisos.TieneAlgunoAsync(user, [Permisos.PagosVer, Permisos.PagosRegistrar]))
            return lista;

        foreach (var item in lista.Items)
        {
            item.CobroTotal = 0m;
            item.SaldoPendiente = 0m;
        }

        return lista;
    }

    public static async Task<LoteDetailDto> AplicarAsync(
        IPermisosUsuario permisos,
        ClaimsPrincipal user,
        LoteDetailDto lote)
    {
        if (await permisos.TieneAlgunoAsync(user, [Permisos.PagosVer, Permisos.PagosRegistrar]))
            return lote;

        lote.MontoTotal = 0m;
        lote.TotalPagado = 0m;
        lote.SaldoPendiente = 0m;

        foreach (var tramite in lote.Tramites)
        {
            tramite.CobroTotal = 0m;
            tramite.CargoExpress = 0m;
            tramite.TotalPagado = 0m;
            tramite.SaldoPendiente = 0m;
        }

        return lote;
    }

    public static async Task<PagedResult<LoteListDto>> AplicarAsync(
        IPermisosUsuario permisos,
        ClaimsPrincipal user,
        PagedResult<LoteListDto> lista)
    {
        if (await permisos.TieneAlgunoAsync(user, [Permisos.PagosVer, Permisos.PagosRegistrar]))
            return lista;

        foreach (var item in lista.Items)
        {
            item.MontoTotal = 0m;
            item.TotalPagado = 0m;
            item.SaldoPendiente = 0m;
        }

        return lista;
    }
}
