using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.LotesImportacion;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class LoteImportacionService : ILoteImportacionService
{
    private static readonly HashSet<string> TerminalStates = ["ENTREGADO_AL_CLIENTE", "VERDE_ENTREGADO", "COBRADO", "CANCELADO"];

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public LoteImportacionService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<LoteListDto>> GetListAsync(string? search, string? estado, Guid? clienteId, int page, int pageSize)
    {
        var query = _db.LotesImportacion
            .Where(l => l.DeletedAt == null)
            .Include(l => l.Cliente)
            .Include(l => l.Aduana)
            .Include(l => l.Tramitador)
            .Include(l => l.Tramites).ThenInclude(t => t.Pagos)
            .Include(l => l.Tramites).ThenInclude(t => t.Pedimentos)
            .Include(l => l.Tramites).ThenInclude(t => t.GastosHormiga)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(l =>
                l.FolioLote.ToLower().Contains(term) ||
                l.Cliente.Apodo.ToLower().Contains(term) ||
                (l.Cliente.NombreCompleto != null && l.Cliente.NombreCompleto.ToLower().Contains(term)) ||
                l.Tramites.Any(t =>
                    t.NumeroConsecutivo.ToLower().Contains(term) ||
                    (t.Vehiculo != null && t.Vehiculo.Vin.ToLower().Contains(term))));
        }

        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(l => l.Estado == estado);

        if (clienteId.HasValue)
            query = query.Where(l => l.ClienteId == clienteId.Value);

        var total = await query.CountAsync();
        var lotes = await query
            .OrderByDescending(l => l.FechaCreacion)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<LoteListDto>
        {
            Items = lotes.Select(MapList).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<LoteDetailDto?> GetByIdAsync(Guid id)
    {
        var lote = await BuildDetailQuery().FirstOrDefaultAsync(l => l.Id == id);
        return lote == null ? null : MapDetail(lote);
    }

    public async Task<LoteDetailDto> CreateAsync(CreateLoteRequest request)
    {
        ValidateCreateRequest(request);

        await using var tx = await _db.Database.BeginTransactionAsync();

        var cliente = await _db.Clientes.FirstOrDefaultAsync(c => c.Id == request.ClienteId)
            ?? throw new KeyNotFoundException("Cliente no encontrado");

        if (request.AduanaId.HasValue)
        {
            var exists = await _db.Aduanas.AnyAsync(a => a.Id == request.AduanaId.Value);
            if (!exists) throw new InvalidOperationException("Aduana no encontrada");
        }

        if (request.TramitadorId.HasValue)
        {
            var exists = await _db.Tramitadores.AnyAsync(t => t.Id == request.TramitadorId.Value && t.Activo);
            if (!exists) throw new InvalidOperationException("Tramitador no encontrado o inactivo");
        }

        ValidateDuplicateVins(request.Vehiculos);

        var lote = new LoteImportacion
        {
            Id = Guid.NewGuid(),
            FolioLote = await GenerateLoteFolioAsync(),
            ClienteId = cliente.Id,
            AduanaId = request.AduanaId,
            TramitadorId = request.TramitadorId,
            TipoTramite = NormalizeTipoTramite(request.TipoTramite),
            Estado = "EN_PROGRESO",
            Notas = NormalizeOptional(request.Notas),
            FechaCreacion = DateTime.UtcNow,
        };

        _db.LotesImportacion.Add(lote);

        var nextNumber = await GetNextTramiteNumberAsync();
        foreach (var item in request.Vehiculos)
        {
            var vehiculo = await ResolveVehiculoAsync(request.ClienteId, item);
            var tipoTramite = NormalizeTipoTramite(item.TipoTramite ?? request.TipoTramite);
            var tramite = BuildTramite(lote, item, vehiculo, BuildTramiteNumero(nextNumber++), tipoTramite);

            _db.Tramites.Add(tramite);
            _db.Eventos.Add(new Evento
            {
                Id = Guid.NewGuid(),
                TramiteId = tramite.Id,
                Tipo = "CREACION",
                Contenido = $"Tramite creado desde lote {lote.FolioLote}",
                EstadoNuevo = "PENDIENTE_TRAMITE",
                FechaEvento = DateTime.UtcNow,
                CreadoPor = _currentUser.UserId ?? Guid.Empty,
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return (await GetByIdAsync(lote.Id))!;
    }

    public async Task<LoteDetailDto> UpdateAsync(Guid id, UpdateLoteRequest request)
    {
        var lote = await _db.LotesImportacion.FindAsync(id)
            ?? throw new KeyNotFoundException("Lote no encontrado");

        if (request.AduanaId.HasValue)
        {
            var exists = await _db.Aduanas.AnyAsync(a => a.Id == request.AduanaId.Value);
            if (!exists) throw new InvalidOperationException("Aduana no encontrada");
            lote.AduanaId = request.AduanaId;
        }

        if (request.TramitadorId.HasValue)
        {
            var exists = await _db.Tramitadores.AnyAsync(t => t.Id == request.TramitadorId.Value && t.Activo);
            if (!exists) throw new InvalidOperationException("Tramitador no encontrado o inactivo");
            lote.TramitadorId = request.TramitadorId;
        }

        if (!string.IsNullOrWhiteSpace(request.TipoTramite))
            lote.TipoTramite = NormalizeTipoTramite(request.TipoTramite);

        if (!string.IsNullOrWhiteSpace(request.Estado))
            lote.Estado = NormalizeEstado(request.Estado);

        lote.FechaCruce = request.FechaCruce;
        lote.Notas = request.Notas;
        lote.FechaModificacion = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return (await GetByIdAsync(id))!;
    }

    public async Task<LoteDetailDto> AgregarVehiculoAsync(Guid id, AgregarVehiculoALoteRequest request)
    {
        var lote = await _db.LotesImportacion.FindAsync(id)
            ?? throw new KeyNotFoundException("Lote no encontrado");

        if (lote.Estado == "CANCELADO" || lote.Estado == "CERRADO")
            throw new InvalidOperationException("No se pueden agregar vehiculos a un lote cerrado o cancelado");

        ValidateItem(request);

        await using var tx = await _db.Database.BeginTransactionAsync();

        var vehiculo = await ResolveVehiculoAsync(lote.ClienteId, request);
        var nextNumber = await GetNextTramiteNumberAsync();
        var tramite = BuildTramite(lote, request, vehiculo, BuildTramiteNumero(nextNumber), NormalizeTipoTramite(request.TipoTramite ?? lote.TipoTramite));

        _db.Tramites.Add(tramite);
        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            Tipo = "CREACION",
            Contenido = $"Tramite agregado al lote {lote.FolioLote}",
            EstadoNuevo = "PENDIENTE_TRAMITE",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        lote.Estado = "EN_PROGRESO";
        lote.FechaModificacion = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return (await GetByIdAsync(lote.Id))!;
    }

    public async Task CancelarLoteAsync(Guid id)
    {
        var lote = await _db.LotesImportacion
            .Include(l => l.Tramites)
            .FirstOrDefaultAsync(l => l.Id == id)
            ?? throw new KeyNotFoundException("Lote no encontrado");

        if (lote.Estado == "CANCELADO") return;
        if (lote.Estado == "CERRADO") throw new InvalidOperationException("No se puede cancelar un lote cerrado");

        lote.Estado = "CANCELADO";
        lote.FechaModificacion = DateTime.UtcNow;
        lote.DeletedAt = DateTime.UtcNow;

        foreach (var tramite in lote.Tramites)
        {
            if (tramite.EstadoLogistico != "ENTREGADO_AL_CLIENTE" && tramite.EstadoLogistico != "CANCELADO")
            {
                tramite.EstadoLogistico = "CANCELADO";
                tramite.FechaEstadoActual = DateTime.UtcNow;
                _db.Eventos.Add(new Evento
                {
                    Id = Guid.NewGuid(),
                    TramiteId = tramite.Id,
                    Tipo = "ACTUALIZACION",
                    Contenido = $"Tramite cancelado porque se cancelo el Lote {lote.FolioLote}",
                    EstadoNuevo = "CANCELADO",
                    FechaEvento = DateTime.UtcNow,
                    CreadoPor = _currentUser.UserId ?? Guid.Empty,
                });
            }
        }

        await _db.SaveChangesAsync();
    }

    public async Task RemoverVehiculoAsync(Guid loteId, Guid tramiteId)
    {
        var lote = await _db.LotesImportacion.Include(l => l.Tramites).FirstOrDefaultAsync(l => l.Id == loteId)
            ?? throw new KeyNotFoundException("Lote no encontrado");

        if (lote.Estado == "CANCELADO" || lote.Estado == "CERRADO")
            throw new InvalidOperationException("No se pueden remover vehiculos de un lote cerrado o cancelado");

        var tramite = lote.Tramites.FirstOrDefault(t => t.Id == tramiteId)
            ?? throw new KeyNotFoundException("Tramite no pertenece a este lote");

        if (tramite.EstadoLogistico != "PENDIENTE_TRAMITE")
            throw new InvalidOperationException("Solo se pueden remover tramites que esten en estado Pendiente");

        _db.Tramites.Remove(tramite);
        lote.FechaModificacion = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    private IQueryable<LoteImportacion> BuildDetailQuery()
    {
        return _db.LotesImportacion
            .Where(l => l.DeletedAt == null)
            .Include(l => l.Cliente)
            .Include(l => l.Aduana)
            .Include(l => l.Tramitador)
            .Include(l => l.Tramites).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(l => l.Tramites).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(l => l.Tramites).ThenInclude(t => t.Pagos)
            .Include(l => l.Tramites).ThenInclude(t => t.Pedimentos)
            .Include(l => l.Tramites).ThenInclude(t => t.GastosHormiga);
    }

    private async Task<Vehiculo> ResolveVehiculoAsync(Guid clienteId, LoteVehiculoItemRequest item)
    {
        if (item.VehiculoId.HasValue)
        {
            var existing = await _db.Vehiculos
                .Include(v => v.Marca)
                .Include(v => v.Modelo)
                .FirstOrDefaultAsync(v => v.Id == item.VehiculoId.Value)
                ?? throw new KeyNotFoundException("Vehiculo no encontrado");

            if (existing.ClienteId != clienteId)
                throw new InvalidOperationException("El vehiculo seleccionado no pertenece al cliente del lote");

            var hasActiveTramite = await _db.Tramites.AnyAsync(t =>
                t.VehiculoId == existing.Id &&
                t.EstadoLogistico != "ENTREGADO_AL_CLIENTE" &&
                t.EstadoLogistico != "CANCELADO");
            if (hasActiveTramite)
                throw new InvalidOperationException($"El vehiculo {existing.Vin} ya tiene un tramite activo");

            return existing;
        }

        var vin = NormalizeVin(item.Vin);
        if (string.IsNullOrWhiteSpace(vin))
            throw new InvalidOperationException("El VIN es obligatorio para crear vehiculos desde un lote");

        var byVin = await _db.Vehiculos
            .Include(v => v.Marca)
            .Include(v => v.Modelo)
            .FirstOrDefaultAsync(v => v.Vin == vin);

        if (byVin != null)
        {
            if (byVin.ClienteId != clienteId)
                throw new InvalidOperationException($"El VIN {vin} ya existe con otro cliente");

            return byVin;
        }

        Guid? modeloId = null;
        if (item.MarcaId.HasValue && !string.IsNullOrWhiteSpace(item.Modelo))
            modeloId = await ResolveModeloIdAsync(item.MarcaId.Value, item.Modelo);

        var vehiculo = new Vehiculo
        {
            Id = Guid.NewGuid(),
            ClienteId = clienteId,
            Vin = vin,
            VinCorto = vin.Length >= 6 ? vin[^6..] : vin,
            MarcaId = item.MarcaId,
            ModeloId = modeloId,
            Anno = item.Anno,
            CilindradaCm3 = item.CilindradaCm3,
            Categoria = NormalizeOptional(item.Categoria),
            Color = NormalizeOptional(item.Color),
            ValorFactura = item.ValorFactura,
            Moneda = string.IsNullOrWhiteSpace(item.Moneda) ? "USD" : item.Moneda.Trim().ToUpperInvariant(),
            FechaRegistro = DateTime.UtcNow,
        };

        _db.Vehiculos.Add(vehiculo);
        return vehiculo;
    }

    private async Task<Guid?> ResolveModeloIdAsync(Guid marcaId, string modeloNombre)
    {
        var modeloName = modeloNombre.Trim();
        var modelo = await _db.Modelos.FirstOrDefaultAsync(m =>
            m.MarcaId == marcaId && m.Nombre.ToUpper() == modeloName.ToUpper());

        if (modelo != null) return modelo.Id;

        modelo = new Modelo
        {
            Id = Guid.NewGuid(),
            MarcaId = marcaId,
            Nombre = modeloName,
        };
        _db.Modelos.Add(modelo);
        return modelo.Id;
    }

    private static Tramite BuildTramite(LoteImportacion lote, LoteVehiculoItemRequest item, Vehiculo vehiculo, string numero, string tipoTramite)
    {
        var descripcion = FirstNotEmpty(
            item.DescripcionMercancia,
            BuildVehiculoResumen(null, item.MarcaTexto, item.Modelo, item.Anno),
            BuildVehiculoResumen(vehiculo, null, null, null),
            vehiculo.Vin);

        return new Tramite
        {
            Id = Guid.NewGuid(),
            LoteId = lote.Id,
            NumeroConsecutivo = numero,
            ClienteId = lote.ClienteId,
            VehiculoId = vehiculo.Id,
            AduanaId = lote.AduanaId,
            TramitadorId = lote.TramitadorId,
            DescripcionMercancia = descripcion,
            TipoTramite = tipoTramite,
            EstadoLogistico = "PENDIENTE_TRAMITE",
            CobroTotal = item.CobroTotal,
            Honorarios = item.Honorarios,
            CargoExpress = tipoTramite == "EXPRESS" ? 500m : 0m,
            Notas = item.Notas,
            FechaEstadoActual = DateTime.UtcNow,
            FechaCreacion = DateTime.UtcNow,
        };
    }

    private static LoteListDto MapList(LoteImportacion lote)
    {
        var tramites = lote.Tramites.ToList();
        var total = tramites.Sum(GetTotalRequerido);
        var pagado = tramites.Sum(GetTotalPagado);

        return new LoteListDto
        {
            Id = lote.Id,
            FolioLote = lote.FolioLote,
            Estado = lote.Estado,
            ClienteId = lote.ClienteId,
            ClienteApodo = lote.Cliente.Apodo,
            ClienteNombre = lote.Cliente.NombreCompleto,
            AduanaNombre = lote.Aduana?.Nombre,
            TramitadorNombre = lote.Tramitador?.Nombre,
            TotalTramites = tramites.Count,
            TramitesCompletados = tramites.Count(t => TerminalStates.Contains(t.EstadoLogistico)),
            TramitesPendientes = tramites.Count(t => !TerminalStates.Contains(t.EstadoLogistico)),
            MontoTotal = total,
            TotalPagado = pagado,
            SaldoPendiente = Math.Max(0m, total - pagado),
            FechaCruce = lote.FechaCruce,
            FechaCreacion = lote.FechaCreacion,
        };
    }

    private static LoteDetailDto MapDetail(LoteImportacion lote)
    {
        var tramites = lote.Tramites.OrderBy(t => t.NumeroConsecutivo).Select(MapTramite).ToList();

        return new LoteDetailDto
        {
            Id = lote.Id,
            FolioLote = lote.FolioLote,
            Estado = lote.Estado,
            ClienteId = lote.ClienteId,
            ClienteApodo = lote.Cliente.Apodo,
            ClienteNombre = lote.Cliente.NombreCompleto,
            AduanaId = lote.AduanaId,
            AduanaNombre = lote.Aduana?.Nombre,
            TramitadorId = lote.TramitadorId,
            TramitadorNombre = lote.Tramitador?.Nombre,
            TipoTramite = lote.TipoTramite,
            MontoTotal = tramites.Sum(t => t.TotalPagado + t.SaldoPendiente),
            TotalPagado = tramites.Sum(t => t.TotalPagado),
            SaldoPendiente = tramites.Sum(t => t.SaldoPendiente),
            FechaCruce = lote.FechaCruce,
            Notas = lote.Notas,
            FechaCreacion = lote.FechaCreacion,
            FechaModificacion = lote.FechaModificacion,
            Tramites = tramites,
        };
    }

    private static LoteTramiteItemDto MapTramite(Tramite tramite)
    {
        var total = GetTotalRequerido(tramite);
        var pagado = GetTotalPagado(tramite);

        return new LoteTramiteItemDto
        {
            Id = tramite.Id,
            NumeroConsecutivo = tramite.NumeroConsecutivo,
            VehiculoId = tramite.VehiculoId,
            VehiculoVin = tramite.Vehiculo?.Vin,
            VehiculoVinCorto = tramite.Vehiculo?.VinCorto,
            VehiculoMarcaModelo = BuildVehiculoResumen(tramite.Vehiculo, null, null, null),
            DescripcionMercancia = tramite.DescripcionMercancia,
            EstadoLogistico = tramite.EstadoLogistico,
            CobroTotal = tramite.CobroTotal,
            CargoExpress = tramite.CargoExpress,
            TotalPagado = pagado,
            SaldoPendiente = Math.Max(0m, total - pagado),
            FechaCreacion = tramite.FechaCreacion,
        };
    }

    private static decimal GetTotalRequerido(Tramite tramite)
    {
        return tramite.CobroTotal
            + tramite.CargoExpress
            + tramite.Pedimentos.Sum(p => p.CobroAdicional)
            + tramite.GastosHormiga.Where(g => g.SeCargaAlCliente && g.DeletedAt == null).Sum(ConvertGastoToMxn);
    }

    private static decimal GetTotalPagado(Tramite tramite)
    {
        return tramite.Pagos.Where(p => p.Verificado && p.DeletedAt == null).Sum(ConvertPagoToMxn);
    }

    private static decimal ConvertPagoToMxn(Pago pago)
    {
        return pago.Moneda == "USD" ? pago.Monto * (pago.TipoCambio ?? 0m) : pago.Monto;
    }

    private static decimal ConvertGastoToMxn(GastoHormiga gasto)
    {
        return gasto.Moneda == "USD" ? gasto.Monto * (gasto.GastoUsd ?? 0m) : gasto.Monto;
    }

    private async Task<string> GenerateLoteFolioAsync()
    {
        var prefix = $"LOT-{DateTime.Today:yyyyMM}-";
        var count = await _db.LotesImportacion.CountAsync(l => l.FolioLote.StartsWith(prefix));
        return $"{prefix}{count + 1:0000}";
    }

    private async Task<int> GetNextTramiteNumberAsync()
    {
        var maxNum = await _db.Tramites.MaxAsync(t => (string?)t.NumeroConsecutivo) ?? "RR-0000";
        return ExtractTrailingNumber(maxNum) + 1;
    }

    private static string BuildTramiteNumero(int number) => $"RR-{number:D4}";

    private static int ExtractTrailingNumber(string value)
    {
        var digits = new string(value.Reverse().TakeWhile(char.IsDigit).Reverse().ToArray());
        return int.TryParse(digits, out var number) ? number : 0;
    }

    private static void ValidateCreateRequest(CreateLoteRequest request)
    {
        if (request.ClienteId == Guid.Empty)
            throw new InvalidOperationException("El cliente es obligatorio");

        if (request.Vehiculos.Count == 0)
            throw new InvalidOperationException("El lote debe incluir al menos un vehiculo");

        foreach (var item in request.Vehiculos)
            ValidateItem(item);
    }

    private static void ValidateItem(LoteVehiculoItemRequest item)
    {
        if (!item.VehiculoId.HasValue && string.IsNullOrWhiteSpace(item.Vin))
            throw new InvalidOperationException("Cada vehiculo debe tener VIN o seleccionar un vehiculo existente");

        if (item.CobroTotal < 0)
            throw new InvalidOperationException("El cobro total no puede ser negativo");

        if (item.Honorarios < 0)
            throw new InvalidOperationException("Los honorarios no pueden ser negativos");
    }

    private static void ValidateDuplicateVins(IEnumerable<LoteVehiculoItemRequest> vehiculos)
    {
        var duplicates = vehiculos
            .Select(v => NormalizeVin(v.Vin))
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .GroupBy(v => v)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicates.Count > 0)
            throw new InvalidOperationException($"VIN duplicado dentro del lote: {string.Join(", ", duplicates)}");
    }

    private static string NormalizeTipoTramite(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "NORMAL" : value.Trim().ToUpperInvariant();
        return normalized.Length > 30 ? normalized[..30] : normalized;
    }

    private static string NormalizeEstado(string value)
    {
        var normalized = value.Trim().ToUpperInvariant();
        var allowed = new HashSet<string> { "BORRADOR", "EN_PROGRESO", "PARCIALMENTE_CERRADO", "CERRADO", "CANCELADO" };
        return allowed.Contains(normalized) ? normalized : throw new InvalidOperationException("Estado de lote no valido");
    }

    private static string NormalizeVin(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string BuildVehiculoResumen(Vehiculo? vehiculo, string? marcaTexto, string? modelo, int? anno)
    {
        if (vehiculo != null)
        {
            return string.Join(" ", new[]
            {
                vehiculo.Marca?.Nombre,
                vehiculo.Modelo?.Nombre,
                vehiculo.Anno?.ToString(),
            }.Where(x => !string.IsNullOrWhiteSpace(x)));
        }

        return string.Join(" ", new[]
        {
            marcaTexto,
            modelo,
            anno?.ToString(),
        }.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static string FirstNotEmpty(params string?[] values)
    {
        return values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim() ?? "Vehiculo sin descripcion";
    }
}
