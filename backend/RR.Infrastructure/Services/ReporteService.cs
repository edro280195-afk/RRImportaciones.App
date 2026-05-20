using System.Globalization;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.GastosHormiga;
using RR.Application.DTOs.Reportes;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class ReporteService : IReporteService
{
    private readonly AppDbContext _db;

    public ReporteService(AppDbContext db) => _db = db;

    // ─── Reporte Financiero ────────────────────────────────────────────────
    public async Task<ReporteFinancieroDto> GetReporteFinancieroAsync(DateTime desde, DateTime hasta)
    {
        var desdeUtc = DateTime.SpecifyKind(desde.Date, DateTimeKind.Utc);
        var hastaUtc = DateTime.SpecifyKind(hasta.Date.AddDays(1), DateTimeKind.Utc);

        // Pagos verificados en el periodo
        var pagos = await _db.Pagos
            .Where(p => p.Verificado
                     && p.FechaPago >= desdeUtc
                     && p.FechaPago < hastaUtc
                     && p.DeletedAt == null)
            .ToListAsync();

        var cobradoTotal = pagos.Sum(p =>
            p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto);

        // Trámites activos y saldo por cobrar
        var tramitesActivos = await _db.Tramites
            .Include(t => t.Pagos)
            .Include(t => t.GastosHormiga)
            .Where(t => t.EstadoLogistico != "COBRADO" && t.EstadoLogistico != "CANCELADO")
            .ToListAsync();

        var porCobrarTotal = tramitesActivos.Sum(t =>
        {
            var totalRequerido = t.CobroTotal + t.CargoExpress;
            var pagadoVer = t.Pagos
                .Where(p => p.Verificado && p.DeletedAt == null)
                .Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto);
            return Math.Max(0m, totalRequerido - pagadoVer);
        });

        // Gastos hormiga en el periodo
        var gastosRaw = await _db.GastosHormiga
            .Include(g => g.TipoGasto)
            .Where(g => g.FechaGasto >= desdeUtc && g.FechaGasto < hastaUtc && g.DeletedAt == null)
            .ToListAsync();

        var gastosTotal = gastosRaw.Sum(g => g.Monto);
        var gastosCargables = gastosRaw.Where(g => g.SeCargaAlCliente).Sum(g => g.Monto);

        // Trámites cerrados en el periodo
        var tramitesCerrados = await _db.Tramites
            .CountAsync(t => t.EstadoLogistico == "COBRADO"
                          && t.FechaEstadoActual >= desdeUtc
                          && t.FechaEstadoActual < hastaUtc);

        // Pagos pendientes de verificación
        var pagosPendientes = await _db.Pagos
            .Where(p => !p.Verificado && p.DeletedAt == null)
            .ToListAsync();

        var pagosPendientesMonto = pagosPendientes.Sum(p =>
            p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto);

        // Evolución mensual
        var culture = new CultureInfo("es-MX");
        var evolucion = pagos
            .GroupBy(p => new { p.FechaPago.Year, p.FechaPago.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g =>
            {
                var d = new DateTime(g.Key.Year, g.Key.Month, 1);
                return new CobradoMesDto
                {
                    Anno = g.Key.Year,
                    Mes = g.Key.Month,
                    MesNombre = d.ToString("MMM yyyy", culture),
                    CobradoVerificado = g.Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto),
                };
            }).ToList();

        // Gastos por categoría
        var gastosPorCat = gastosRaw
            .GroupBy(g => g.TipoGasto?.Categoria ?? "OTROS")
            .Select(g => new GastoCategoriaResumenDto
            {
                Categoria = g.Key,
                Total = g.Sum(x => x.Monto),
                Cantidad = g.Count(),
            })
            .OrderByDescending(g => g.Total)
            .ToList();

        return new ReporteFinancieroDto
        {
            Desde = desde,
            Hasta = hasta,
            CobradoTotal = cobradoTotal,
            PorCobrarTotal = porCobrarTotal,
            GastosHormigaTotal = gastosTotal,
            GastosCargablesTotal = gastosCargables,
            MargenBruto = cobradoTotal - (gastosTotal - gastosCargables),
            TramitesCerradosPeriodo = tramitesCerrados,
            TramitesActivosActual = tramitesActivos.Count,
            PagosPendientesVerificacion = pagosPendientes.Count,
            PagosPendientesVerificacionMonto = pagosPendientesMonto,
            EvolucionMensual = evolucion,
            GastosPorCategoria = gastosPorCat,
        };
    }

    // ─── Estado de Cuenta por Cliente ─────────────────────────────────────
    public async Task<EstadoCuentaClienteDto> GetEstadoCuentaClienteAsync(Guid clienteId)
    {
        var cliente = await _db.Clientes.FindAsync(clienteId)
            ?? throw new KeyNotFoundException("Cliente no encontrado");

        var tramites = await _db.Tramites
            .Include(t => t.Pagos)
            .Include(t => t.GastosHormiga)
            .Include(t => t.Pedimentos)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Where(t => t.ClienteId == clienteId)
            .OrderByDescending(t => t.FechaCreacion)
            .ToListAsync();

        var dtos = tramites.Select(t =>
        {
            var gastosCarg = t.GastosHormiga
                .Where(g => g.SeCargaAlCliente && g.DeletedAt == null)
                .Sum(g => g.Monto);
            var cobrosAdicionales = t.Pedimentos.Sum(p => p.CobroAdicional);
            var totalReq = t.CobroTotal + t.CargoExpress + gastosCarg + cobrosAdicionales;
            var pagado = t.Pagos
                .Where(p => p.Verificado && p.DeletedAt == null)
                .Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto);

            var vehiculo = t.Vehiculo != null
                ? string.Join(" ", new[] { t.Vehiculo.Marca?.Nombre, t.Vehiculo.Modelo?.Nombre, t.Vehiculo.Anno?.ToString() }
                    .Where(x => !string.IsNullOrWhiteSpace(x)))
                : t.DescripcionMercancia;

            return new TramiteEstadoCuentaDto
            {
                Id = t.Id,
                NumeroConsecutivo = t.NumeroConsecutivo,
                Vehiculo = vehiculo,
                EstadoLogistico = t.EstadoLogistico,
                CobroTotal = totalReq,
                TotalPagado = pagado,
                Saldo = Math.Max(0m, totalReq - pagado),
                FechaCreacion = t.FechaCreacion,
            };
        }).ToList();

        return new EstadoCuentaClienteDto
        {
            ClienteId = cliente.Id,
            Apodo = cliente.Apodo ?? cliente.Nombre ?? "",
            NombreCompleto = cliente.NombreCompleto,
            Telefono = cliente.Telefono,
            TotalFacturado = dtos.Sum(t => t.CobroTotal),
            TotalPagado = dtos.Sum(t => t.TotalPagado),
            SaldoPendiente = dtos.Sum(t => t.Saldo),
            Tramites = dtos,
        };
    }

    // ─── Pipeline de Trámites ─────────────────────────────────────────────
    public async Task<ReportePipelineDto> GetReportePipelineAsync()
    {
        var tramites = await _db.Tramites
            .Where(t => t.EstadoLogistico != "COBRADO" && t.EstadoLogistico != "CANCELADO")
            .ToListAsync();

        var now = DateTime.UtcNow;
        var etiquetas = new Dictionary<string, string>
        {
            ["PENDIENTE_TRAMITE"]        = "Pendiente de trámite",
            ["FOTOS_SOLICITADAS"]        = "Fotos solicitadas",
            ["FOTOS_RECIBIDAS"]          = "Fotos recibidas",
            ["REQUISITOS_PENDIENTES"]    = "Requisitos pendientes",
            ["BAJA_EN_PROCESO"]          = "Baja en proceso",
            ["BAJA_COMPLETADA"]          = "Baja completada",
            ["LISTO_PARA_PEDIMENTO"]     = "Listo para pedimento",
            ["PEDIMENTO_DOCUMENTADO"]    = "Pedimento documentado",
            ["PAGO_PEDIMENTO_PENDIENTE"] = "Pago pedimento pendiente",
            ["MANDADO_A_CRUCE"]          = "Mandado a cruce",
            ["EN_PROCESO"]               = "En proceso",
            ["ROJO_DESADUANADO"]         = "Desaduanado",
            ["VERDE_ENTREGADO"]          = "Entregado",
            ["ENTREGADO_AL_CLIENTE"]     = "Entregado",
            ["AMARILLO_PENDIENTE_PAGO"]  = "Pendiente de pago",
        };

        var estados = tramites
            .GroupBy(t => t.EstadoLogistico)
            .Select(g => new PipelineEstadoDto
            {
                Estado = g.Key,
                EtiquetaCliente = etiquetas.GetValueOrDefault(g.Key, g.Key),
                Cantidad = g.Count(),
                MontoTotal = g.Sum(t => t.CobroTotal),
                DiasPromedioEnEstado = Math.Round(g.Average(t =>
                    t.FechaEstadoActual.HasValue
                        ? (now - t.FechaEstadoActual.Value).TotalDays
                        : (now - t.FechaCreacion).TotalDays), 1),
            })
            .OrderByDescending(e => e.Cantidad)
            .ToList();

        return new ReportePipelineDto
        {
            TotalActivos = tramites.Count,
            Estados = estados,
        };
    }

    // ─── Productividad por Tramitador ─────────────────────────────────────
    public async Task<ReporteProductividadDto> GetReporteProductividadAsync(DateTime desde, DateTime hasta)
    {
        var desdeUtc = DateTime.SpecifyKind(desde.Date, DateTimeKind.Utc);
        var hastaUtc = DateTime.SpecifyKind(hasta.Date.AddDays(1), DateTimeKind.Utc);

        var tramitadores = await _db.Tramitadores.OrderBy(t => t.Nombre).ToListAsync();

        var activosPorTramitador = await _db.Tramites
            .Where(t => t.EstadoLogistico != "COBRADO" && t.EstadoLogistico != "CANCELADO" && t.TramitadorId != null)
            .GroupBy(t => t.TramitadorId!.Value)
            .Select(g => new { TramitadorId = g.Key, Count = g.Count() })
            .ToListAsync();

        var cerrados = await _db.Tramites
            .Include(t => t.Pagos)
            .Where(t => t.EstadoLogistico == "COBRADO"
                     && t.FechaEstadoActual >= desdeUtc
                     && t.FechaEstadoActual < hastaUtc)
            .ToListAsync();

        var result = tramitadores.Select(tr =>
        {
            var activos = activosPorTramitador.FirstOrDefault(x => x.TramitadorId == tr.Id)?.Count ?? 0;
            var cerradosTr = cerrados.Where(t => t.TramitadorId == tr.Id).ToList();

            var montoTotal = cerradosTr.Sum(t => t.CobroTotal + t.CargoExpress);
            var montoVer = cerradosTr.SelectMany(t => t.Pagos.Where(p => p.Verificado && p.DeletedAt == null))
                .Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto);

            var diasProm = cerradosTr.Count > 0
                ? cerradosTr.Average(t =>
                    t.FechaEstadoActual.HasValue
                        ? (t.FechaEstadoActual.Value - t.FechaCreacion).TotalDays
                        : 0)
                : 0;

            return new TramitadorProductividadDto
            {
                TramitadorId = tr.Id,
                Nombre = tr.Nombre,
                TramitesActivos = activos,
                TramitesCerradosPeriodo = cerradosTr.Count,
                MontoTotalCobrado = montoTotal,
                MontoTotalVerificado = montoVer,
                DiasPromedioResolucion = Math.Round(diasProm, 1),
            };
        }).ToList();

        return new ReporteProductividadDto { Desde = desde, Hasta = hasta, Tramitadores = result };
    }

    // ─── Gastos Hormiga ───────────────────────────────────────────────────
    public async Task<GastoHormigaResumenDto> GetReporteGastosHormigaAsync(DateTime desde, DateTime hasta)
    {
        var desdeUtc = DateTime.SpecifyKind(desde.Date, DateTimeKind.Utc);
        var hastaUtc = DateTime.SpecifyKind(hasta.Date.AddDays(1), DateTimeKind.Utc);

        var gastos = await _db.GastosHormiga
            .Include(g => g.TipoGasto)
            .Include(g => g.Cliente)
            .Include(g => g.Tramite).ThenInclude(t => t!.Tramitador)
            .Where(g => g.FechaGasto >= desdeUtc && g.FechaGasto < hastaUtc && g.DeletedAt == null)
            .ToListAsync();

        return new GastoHormigaResumenDto
        {
            TotalPeriodo = gastos.Sum(g => g.Monto),
            TotalCargableCliente = gastos.Where(g => g.SeCargaAlCliente).Sum(g => g.Monto),
            TotalCostoPropio = gastos.Where(g => !g.SeCargaAlCliente).Sum(g => g.Monto),
            PorCategoria = gastos
                .GroupBy(g => g.TipoGasto?.Categoria ?? "OTROS")
                .Select(g => new GastoHormigaCategoriaDto { Categoria = g.Key, Total = g.Sum(x => x.Monto), Cantidad = g.Count() })
                .OrderByDescending(c => c.Total).ToList(),
            PorCliente = gastos
                .GroupBy(g => new { g.ClienteId, Cliente = g.Cliente != null ? g.Cliente.Apodo ?? g.Cliente.Nombre ?? "Sin nombre" : "Sin cliente" })
                .Select(g => new GastoHormigaClienteDto { ClienteId = g.Key.ClienteId, Cliente = g.Key.Cliente, Total = g.Sum(x => x.Monto), Cantidad = g.Count() })
                .OrderByDescending(c => c.Total).ToList(),
            PorTramitador = gastos
                .GroupBy(g => new
                {
                    TramitadorId = g.Tramite?.TramitadorId,
                    Tramitador = g.Tramite?.Tramitador != null ? g.Tramite.Tramitador.Nombre : "Sin tramitador",
                })
                .Select(g => new GastoHormigaTramitadorDto { TramitadorId = g.Key.TramitadorId, Tramitador = g.Key.Tramitador, Total = g.Sum(x => x.Monto), Cantidad = g.Count() })
                .OrderByDescending(c => c.Total).ToList(),
        };
    }
}
