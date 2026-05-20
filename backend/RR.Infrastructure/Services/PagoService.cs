using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.Pagos;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using System.Text.Json;

namespace RR.Infrastructure.Services;

public class PagoService : IPagoService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IBanxicoService _banxico;
    private readonly IPagoReciboPdfService _reciboPdf;

    public PagoService(AppDbContext db, ICurrentUserService currentUser, IBanxicoService banxico, IPagoReciboPdfService reciboPdf)
    {
        _db = db;
        _currentUser = currentUser;
        _banxico = banxico;
        _reciboPdf = reciboPdf;
    }

    public async Task<PagedResult<PagoListDto>> GetListAsync(Guid? tramiteId, string? search, DateTime? fechaDesde, DateTime? fechaHasta, bool? verificado, string? metodo, int page = 1, int pageSize = 20)
    {
        var query = _db.Pagos
            .Include(p => p.Tramite)
                .ThenInclude(t => t.Cliente)
            .AsQueryable();

        if (tramiteId.HasValue)
            query = query.Where(p => p.TramiteId == tramiteId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.Tramite.NumeroConsecutivo.ToLower().Contains(term) ||
                (p.Tramite.Cliente != null && (
                    p.Tramite.Cliente.Apodo.ToLower().Contains(term) ||
                    (p.Tramite.Cliente.NombreCompleto != null && p.Tramite.Cliente.NombreCompleto.ToLower().Contains(term))
                )) ||
                p.PagadoPor.ToLower().Contains(term) ||
                p.Metodo.ToLower().Contains(term) ||
                (p.Banco != null && p.Banco.ToLower().Contains(term)) ||
                (p.Referencia != null && p.Referencia.ToLower().Contains(term)));
        }
        if (fechaDesde.HasValue)
            query = query.Where(p => p.FechaPago >= fechaDesde.Value);
        if (fechaHasta.HasValue)
            query = query.Where(p => p.FechaPago <= fechaHasta.Value);
        if (verificado.HasValue)
            query = query.Where(p => p.Verificado == verificado.Value);
        if (!string.IsNullOrWhiteSpace(metodo))
            query = query.Where(p => p.Metodo == metodo);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.FechaPago)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PagoListDto
            {
                Id = p.Id,
                TramiteId = p.TramiteId,
                NumeroConsecutivo = p.Tramite.NumeroConsecutivo,
                ClienteNombre = p.Tramite.Cliente != null ? p.Tramite.Cliente.Apodo : null,
                Monto = p.Monto,
                Moneda = p.Moneda,
                TipoCambio = p.TipoCambio,
                TipoMovimiento = p.TipoMovimiento,
                PagadoPor = p.PagadoPor,
                SeCobraAlCliente = p.SeCobraAlCliente,
                Metodo = p.Metodo,
                Banco = p.Banco,
                Referencia = p.Referencia,
                ComprobanteUrl = p.ComprobanteUrl,
                FolioRecibo = p.FolioRecibo,
                ReciboPagoUrl = p.ReciboPagoUrl,
                ReciboGeneradoEn = p.ReciboGeneradoEn,
                FechaPago = p.FechaPago,
                Verificado = p.Verificado,
                FechaRegistro = p.FechaRegistro,
            })
            .ToListAsync();

        return new PagedResult<PagoListDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<PagoDetailDto?> GetByIdAsync(Guid id)
    {
        return await _db.Pagos
            .IgnoreQueryFilters()
            .Include(p => p.Tramite).ThenInclude(t => t.Cliente)
            .Where(p => p.Id == id)
            .Select(p => new PagoDetailDto
            {
                Id = p.Id,
                TramiteId = p.TramiteId,
                NumeroConsecutivo = p.Tramite.NumeroConsecutivo,
                ClienteNombre = p.Tramite.Cliente != null ? p.Tramite.Cliente.Apodo : null,
                Monto = p.Monto,
                Moneda = p.Moneda,
                TipoCambio = p.TipoCambio,
                TipoMovimiento = p.TipoMovimiento,
                PagadoPor = p.PagadoPor,
                SeCobraAlCliente = p.SeCobraAlCliente,
                Metodo = p.Metodo,
                Banco = p.Banco,
                Referencia = p.Referencia,
                ComprobanteUrl = p.ComprobanteUrl,
                FolioRecibo = p.FolioRecibo,
                ReciboPagoUrl = p.ReciboPagoUrl,
                ReciboGeneradoEn = p.ReciboGeneradoEn,
                Notas = p.Notas,
                FechaPago = p.FechaPago,
                Verificado = p.Verificado,
                VerificadoEn = p.VerificadoEn,
                FechaRegistro = p.FechaRegistro,
                RegistradoPor = p.RegistradoPor,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<PagoDetailDto> CreateAsync(CreatePagoRequest request)
    {
        if (request.Monto <= 0)
            throw new InvalidOperationException("El monto debe ser mayor a cero");

        var metodo = string.IsNullOrWhiteSpace(request.Metodo) ? "TRANSFERENCIA" : request.Metodo.Trim().ToUpperInvariant();
        if (metodo != "EFECTIVO" && string.IsNullOrWhiteSpace(request.ComprobanteUrl))
            throw new InvalidOperationException("El comprobante es obligatorio para pagos que no son en efectivo");

        var tramite = await _db.Tramites.FindAsync(request.TramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");

        decimal? tipoCambio = request.TipoCambio;

        if (request.Moneda == "USD" && tipoCambio is null)
        {
            try
            {
                tipoCambio = await _banxico.GetTipoCambioUsdMxnAsync();
            }
            catch (InvalidOperationException ex)
            {
                throw new InvalidOperationException("No se pudo obtener el tipo de cambio de Banxico", ex);
            }
        }

        if (request.Moneda == "USD" && tipoCambio is null)
            throw new InvalidOperationException("El tipo de cambio es obligatorio para pagos en USD");

        if (request.Moneda == "USD" && tipoCambio <= 0)
            throw new InvalidOperationException("El tipo de cambio debe ser mayor a cero");

        if (metodo is "TRANSFERENCIA" or "DEPOSITO" && string.IsNullOrWhiteSpace(request.Banco))
            throw new InvalidOperationException("El banco es obligatorio para transferencias y depositos");

        var montoMxn = request.Moneda == "USD" ? request.Monto * (tipoCambio ?? 0m) : request.Monto;
        var saldoPendiente = await GetSaldoPendienteOperativoMxnAsync(request.TramiteId);
        if (montoMxn > saldoPendiente)
            throw new InvalidOperationException($"El monto del pago ({montoMxn:N2} MXN) es mayor al saldo pendiente ({saldoPendiente:N2} MXN)");

        var pagoId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var pago = new Pago
        {
            Id = pagoId,
            TramiteId = request.TramiteId,
            Monto = request.Monto,
            Moneda = request.Moneda,
            TipoCambio = tipoCambio,
            TipoMovimiento = NormalizeTipoMovimiento(request.TipoMovimiento),
            PagadoPor = NormalizePagadoPor(request.PagadoPor),
            SeCobraAlCliente = request.SeCobraAlCliente,
            Metodo = metodo,
            Banco = request.Banco,
            Referencia = request.Referencia,
            ComprobanteUrl = string.IsNullOrWhiteSpace(request.ComprobanteUrl) ? null : request.ComprobanteUrl,
            FolioRecibo = BuildFolioRecibo(now, pagoId),
            Notas = request.Notas,
            FechaPago = EnsureUtc(request.FechaPago),
            Verificado = false,
            RegistradoPor = _currentUser.UserId ?? Guid.Empty,
            FechaRegistro = now,
        };

        _db.Pagos.Add(pago);
        _db.AuditoriaLogs.Add(BuildAuditLog("CREATE_PAGO", "Pago", pago.Id.ToString(), null, SnapshotPago(pago)));
        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = pago.TramiteId,
            Tipo = "PAGO",
            Contenido = $"{PagoEventoLabel(pago)} registrado por {FormatMoney(pago.Monto, pago.Moneda)}",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });
        await _db.SaveChangesAsync();

        try
        {
            await _reciboPdf.GenerateAndSaveAsync(pago.Id, force: true);
        }
        catch
        {
            // El pago no debe perderse si falla el PDF. La UI permite regenerar el recibo.
        }

        return (await GetByIdAsync(pago.Id))!;
    }

    public async Task<PagoDetailDto> UpdateAsync(Guid id, UpdatePagoRequest request)
    {
        var pago = await _db.Pagos.FindAsync(id)
            ?? throw new KeyNotFoundException("Pago no encontrado");

        if (pago.Verificado && _currentUser.Role is not ("ADMIN" or "GERENTE"))
            throw new InvalidOperationException("Solo ADMIN o GERENTE pueden editar un pago verificado");

        if (request.Monto <= 0)
            throw new InvalidOperationException("El monto debe ser mayor a cero");

        var metodo = string.IsNullOrWhiteSpace(request.Metodo) ? "TRANSFERENCIA" : request.Metodo.Trim().ToUpperInvariant();
        var comprobanteUrl = string.IsNullOrWhiteSpace(request.ComprobanteUrl) ? pago.ComprobanteUrl : request.ComprobanteUrl;
        if (metodo != "EFECTIVO" && string.IsNullOrWhiteSpace(comprobanteUrl))
            throw new InvalidOperationException("El comprobante es obligatorio para pagos que no son en efectivo");

        var tramite = await _db.Tramites.FindAsync(request.TramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");

        decimal? tipoCambio = request.TipoCambio;
        if (request.Moneda == "USD" && tipoCambio is null)
        {
            try
            {
                tipoCambio = await _banxico.GetTipoCambioUsdMxnAsync();
            }
            catch (InvalidOperationException ex)
            {
                throw new InvalidOperationException("No se pudo obtener el tipo de cambio de Banxico", ex);
            }
        }

        if (request.Moneda == "USD" && tipoCambio is null)
            throw new InvalidOperationException("El tipo de cambio es obligatorio para pagos en USD");

        if (request.Moneda == "USD" && tipoCambio <= 0)
            throw new InvalidOperationException("El tipo de cambio debe ser mayor a cero");

        if (metodo is "TRANSFERENCIA" or "DEPOSITO" && string.IsNullOrWhiteSpace(request.Banco))
            throw new InvalidOperationException("El banco es obligatorio para transferencias y depositos");

        var montoMxn = request.Moneda == "USD" ? request.Monto * (tipoCambio ?? 0m) : request.Monto;
        var saldoPendiente = await GetSaldoPendienteOperativoMxnAsync(request.TramiteId, pago.Id);
        if (montoMxn > saldoPendiente)
            throw new InvalidOperationException($"El monto del pago ({montoMxn:N2} MXN) es mayor al saldo disponible ({saldoPendiente:N2} MXN)");

        var before = SnapshotPago(pago);

        pago.TramiteId = tramite.Id;
        pago.Monto = request.Monto;
        pago.Moneda = request.Moneda;
        pago.TipoCambio = tipoCambio;
        pago.TipoMovimiento = NormalizeTipoMovimiento(request.TipoMovimiento);
        pago.PagadoPor = NormalizePagadoPor(request.PagadoPor);
        pago.SeCobraAlCliente = request.SeCobraAlCliente;
        pago.Metodo = metodo;
        pago.Banco = request.Banco;
        pago.Referencia = request.Referencia;
        pago.ComprobanteUrl = string.IsNullOrWhiteSpace(comprobanteUrl) ? null : comprobanteUrl;
        pago.Notas = request.Notas;
        pago.FechaPago = EnsureUtc(request.FechaPago);
        pago.ReciboPagoUrl = null;
        pago.ReciboGeneradoEn = null;

        _db.AuditoriaLogs.Add(BuildAuditLog("UPDATE_PAGO", "Pago", pago.Id.ToString(), before, SnapshotPago(pago)));
        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = pago.TramiteId,
            Tipo = "PAGO",
            Contenido = $"{PagoEventoLabel(pago)} editado por {FormatMoney(pago.Monto, pago.Moneda)}",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();

        try
        {
            await _reciboPdf.GenerateAndSaveAsync(pago.Id, force: true);
        }
        catch
        {
            // El pago editado se conserva aunque falle el PDF; se puede regenerar manualmente.
        }

        return (await GetByIdAsync(pago.Id))!;
    }

    public async Task<PagoVerificarResponse> VerificarAsync(Guid id)
    {
        var pago = await _db.Pagos.FindAsync(id)
            ?? throw new KeyNotFoundException("Pago no encontrado");

        if (pago.Verificado)
            throw new InvalidOperationException("El pago ya está verificado");

        pago.Verificado = true;
        pago.VerificadoPor = _currentUser.UserId;
        pago.VerificadoEn = DateTime.UtcNow;

        _db.AuditoriaLogs.Add(BuildAuditLog("VERIFY_PAGO", "Pago", pago.Id.ToString(), null, SnapshotPago(pago)));

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = pago.TramiteId,
            Tipo = "PAGO",
            Contenido = $"Pago verificado por {FormatMoney(ConvertPagoToMxn(pago), "MXN")}",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();

        var tramite = await _db.Tramites.FindAsync(pago.TramiteId);
        var tramiteCobrado = false;

        if (tramite is not null && await GetTotalPagadoVerificadoMxnAsync(pago.TramiteId) >= await GetTotalRequeridoMxnAsync(pago.TramiteId))
        {
            tramite.EstadoLogistico = "COBRADO";
            tramite.FechaEstadoActual = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            tramiteCobrado = true;
        }

        return new PagoVerificarResponse
        {
            TramiteCobrado = tramiteCobrado,
            Mensaje = tramiteCobrado
                ? "Pago verificado. El trámite ha sido marcado como COBRADO."
                : "Pago verificado exitosamente.",
        };
    }

    public async Task<PagoVerificarResponse> VerificarBulkAsync(IEnumerable<Guid> ids)
    {
        var pagoIds = ids.Distinct().ToList();
        if (pagoIds.Count == 0)
            throw new InvalidOperationException("Debe seleccionar al menos un pago");

        var ultimoMensaje = "Pagos verificados exitosamente.";
        var algunTramiteCobrado = false;

        foreach (var id in pagoIds)
        {
            var result = await VerificarAsync(id);
            algunTramiteCobrado = algunTramiteCobrado || result.TramiteCobrado;
            ultimoMensaje = result.Mensaje;
        }

        return new PagoVerificarResponse
        {
            TramiteCobrado = algunTramiteCobrado,
            Mensaje = pagoIds.Count == 1 ? ultimoMensaje : $"Se verificaron {pagoIds.Count} pagos.",
        };
    }

    public async Task<PagoComprobanteResponse> ActualizarComprobanteAsync(Guid id, string comprobanteUrl)
    {
        var pago = await _db.Pagos.FindAsync(id)
            ?? throw new KeyNotFoundException("Pago no encontrado");

        if (string.IsNullOrWhiteSpace(comprobanteUrl))
            throw new InvalidOperationException("El comprobante es obligatorio");

        pago.ComprobanteUrl = comprobanteUrl;
        _db.AuditoriaLogs.Add(BuildAuditLog("UPDATE_PAGO_COMPROBANTE", "Pago", pago.Id.ToString(), null, new
        {
            pago.Id,
            pago.TramiteId,
            pago.ComprobanteUrl,
        }));
        await _db.SaveChangesAsync();

        return new PagoComprobanteResponse
        {
            PagoId = id,
            ComprobanteUrl = comprobanteUrl,
        };
    }

    public Task<PagoReciboResponse> RegenerarReciboAsync(Guid id)
    {
        return _reciboPdf.GenerateAndSaveAsync(id, force: true);
    }

    public async Task DeleteAsync(Guid id)
    {
        var pago = await _db.Pagos.FindAsync(id)
            ?? throw new KeyNotFoundException("Pago no encontrado");

        if (pago.Verificado && _currentUser.Role != "ADMIN")
            throw new InvalidOperationException("Solo ADMIN puede eliminar un pago verificado");

        _db.AuditoriaLogs.Add(BuildAuditLog(pago.Verificado ? "DELETE_PAGO_VERIFICADO" : "DELETE_PAGO", "Pago", pago.Id.ToString(), SnapshotPago(pago), null));

        var pagoLabel = FormatMoney(pago.Monto, pago.Moneda);
        var eventosPago = await _db.Eventos
            .Where(e => e.TramiteId == pago.TramiteId && e.Tipo == "PAGO" && e.Contenido.Contains(pagoLabel))
            .Where(e => e.FechaEvento >= pago.FechaRegistro.AddMinutes(-1) && e.FechaEvento <= pago.FechaRegistro.AddMinutes(1))
            .ToListAsync();
        _db.Eventos.RemoveRange(eventosPago);

        pago.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<PagoResumenDto> GetResumenByTramiteAsync(Guid tramiteId)
    {
        var tramite = await _db.Tramites.FindAsync(tramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");

        var pagos = await _db.Pagos
            .Where(p => p.TramiteId == tramiteId)
            .ToListAsync();

        return new PagoResumenDto
        {
            CobroTotal = await GetTotalRequeridoMxnAsync(tramiteId),
            TotalPagado = pagos.Sum(ConvertPagoToMxn),
            TotalVerificado = pagos.Where(p => p.Verificado).Sum(ConvertPagoToMxn),
            SaldoPendiente = await GetTotalRequeridoMxnAsync(tramiteId) - pagos.Where(p => p.Verificado).Sum(ConvertPagoToMxn),
        };
    }

    private async Task<decimal> GetTotalPagadoVerificadoMxnAsync(Guid tramiteId)
    {
        var pagos = await _db.Pagos.Where(p => p.TramiteId == tramiteId && p.Verificado).ToListAsync();
        return pagos.Sum(ConvertPagoToMxn);
    }

    private async Task<decimal> GetTotalRequeridoMxnAsync(Guid tramiteId)
    {
        var tramite = await _db.Tramites.FindAsync(tramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");
        var cobrosAdicionales = await _db.Pedimentos.Where(p => p.TramiteId == tramiteId).SumAsync(p => p.CobroAdicional);
        var gastosCargables = await _db.GastosHormiga
            .Where(g => g.TramiteId == tramiteId && g.SeCargaAlCliente)
            .ToListAsync();

        return tramite.CobroTotal + tramite.CargoExpress + cobrosAdicionales + gastosCargables.Sum(ConvertGastoToMxn);
    }

    private async Task<decimal> GetSaldoPendienteOperativoMxnAsync(Guid tramiteId, Guid? excluirPagoId = null)
    {
        var totalRequerido = await GetTotalRequeridoMxnAsync(tramiteId);
        var query = _db.Pagos.Where(p => p.TramiteId == tramiteId);

        if (excluirPagoId.HasValue)
            query = query.Where(p => p.Id != excluirPagoId.Value);

        var pagosRegistrados = await query.ToListAsync();

        return Math.Max(0, totalRequerido - pagosRegistrados.Sum(ConvertPagoToMxn));
    }

    private AuditoriaLog BuildAuditLog(string accion, string entidad, string entidadId, object? anteriores, object? nuevos)
    {
        return new AuditoriaLog
        {
            Id = Guid.NewGuid(),
            UsuarioId = _currentUser.UserId,
            Accion = accion,
            Entidad = entidad,
            EntidadId = entidadId,
            ValoresAnteriores = anteriores is null ? null : JsonSerializer.Serialize(anteriores),
            ValoresNuevos = nuevos is null ? null : JsonSerializer.Serialize(nuevos),
            Fecha = DateTime.UtcNow,
        };
    }

    private static object SnapshotPago(Pago pago)
    {
        return new
        {
            pago.Id,
            pago.TramiteId,
            pago.Monto,
            pago.Moneda,
            pago.TipoCambio,
            pago.TipoMovimiento,
            pago.PagadoPor,
            pago.SeCobraAlCliente,
            pago.Metodo,
            pago.Banco,
            pago.Referencia,
            pago.ComprobanteUrl,
            pago.FolioRecibo,
            pago.ReciboPagoUrl,
            pago.Notas,
            pago.FechaPago,
            pago.Verificado,
            pago.VerificadoPor,
            pago.VerificadoEn,
            pago.FechaRegistro,
            pago.DeletedAt,
        };
    }

    private static decimal ConvertPagoToMxn(Pago pago)
    {
        return pago.Moneda == "USD" ? pago.Monto * (pago.TipoCambio ?? 0m) : pago.Monto;
    }

    private static decimal ConvertGastoToMxn(GastoHormiga gasto)
    {
        return gasto.Moneda == "USD" ? gasto.Monto * (gasto.GastoUsd ?? 0m) : gasto.Monto;
    }

    private static string FormatMoney(decimal amount, string currency)
    {
        return $"{amount:N2} {currency}";
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    private static string NormalizeTipoMovimiento(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "PAGO_CLIENTE" : value.Trim().ToUpperInvariant();
        var allowed = new HashSet<string>
        {
            "ANTICIPO_CLIENTE",
            "PAGO_CLIENTE",
            "PAGO_RR",
            "PAGO_PEDIMENTO",
            "AJUSTE",
            "REEMBOLSO",
        };
        return allowed.Contains(normalized) ? normalized : "PAGO_CLIENTE";
    }

    private static string NormalizePagadoPor(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "CLIENTE" : value.Trim().ToUpperInvariant();
        return normalized is "CLIENTE" or "RR" or "TERCERO" ? normalized : "CLIENTE";
    }

    private static string PagoEventoLabel(Pago pago) => pago.TipoMovimiento switch
    {
        "ANTICIPO_CLIENTE" => "Anticipo del cliente",
        "PAGO_RR" => "Pago cubierto por R&R",
        "PAGO_PEDIMENTO" => "Pago de pedimento",
        "AJUSTE" => "Ajuste",
        "REEMBOLSO" => "Reembolso",
        _ => "Pago",
    };

    private static string BuildFolioRecibo(DateTime fecha, Guid pagoId)
    {
        return $"REC-{fecha:yyyyMM}-{pagoId.ToString("N")[..6].ToUpperInvariant()}";
    }
}
