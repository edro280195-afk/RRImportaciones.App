using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.GastosHormiga;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using System.Text.Json;

namespace RR.Infrastructure.Services;

public class GastoHormigaService : IGastoHormigaService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GastoHormigaService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<GastoHormigaListDto>> GetListAsync(Guid? tramiteId, Guid? clienteId, Guid? vehiculoId, Guid? tipoGastoId, string? categoria, DateTime? fechaDesde, DateTime? fechaHasta, int page = 1, int pageSize = 20)
    {
        var query = _db.GastosHormiga
            .Include(g => g.TipoGasto)
            .Include(g => g.Tramite)
            .Include(g => g.Cliente)
            .Include(g => g.Vehiculo)
            .AsQueryable();

        if (tramiteId.HasValue)
            query = query.Where(g => g.TramiteId == tramiteId.Value);
        if (clienteId.HasValue)
            query = query.Where(g => g.ClienteId == clienteId.Value);
        if (vehiculoId.HasValue)
            query = query.Where(g => g.VehiculoId == vehiculoId.Value);
        if (tipoGastoId.HasValue)
            query = query.Where(g => g.TipoGastoId == tipoGastoId.Value);
        if (!string.IsNullOrWhiteSpace(categoria))
            query = query.Where(g => g.TipoGasto.Categoria == categoria);
        if (fechaDesde.HasValue)
            query = query.Where(g => g.FechaGasto >= fechaDesde.Value);
        if (fechaHasta.HasValue)
            query = query.Where(g => g.FechaGasto <= fechaHasta.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(g => g.FechaGasto)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new GastoHormigaListDto
            {
                Id = g.Id,
                TramiteId = g.TramiteId,
                ClienteId = g.ClienteId,
                VehiculoId = g.VehiculoId,
                TipoGastoId = g.TipoGastoId,
                NumeroConsecutivo = g.Tramite != null ? g.Tramite.NumeroConsecutivo : null,
                ClienteNombre = g.Cliente != null ? g.Cliente.Apodo : null,
                VehiculoVin = g.Vehiculo != null ? g.Vehiculo.VinCorto : null,
                TipoGasto = g.TipoGasto.Nombre,
                Concepto = g.Concepto,
                Monto = g.Monto,
                Moneda = g.Moneda,
                SeCargaAlCliente = g.SeCargaAlCliente,
                ComprobanteUrl = g.ComprobanteUrl,
                FechaGasto = g.FechaGasto,
            })
            .ToListAsync();

        return new PagedResult<GastoHormigaListDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<GastoHormigaListDto?> GetByIdAsync(Guid id)
    {
        return await _db.GastosHormiga
            .Include(g => g.TipoGasto)
            .Include(g => g.Tramite)
            .Include(g => g.Cliente)
            .Include(g => g.Vehiculo)
            .Where(g => g.Id == id)
            .Select(g => new GastoHormigaListDto
            {
                Id = g.Id,
                TramiteId = g.TramiteId,
                ClienteId = g.ClienteId,
                VehiculoId = g.VehiculoId,
                TipoGastoId = g.TipoGastoId,
                NumeroConsecutivo = g.Tramite != null ? g.Tramite.NumeroConsecutivo : null,
                ClienteNombre = g.Cliente != null ? g.Cliente.Apodo : null,
                VehiculoVin = g.Vehiculo != null ? g.Vehiculo.VinCorto : null,
                TipoGasto = g.TipoGasto.Nombre,
                Concepto = g.Concepto,
                Monto = g.Monto,
                Moneda = g.Moneda,
                SeCargaAlCliente = g.SeCargaAlCliente,
                ComprobanteUrl = g.ComprobanteUrl,
                FechaGasto = g.FechaGasto,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<GastoHormigaListDto> CreateAsync(CreateGastoHormigaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Concepto))
            throw new InvalidOperationException("El concepto es obligatorio");

        if (request.Monto <= 0)
            throw new InvalidOperationException("El monto debe ser mayor a cero");

        var tipoGasto = await _db.TiposGastoHormiga.FindAsync(request.TipoGastoId)
            ?? throw new KeyNotFoundException("Tipo de gasto no encontrado");

        Tramite? tramite = null;
        if (request.TramiteId.HasValue)
        {
            tramite = await _db.Tramites
                .Include(t => t.Cliente)
                .Include(t => t.Vehiculo)
                .FirstOrDefaultAsync(t => t.Id == request.TramiteId.Value)
                ?? throw new KeyNotFoundException("Trámite no encontrado");
        }

        var gasto = new GastoHormiga
        {
            Id = Guid.NewGuid(),
            TramiteId = request.TramiteId,
            ClienteId = tramite?.ClienteId,
            VehiculoId = tramite?.VehiculoId,
            TipoGastoId = request.TipoGastoId,
            Concepto = request.Concepto,
            Monto = request.Monto,
            Moneda = request.Moneda,
            GastoUsd = request.GastoUsd,
            ComprobanteUrl = request.ComprobanteUrl,
            SeCargaAlCliente = request.SeCargaAlCliente,
            FechaGasto = request.FechaGasto,
            RegistradoPor = _currentUser.UserId ?? Guid.Empty,
            FechaRegistro = DateTime.UtcNow,
        };

        _db.GastosHormiga.Add(gasto);
        _db.AuditoriaLogs.Add(BuildAuditLog("CREATE_GASTO_HORMIGA", "GastoHormiga", gasto.Id.ToString(), null, SnapshotGasto(gasto)));
        await _db.SaveChangesAsync();

        return (await GetByIdAsync(gasto.Id))!;
    }

    public async Task<GastoHormigaListDto> UpdateAsync(Guid id, UpdateGastoHormigaRequest request)
    {
        var gasto = await _db.GastosHormiga.FindAsync(id)
            ?? throw new KeyNotFoundException("Gasto no encontrado");

        if (string.IsNullOrWhiteSpace(request.Concepto))
            throw new InvalidOperationException("El concepto es obligatorio");

        if (request.Monto <= 0)
            throw new InvalidOperationException("El monto debe ser mayor a cero");

        var before = SnapshotGasto(gasto);

        Tramite? tramite = null;
        if (request.TramiteId.HasValue)
        {
            tramite = await _db.Tramites
                .Include(t => t.Cliente)
                .Include(t => t.Vehiculo)
                .FirstOrDefaultAsync(t => t.Id == request.TramiteId.Value)
                ?? throw new KeyNotFoundException("Trámite no encontrado");
        }

        gasto.TramiteId = request.TramiteId;
        gasto.ClienteId = tramite?.ClienteId;
        gasto.VehiculoId = tramite?.VehiculoId;
        gasto.TipoGastoId = request.TipoGastoId;
        gasto.Concepto = request.Concepto;
        gasto.Monto = request.Monto;
        gasto.Moneda = request.Moneda;
        gasto.GastoUsd = request.GastoUsd;
        gasto.ComprobanteUrl = request.ComprobanteUrl;
        gasto.SeCargaAlCliente = request.SeCargaAlCliente;
        gasto.FechaGasto = request.FechaGasto;

        _db.AuditoriaLogs.Add(BuildAuditLog("UPDATE_GASTO_HORMIGA", "GastoHormiga", gasto.Id.ToString(), before, SnapshotGasto(gasto)));
        await _db.SaveChangesAsync();

        return (await GetByIdAsync(gasto.Id))!;
    }

    public async Task DeleteAsync(Guid id)
    {
        var gasto = await _db.GastosHormiga.FindAsync(id)
            ?? throw new KeyNotFoundException("Gasto no encontrado");

        _db.AuditoriaLogs.Add(BuildAuditLog("DELETE_GASTO_HORMIGA", "GastoHormiga", gasto.Id.ToString(), SnapshotGasto(gasto), null));
        gasto.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<GastoHormigaResumenDto> GetResumenAsync(DateTime? fechaDesde, DateTime? fechaHasta)
    {
        var query = _db.GastosHormiga
            .Include(g => g.TipoGasto)
            .Include(g => g.Cliente)
            .Include(g => g.Tramite).ThenInclude(t => t.Tramitador)
            .AsQueryable();

        if (fechaDesde.HasValue)
            query = query.Where(g => g.FechaGasto >= fechaDesde.Value);
        if (fechaHasta.HasValue)
            query = query.Where(g => g.FechaGasto <= fechaHasta.Value);

        var gastos = await query.ToListAsync();

        return new GastoHormigaResumenDto
        {
            TotalPeriodo = gastos.Sum(g => g.Monto),
            TotalCargableCliente = gastos.Where(g => g.SeCargaAlCliente).Sum(g => g.Monto),
            TotalCostoPropio = gastos.Where(g => !g.SeCargaAlCliente).Sum(g => g.Monto),
            PorCategoria = gastos
                .GroupBy(g => g.TipoGasto.Categoria)
                .Select(g => new GastoHormigaCategoriaDto
                {
                    Categoria = g.Key,
                    Total = g.Sum(x => x.Monto),
                    Cantidad = g.Count(),
                })
                .OrderByDescending(c => c.Total)
                .ToList(),
            PorCliente = gastos
                .GroupBy(g => new { g.ClienteId, Cliente = g.Cliente != null ? g.Cliente.Apodo : "Sin cliente" })
                .Select(g => new GastoHormigaClienteDto
                {
                    ClienteId = g.Key.ClienteId,
                    Cliente = g.Key.Cliente,
                    Total = g.Sum(x => x.Monto),
                    Cantidad = g.Count(),
                })
                .OrderByDescending(c => c.Total)
                .ToList(),
            PorTramitador = gastos
                .GroupBy(g => new
                {
                    TramitadorId = g.Tramite != null ? g.Tramite.TramitadorId : null,
                    Tramitador = g.Tramite != null && g.Tramite.Tramitador != null ? g.Tramite.Tramitador.Nombre : "Sin tramitador",
                })
                .Select(g => new GastoHormigaTramitadorDto
                {
                    TramitadorId = g.Key.TramitadorId,
                    Tramitador = g.Key.Tramitador,
                    Total = g.Sum(x => x.Monto),
                    Cantidad = g.Count(),
                })
                .OrderByDescending(c => c.Total)
                .ToList(),
        };
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

    private static object SnapshotGasto(GastoHormiga gasto)
    {
        return new
        {
            gasto.Id,
            gasto.TramiteId,
            gasto.ClienteId,
            gasto.VehiculoId,
            gasto.TipoGastoId,
            gasto.Concepto,
            gasto.Monto,
            gasto.Moneda,
            gasto.GastoUsd,
            gasto.ComprobanteUrl,
            gasto.SeCargaAlCliente,
            gasto.FechaGasto,
            gasto.FechaRegistro,
            gasto.RegistradoPor,
            gasto.DeletedAt,
        };
    }
}
