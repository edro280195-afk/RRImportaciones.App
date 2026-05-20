using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.Entregas;
using RR.Application.DTOs.Tramites;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class TramiteService : ITramiteService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ITramiteStateService _stateService;
    private readonly IRealtimeNotifier _realtime;

    public TramiteService(AppDbContext db, ICurrentUserService currentUser, ITramiteStateService stateService, IRealtimeNotifier realtime)
    {
        _db = db;
        _currentUser = currentUser;
        _stateService = stateService;
        _realtime = realtime;
    }

    public async Task<PagedResult<TramiteListDto>> GetListAsync(string? search, string? estado, Guid? tramitadorId, Guid? clienteId, Guid? aduanaId, DateTime? fechaDesde, DateTime? fechaHasta, string? orderBy, string? orderDir, int page, int pageSize)
    {
        var query = _db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo)
            .Include(t => t.Aduana)
            .Include(t => t.Tramitador)
            .Include(t => t.Pagos)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(t =>
                t.NumeroConsecutivo.ToLower().Contains(term) ||
                (t.Cliente != null && t.Cliente.Apodo.ToLower().Contains(term)) ||
                (t.Vehiculo != null && t.Vehiculo.VinCorto != null && t.Vehiculo.VinCorto.ToLower().Contains(term)) ||
                t.Pedimentos.Any(p => p.NumeroPedimento.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(estado))
        {
            if (estado is "VERDE_ENTREGADO" or "ENTREGADO_AL_CLIENTE")
                query = query.Where(t => t.EstadoLogistico == "VERDE_ENTREGADO" || t.EstadoLogistico == "ENTREGADO_AL_CLIENTE");
            else
                query = query.Where(t => t.EstadoLogistico == estado);
        }

        if (tramitadorId.HasValue)
            query = query.Where(t => t.TramitadorId == tramitadorId);

        if (clienteId.HasValue)
            query = query.Where(t => t.ClienteId == clienteId);

        if (aduanaId.HasValue)
            query = query.Where(t => t.AduanaId == aduanaId);

        if (fechaDesde.HasValue)
            query = query.Where(t => t.FechaCreacion >= fechaDesde.Value);

        if (fechaHasta.HasValue)
            query = query.Where(t => t.FechaCreacion <= fechaHasta.Value);

        query = (orderBy?.ToLower()) switch
        {
            "numero" => string.Equals(orderDir, "desc", StringComparison.OrdinalIgnoreCase)
                ? query.OrderByDescending(t => t.NumeroConsecutivo) : query.OrderBy(t => t.NumeroConsecutivo),
            "monto" => string.Equals(orderDir, "desc", StringComparison.OrdinalIgnoreCase)
                ? query.OrderByDescending(t => t.CobroTotal) : query.OrderBy(t => t.CobroTotal),
            _ => query.OrderByDescending(t => t.FechaCreacion),
        };

        var total = await query.CountAsync();

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TramiteListDto
            {
                Id = t.Id,
                NumeroConsecutivo = t.NumeroConsecutivo,
                FechaCreacion = t.FechaCreacion,
                ClienteApodo = t.Cliente != null ? t.Cliente.Apodo : null,
                ClienteNombre = t.Cliente != null ? t.Cliente.NombreCompleto : null,
                VehiculoVinCorto = t.Vehiculo != null ? t.Vehiculo.VinCorto : null,
                VehiculoMarcaModelo = t.Vehiculo != null
                    ? (t.Vehiculo.Marca != null ? t.Vehiculo.Marca.Nombre + " " : "") + (t.Vehiculo.Modelo != null ? t.Vehiculo.Modelo.Nombre : "")
                    : t.DescripcionMercancia,
                AduanaNombre = t.Aduana != null ? t.Aduana.Nombre : null,
                TramitadorNombre = t.Tramitador != null ? t.Tramitador.Nombre : null,
                EstadoLogistico = t.EstadoLogistico,
                TipoTramite = t.TipoTramite,
                CobroTotal = t.CobroTotal,
                CargoExpress = t.CargoExpress,
                TotalPagado = t.Pagos.Where(p => p.Verificado).Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto),
                SaldoPendiente = t.CobroTotal + t.CargoExpress
                    + t.Pedimentos.Sum(p => p.CobroAdicional)
                    + t.GastosHormiga.Where(g => g.SeCargaAlCliente).Sum(g => g.Moneda == "USD" ? g.Monto * (g.GastoUsd ?? 0m) : g.Monto)
                    - t.Pagos.Where(p => p.Verificado).Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto),
                FechaEstadoActual = t.FechaEstadoActual,
                DiasEnEstado = t.FechaEstadoActual.HasValue
                    ? (int)(DateTime.UtcNow - t.FechaEstadoActual.Value).TotalDays
                    : 0,
            })
            .ToListAsync();

        return new PagedResult<TramiteListDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<TramiteDetailDto?> GetByIdAsync(Guid id)
    {
        return await _db.Tramites
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v.Modelo)
            .Include(t => t.Aduana)
            .Include(t => t.Tramitador)
            .Include(t => t.CotizacionOrigen)
            .Include(t => t.Eventos)
            .Include(t => t.Pedimentos)
            .Include(t => t.Pagos)
            .Include(t => t.GastosHormiga).ThenInclude(g => g.TipoGasto)
            .Include(t => t.Entregas).ThenInclude(e => e.ResponsableCampo)
            .Include(t => t.Entregas).ThenInclude(e => e.RecibidoPorPartner)
            .Include(t => t.Documentos)
            .Include(t => t.TareasCampo).ThenInclude(tc => tc.PersonalCampo)
            .Include(t => t.TareasCampo).ThenInclude(tc => tc.UsuarioCampo)
            .Where(t => t.Id == id)
            .Select(t => new TramiteDetailDto
            {
                Id = t.Id,
                NumeroConsecutivo = t.NumeroConsecutivo,
                ClienteId = t.ClienteId,
                ClienteApodo = t.Cliente != null ? t.Cliente.Apodo : null,
                ClienteNombre = t.Cliente != null ? t.Cliente.NombreCompleto : null,
                VehiculoId = t.VehiculoId,
                VehiculoVin = t.Vehiculo != null ? t.Vehiculo.Vin : null,
                VehiculoVinCorto = t.Vehiculo != null ? t.Vehiculo.VinCorto : null,
                VehiculoMarca = t.Vehiculo != null && t.Vehiculo.Marca != null ? t.Vehiculo.Marca.Nombre : null,
                VehiculoModelo = t.Vehiculo != null && t.Vehiculo.Modelo != null ? t.Vehiculo.Modelo.Nombre : null,
                VehiculoAnno = t.Vehiculo != null ? t.Vehiculo.Anno : null,
                DescripcionMercancia = t.DescripcionMercancia,
                AduanaId = t.AduanaId,
                AduanaNombre = t.Aduana != null ? t.Aduana.Nombre : null,
                TramitadorId = t.TramitadorId,
                TramitadorNombre = t.Tramitador != null ? t.Tramitador.Nombre : null,
                CotizacionOrigenId = t.CotizacionOrigenId,
                CotizacionOrigenFolio = t.CotizacionOrigen != null ? t.CotizacionOrigen.Folio : null,
                CotizacionFecha = t.CotizacionOrigen != null ? t.CotizacionOrigen.FechaCreacion : null,
                TipoTramite = t.TipoTramite,
                EstadoLogistico = t.EstadoLogistico,
                CobroTotal = t.CobroTotal,
                Honorarios = t.Honorarios,
                CargoExpress = t.CargoExpress,
                TotalPagado = t.Pagos.Where(p => p.Verificado).Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto),
                SaldoPendiente = t.CobroTotal + t.CargoExpress
                    + t.Pedimentos.Sum(p => p.CobroAdicional)
                    + t.GastosHormiga.Where(g => g.SeCargaAlCliente).Sum(g => g.Moneda == "USD" ? g.Monto * (g.GastoUsd ?? 0m) : g.Monto)
                    - t.Pagos.Where(p => p.Verificado).Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto),
                Notas = t.Notas,
                FechaInicio = t.FechaInicio,
                FechaEstadoActual = t.FechaEstadoActual,
                DiasEnEstado = t.FechaEstadoActual.HasValue
                    ? (int)(DateTime.UtcNow - t.FechaEstadoActual.Value).TotalDays : 0,
                FechaCreacion = t.FechaCreacion,
                FechaModificacion = t.FechaModificacion,
                Eventos = t.Eventos.OrderByDescending(e => e.FechaEvento).Select(e => new TramiteEventoDto
                {
                    Id = e.Id,
                    Tipo = e.Tipo,
                    EstadoAnterior = e.EstadoAnterior,
                    EstadoNuevo = e.EstadoNuevo,
                    Contenido = e.Contenido,
                    FotoUrl = e.FotoUrl,
                    FechaEvento = e.FechaEvento,
                }).ToList(),
                Pedimentos = t.Pedimentos.Select(p => new TramitePedimentoDto
                {
                    Id = p.Id,
                    NumeroPedimento = p.NumeroPedimento,
                    Tipo = p.Tipo,
                    FechaEntrada = p.FechaEntrada,
                    Patente = p.Patente,
                    Igi = p.Igi,
                    Dta = p.Dta,
                    Iva = p.Iva,
                    TotalContribuciones = p.TotalContribuciones,
                    EstadoLogistico = p.EstadoLogistico,
                    MotivoRectificacion = p.MotivoRectificacion,
                    ResponsableError = p.ResponsableError,
                    CobroAdicional = p.CobroAdicional,
                }).ToList(),
                Pagos = t.Pagos.Select(p => new TramitePagoDto
                {
                    Id = p.Id,
                    Monto = p.Monto,
                    Moneda = p.Moneda,
                    TipoCambio = p.TipoCambio,
                    Metodo = p.Metodo,
                    Banco = p.Banco,
                    Referencia = p.Referencia,
                    FolioRecibo = p.FolioRecibo,
                    ReciboPagoUrl = p.ReciboPagoUrl,
                    FechaPago = p.FechaPago,
                    Verificado = p.Verificado,
                }).ToList(),
                GastosHormiga = t.GastosHormiga.Select(g => new TramiteGastoDto
                {
                    Id = g.Id,
                    TipoGasto = g.TipoGasto != null ? g.TipoGasto.Nombre : "",
                    Concepto = g.Concepto,
                    Monto = g.Monto,
                    Moneda = g.Moneda,
                    SeCargaAlCliente = g.SeCargaAlCliente,
                    ComprobanteUrl = g.ComprobanteUrl,
                    FechaGasto = g.FechaGasto,
                }).ToList(),
                Entregas = t.Entregas.Select(e => new TramiteEntregaDto
                {
                    Id = e.Id,
                    ResponsableCampoNombre = e.ResponsableCampo != null ? e.ResponsableCampo.Nombre : null,
                    RecibidoPorPartnerNombre = e.RecibidoPorPartner != null ? e.RecibidoPorPartner.Nombre : null,
                    Descripcion = e.Descripcion,
                    UbicacionEntrega = e.UbicacionEntrega,
                    DocumentosEntregados = e.DocumentosEntregados,
                    NombreRecibe = e.NombreRecibe,
                    FotoEvidenciaUrl = e.FotoEvidenciaUrl,
                    FirmaBase64 = e.FirmaBase64,
                    FechaEntrega = e.FechaEntrega,
                }).ToList(),
                Documentos = t.Documentos.OrderBy(d => d.TipoDocumento).Select(d => new TramiteDocumentoDto
                {
                    Id = d.Id,
                    TramiteId = d.TramiteId,
                    TipoDocumento = d.TipoDocumento,
                    Nombre = d.Nombre,
                    EstadoLogistico = d.EstadoLogistico,
                    EsRequerido = d.EsRequerido,
                    ArchivoUrl = d.ArchivoUrl,
                    Notas = d.Notas,
                    FechaRecibido = d.FechaRecibido,
                    FechaValidado = d.FechaValidado,
                }).ToList(),
                TareasCampo = t.TareasCampo.OrderByDescending(tc => tc.FechaCreacion).Select(tc => new TramiteTareaCampoDto
                {
                    Id = tc.Id,
                    Tipo = tc.Tipo,
                    EstadoLogistico = tc.EstadoLogistico,
                    PersonalCampoNombre = tc.UsuarioCampo != null
                        ? (tc.UsuarioCampo.Nombre + " " + (tc.UsuarioCampo.Apellidos ?? "")).Trim()
                        : (tc.PersonalCampo != null ? tc.PersonalCampo.Nombre : null),
                    Ubicacion = tc.Ubicacion,
                    VinConfirmado = tc.VinConfirmado,
                    FotosUrls = tc.FotosUrls,
                    Incidencia = tc.Incidencia,
                    FechaCreacion = tc.FechaCreacion,
                    FechaTomada = tc.FechaTomada,
                    FechaCompletada = tc.FechaCompletada,
                }).ToList(),
            })
            .FirstOrDefaultAsync();
    }

    public async Task<TramiteDetailDto> CreateAsync(CreateTramiteRequest request)
    {
        var nuevoNumero = await GenerarNumeroConsecutivoAsync();

        var tramite = new Tramite
        {
            Id = Guid.NewGuid(),
            NumeroConsecutivo = nuevoNumero,
            ClienteId = request.ClienteId,
            VehiculoId = request.VehiculoId,
            DescripcionMercancia = request.DescripcionMercancia,
            AduanaId = request.AduanaId,
            TramitadorId = request.TramitadorId,
            TipoTramite = request.TipoTramite,
            EstadoLogistico = "PENDIENTE_TRAMITE",
            CobroTotal = request.CobroTotal,
            Honorarios = request.Honorarios,
            CargoExpress = request.TipoTramite == "EXPRESS" ? 500m : 0m,
            Notas = request.Notas,
            FechaEstadoActual = DateTime.UtcNow,
            FechaCreacion = DateTime.UtcNow,
        };

        _db.Tramites.Add(tramite);

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            Tipo = "CREACION",
            Contenido = "Trámite creado",
            EstadoNuevo = "PENDIENTE_TRAMITE",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();

        return (await GetByIdAsync(tramite.Id))!;
    }

    public async Task<TramiteDetailDto> UpdateAsync(Guid id, UpdateTramiteRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(id)
            ?? throw new KeyNotFoundException($"Trámite {id} no encontrado");

        if (request.AduanaId.HasValue) tramite.AduanaId = request.AduanaId;
        if (request.TramitadorId.HasValue) tramite.TramitadorId = request.TramitadorId;
        if (request.Notas != null) tramite.Notas = request.Notas;

        tramite.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return (await GetByIdAsync(id))!;
    }

    public async Task<TramiteEventoDto?> CambiarEstadoAsync(Guid id, CambiarEstadoRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(id)
            ?? throw new KeyNotFoundException($"Trámite {id} no encontrado");

        if (!_stateService.CanTransitionTo(tramite.EstadoLogistico, request.NuevoEstado, out var razon))
            throw new InvalidOperationException(razon);

        if (request.NuevoEstado == "ENTREGADO_AL_CLIENTE")
        {
            var tieneEntrega = await _db.Entregas.AnyAsync(e => e.TramiteId == id);
            if (!tieneEntrega)
                throw new InvalidOperationException("No se puede marcar como ENTREGADO_AL_CLIENTE sin al menos una entrega registrada");
        }

        var estadoAnterior = tramite.EstadoLogistico;
        tramite.EstadoLogistico = request.NuevoEstado;
        tramite.FechaEstadoActual = DateTime.UtcNow;
        tramite.FechaModificacion = DateTime.UtcNow;

        if (tramite.VehiculoId.HasValue)
        {
            var vehiculo = await _db.Vehiculos.FindAsync(tramite.VehiculoId.Value);
            if (vehiculo != null)
            {
                if (request.NuevoEstado == "RECEPCION_EN_YARDA")
                {
                    if (vehiculo.FechaIngresoPatio == null)
                    {
                        vehiculo.FechaIngresoPatio = DateTime.UtcNow;
                    }
                    if (!string.IsNullOrWhiteSpace(request.Notas) && !request.Notas.StartsWith("Cambio de estado", StringComparison.OrdinalIgnoreCase))
                    {
                        vehiculo.UbicacionActual = request.Notas;
                    }
                }
                else if (request.NuevoEstado == "ENTREGADO_AL_CLIENTE")
                {
                    vehiculo.UbicacionActual = null;
                }
            }
        }

        var evento = new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = id,
            Tipo = "CAMBIO_ESTADO",
            EstadoAnterior = estadoAnterior,
            EstadoNuevo = request.NuevoEstado,
            Contenido = request.Notas ?? $"Cambio de estado: {estadoAnterior} → {request.NuevoEstado}",
            FechaEvento = request.FechaEvento ?? DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };
        _db.Eventos.Add(evento);

        await _db.SaveChangesAsync();

        return new TramiteEventoDto
        {
            Id = evento.Id,
            Tipo = evento.Tipo,
            EstadoAnterior = evento.EstadoAnterior,
            EstadoNuevo = evento.EstadoNuevo,
            Contenido = evento.Contenido,
            FechaEvento = evento.FechaEvento,
        };
    }

    public async Task<TramitePedimentoDto> AgregarPedimentoAsync(Guid tramiteId, AgregarPedimentoRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(tramiteId)
            ?? throw new KeyNotFoundException($"Trámite {tramiteId} no encontrado");

        var tienePedimento = await _db.Pedimentos.AnyAsync(p => p.TramiteId == tramiteId);
        if (tienePedimento)
            throw new InvalidOperationException("Este trámite ya tiene pedimento registrado");

        var pedimento = new Pedimento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramiteId,
            NumeroPedimento = request.NumeroPedimento,
            Tipo = request.Tipo,
            FechaEntrada = request.FechaEntrada.HasValue ? DateTime.SpecifyKind(request.FechaEntrada.Value, DateTimeKind.Utc) : null,
            FechaPago = request.FechaPago.HasValue ? DateTime.SpecifyKind(request.FechaPago.Value, DateTimeKind.Utc) : null,
            MotivoRectificacion = request.MotivoRectificacion,
            ResponsableError = request.ResponsableError,
            CobroAdicional = request.CobroAdicional,
            FechaCreacion = DateTime.UtcNow,
        };
        _db.Pedimentos.Add(pedimento);

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramiteId,
            Tipo = "PEDIMENTO",
            Contenido = $"Pedimento {request.Tipo} agregado: {request.NumeroPedimento}",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();
        await _realtime.TramiteActualizadoAsync(tramiteId, "PEDIMENTO_AGREGADO");

        return new TramitePedimentoDto
        {
            Id = pedimento.Id,
            NumeroPedimento = pedimento.NumeroPedimento,
            Tipo = pedimento.Tipo,
            FechaEntrada = pedimento.FechaEntrada,
            MotivoRectificacion = pedimento.MotivoRectificacion,
            ResponsableError = pedimento.ResponsableError,
            CobroAdicional = pedimento.CobroAdicional,
        };
    }

    public async Task<TramiteEntregaDto> AgregarEntregaAsync(Guid tramiteId, CreateEntregaRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(tramiteId)
            ?? throw new KeyNotFoundException($"Trámite {tramiteId} no encontrado");

        var tieneEntrega = await _db.Entregas.AnyAsync(e => e.TramiteId == tramiteId);
        if (tieneEntrega)
            throw new InvalidOperationException("Este trámite ya tiene entrega registrada");

        var entrega = new Entrega
        {
            Id = Guid.NewGuid(),
            TramiteId = tramiteId,
            ResponsableCampoId = request.ResponsableCampoId,
            RecibidoPorPartnerId = request.RecibidoPorPartnerId,
            Descripcion = request.Descripcion,
            UbicacionEntrega = request.UbicacionEntrega,
            DocumentosEntregados = request.DocumentosEntregados ?? [],
            NombreRecibe = request.NombreRecibe,
            FotoEvidenciaUrl = string.IsNullOrWhiteSpace(request.FotoEvidenciaUrl) ? null : request.FotoEvidenciaUrl,
            FirmaBase64 = string.IsNullOrWhiteSpace(request.FirmaBase64) ? null : request.FirmaBase64,
            FechaEntrega = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };
        _db.Entregas.Add(entrega);

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramiteId,
            Tipo = "ENTREGA",
            Contenido = $"Vehículo entregado. {(string.IsNullOrWhiteSpace(request.Descripcion) ? "" : request.Descripcion + " ")}Ubicación: {request.UbicacionEntrega ?? "No especificada"}",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();
        await _realtime.TramiteActualizadoAsync(tramiteId, "ENTREGA_REGISTRADA");

        return new TramiteEntregaDto
        {
            Id = entrega.Id,
            ResponsableCampoNombre = request.ResponsableCampoId.HasValue ? null : null,
            RecibidoPorPartnerNombre = request.RecibidoPorPartnerId.HasValue ? null : null,
            Descripcion = entrega.Descripcion,
            UbicacionEntrega = entrega.UbicacionEntrega,
            DocumentosEntregados = entrega.DocumentosEntregados,
            NombreRecibe = entrega.NombreRecibe,
            FotoEvidenciaUrl = entrega.FotoEvidenciaUrl,
            FirmaBase64 = entrega.FirmaBase64,
            FechaEntrega = entrega.FechaEntrega,
        };
    }

    public async Task<TramiteEventoDto> AgregarNotaAsync(Guid tramiteId, AgregarNotaRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(tramiteId)
            ?? throw new KeyNotFoundException($"Trámite {tramiteId} no encontrado");

        var evento = new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramiteId,
            Tipo = "NOTA",
            Contenido = request.Contenido,
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };
        _db.Eventos.Add(evento);
        await _db.SaveChangesAsync();

        return new TramiteEventoDto
        {
            Id = evento.Id,
            Tipo = evento.Tipo,
            Contenido = evento.Contenido,
            FechaEvento = evento.FechaEvento,
        };
    }

    public async Task<TramiteDocumentoDto> GuardarDocumentoAsync(Guid tramiteId, GuardarDocumentoTramiteRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(tramiteId)
            ?? throw new KeyNotFoundException($"Trámite {tramiteId} no encontrado");

        var tipo = NormalizeDocumento(request.TipoDocumento);
        var documento = await _db.TramitesDocumentos
            .FirstOrDefaultAsync(d => d.TramiteId == tramiteId && d.TipoDocumento == tipo);

        if (documento == null)
        {
            documento = new TramiteDocumento
            {
                Id = Guid.NewGuid(),
                TramiteId = tramiteId,
                TipoDocumento = tipo,
                Nombre = request.Nombre ?? NombreDocumento(tipo),
                FechaCreacion = DateTime.UtcNow,
            };
            _db.TramitesDocumentos.Add(documento);
        }

        documento.Nombre = request.Nombre ?? documento.Nombre;
        documento.EstadoLogistico = request.EstadoLogistico;
        documento.EsRequerido = request.EsRequerido;
        documento.ArchivoUrl = request.ArchivoUrl;
        documento.Notas = request.Notas;

        if (request.EstadoLogistico is "RECIBIDO" or "VALIDADO")
            documento.FechaRecibido ??= DateTime.UtcNow;

        if (request.EstadoLogistico == "VALIDADO")
        {
            documento.FechaValidado = DateTime.UtcNow;
            documento.ValidadoPor = _currentUser.UserId;
        }

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            Tipo = "DOCUMENTO",
            Contenido = $"Documento {documento.Nombre}: {documento.EstadoLogistico}",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();

        return new TramiteDocumentoDto
        {
            Id = documento.Id,
            TramiteId = documento.TramiteId,
            TipoDocumento = documento.TipoDocumento,
            Nombre = documento.Nombre,
            EstadoLogistico = documento.EstadoLogistico,
            EsRequerido = documento.EsRequerido,
            ArchivoUrl = documento.ArchivoUrl,
            Notas = documento.Notas,
            FechaRecibido = documento.FechaRecibido,
            FechaValidado = documento.FechaValidado,
        };
    }

    public async Task<TramiteDashboardDto> GetDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var inicioMes = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var activos = await _db.Tramites
            .Where(t => t.EstadoLogistico != "ENTREGADO_AL_CLIENTE" && t.EstadoLogistico != "CANCELADO")
            .CountAsync();

        var verdesEsteMes = await _db.Tramites
            .Where(t => t.EstadoLogistico == "ENTREGADO_AL_CLIENTE" && t.FechaEstadoActual >= inicioMes)
            .CountAsync();

        var amarillos = await _db.Tramites
            .Where(t => t.EstadoLogistico == "AMARILLO_PENDIENTE_PAGO")
            .CountAsync();

        var cobradoMes = await _db.Pagos
            .Where(p => p.Verificado && p.FechaPago >= inicioMes)
            .SumAsync(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto);

        var porCobrar = await _db.Tramites
            .Where(t => t.EstadoLogistico != "ENTREGADO_AL_CLIENTE" && t.EstadoLogistico != "CANCELADO")
            .Select(t => t.CobroTotal + t.CargoExpress
                + t.Pedimentos.Sum(p => p.CobroAdicional)
                + t.GastosHormiga.Where(g => g.SeCargaAlCliente).Sum(g => g.Moneda == "USD" ? g.Monto * (g.GastoUsd ?? 0m) : g.Monto)
                - t.Pagos.Where(p => p.Verificado).Sum(p => p.Moneda == "USD" ? p.Monto * (p.TipoCambio ?? 0m) : p.Monto))
            .SumAsync();

        var enPatio = await _db.Vehiculos
            .Where(v => v.DeletedAt == null && v.FechaIngresoPatio != null)
            .CountAsync();

        return new TramiteDashboardDto
        {
            Activos = activos,
            VerdesEsteMes = verdesEsteMes,
            AmarillosPendientePago = amarillos,
            CobradoMes = cobradoMes,
            PorCobrar = porCobrar,
            VehiculosEnPatio = enPatio,
        };
    }

    private async Task<string> GenerarNumeroConsecutivoAsync()
    {
        var maxNum = await _db.Tramites
            .MaxAsync(t => (string?)t.NumeroConsecutivo) ?? "RR-0000";

        if (int.TryParse(maxNum[3..], out var lastNum))
            return $"RR-{(lastNum + 1):D4}";

        return "RR-0001";
    }

    private static string NormalizeDocumento(string value) => value.Trim().ToUpperInvariant();

    private static string NombreDocumento(string tipo) => tipo switch
    {
        "FACTURA" => "Factura",
        "IDENTIFICACION_INE" => "Identificación INE",
        "HOJA_NOTARIADA" => "Hoja notariada por el estado",
        "IDENTIFICACION_AMERICANA" => "Identificación americana del vendedor",
        "BAJA" => "Baja",
        "TITULO" => "Título",
        "PEDIMENTO_PDF" => "Pedimento PDF",
        _ => tipo.Replace('_', ' '),
    };
}
