using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Entregas;
using RR.Application.DTOs.Tramites;
using RR.Application.Interfaces;
using RR.Application.Notificaciones;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using System.Text.RegularExpressions;

namespace RR.Infrastructure.Services;

public class EntregaTaskService : IEntregaTaskService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IRealtimeNotifier _realtime;
    private readonly INotificacionEventoService _notificaciones;
    private readonly ITramiteService _tramiteService;

    public EntregaTaskService(
        AppDbContext db,
        ICurrentUserService currentUser,
        IRealtimeNotifier realtime,
        INotificacionEventoService notificaciones,
        ITramiteService tramiteService)
    {
        _db = db;
        _currentUser = currentUser;
        _realtime = realtime;
        _notificaciones = notificaciones;
        _tramiteService = tramiteService;
    }

    public async Task<List<TareaEntregaDto>> GetTareasAsync(Guid? choferUserId = null, string? estado = null)
    {
        var query = _db.TareasEntrega
            .Include(t => t.Tramite).ThenInclude(t => t.Cliente)
            .Include(t => t.Tramite).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Marca)
            .Include(t => t.Tramite).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Modelo)
            .Include(t => t.Chofer)
            .AsQueryable();

        if (choferUserId.HasValue)
            query = query.Where(t => t.ChoferUserId == choferUserId);

        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(t => t.Estado == estado);

        var tareas = await query
            .OrderBy(t => t.Estado == "PENDIENTE" ? 0 : t.Estado == "EN_CAMINO" ? 1 : 2)
            .ThenByDescending(t => t.FechaCreacion)
            .Take(100)
            .ToListAsync();

        return tareas.Select(Map).ToList();
    }

    public async Task<TareaEntregaDto?> GetByIdAsync(Guid id) => await GetById(id);

    public async Task<TareaEntregaDto> CrearAsync(CrearTareaEntregaRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(request.TramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");

        var tieneEntregaActiva = await _db.TareasEntrega
            .AnyAsync(t => t.TramiteId == request.TramiteId && t.Estado != "ENTREGADO" && t.Estado != "INCIDENCIA");

        if (tieneEntregaActiva)
            throw new InvalidOperationException("Este trámite ya tiene una tarea de entrega activa");

        var tarea = new TareaEntrega
        {
            Id = Guid.NewGuid(),
            TramiteId = request.TramiteId,
            ChoferUserId = request.ChoferUserId,
            Estado = "PENDIENTE",
            UbicacionEntrega = request.UbicacionEntrega,
            NotasChofer = request.NotasChofer,
            FechaCreacion = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };

        _db.TareasEntrega.Add(tarea);

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = request.TramiteId,
            Tipo = "ENTREGA_ASIGNADA",
            Contenido = "Tarea de entrega creada y asignada a chofer.",
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        await _db.SaveChangesAsync();
        await _realtime.TramiteActualizadoAsync(request.TramiteId, "ENTREGA_CREADA");

        var dto = (await GetById(tarea.Id))!;

        // Si ya trae chofer, le llega directo al suyo; si no, lo ve la yarda.
        await _notificaciones.EmitirAsync(tarea.ChoferUserId.HasValue
            ? CatalogoNotificaciones.TareaEntregaAsignada(
                tarea.ChoferUserId.Value, tarea.Id, dto.NumeroConsecutivo,
                dto.VehiculoResumen, tarea.UbicacionEntrega)
            : CatalogoNotificaciones.TareaCampoCreada(
                tarea.Id, dto.NumeroConsecutivo, dto.VehiculoResumen, tarea.UbicacionEntrega));

        return dto;
    }

    public async Task<TareaEntregaDto> TomarAsync(Guid id)
    {
        var tarea = await _db.TareasEntrega.FindAsync(id)
            ?? throw new KeyNotFoundException("Tarea de entrega no encontrada");

        var userId = _currentUser.UserId
            ?? throw new InvalidOperationException("No se pudo identificar al chofer");

        if (tarea.Estado != "PENDIENTE")
            throw new InvalidOperationException("Solo se pueden tomar tareas pendientes");

        tarea.Estado = "EN_CAMINO";
        tarea.ChoferUserId ??= userId;
        tarea.FechaTomada = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _realtime.TramiteActualizadoAsync(tarea.TramiteId, "ENTREGA_EN_CAMINO");

        return (await GetById(id))!;
    }

    public async Task<TareaEntregaDto> RegistrarEntregaAsync(Guid id, RegistrarEntregaRequest request)
    {
        var tarea = await _db.TareasEntrega
            .Include(t => t.Tramite)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Tarea de entrega no encontrada");

        tarea.FotosUrls = request.FotosUrls ?? [];
        tarea.UbicacionEntrega = request.UbicacionEntrega ?? tarea.UbicacionEntrega;
        tarea.NombreRecibe = request.NombreRecibe;
        tarea.FirmaBase64 = request.FirmaBase64;
        tarea.NotasChofer = request.NotasChofer;
        tarea.Incidencia = request.Incidencia;
        tarea.Estado = string.IsNullOrWhiteSpace(request.Incidencia) ? "ENTREGADO" : "INCIDENCIA";
        tarea.FechaEntregado = DateTime.UtcNow;

        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tarea.TramiteId,
            Tipo = "ENTREGA_COMPLETADA",
            Contenido = tarea.Estado == "ENTREGADO"
                ? $"Vehículo entregado a {request.NombreRecibe ?? "destinatario"}. Ubicación: {request.UbicacionEntrega}"
                : $"Incidencia en entrega: {request.Incidencia}",
            FotoUrl = request.FotosUrls?.FirstOrDefault(),
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        if (tarea.Estado == "ENTREGADO" && tarea.Tramite != null)
        {
            var entregaExistente = await _db.Entregas.AnyAsync(e => e.TramiteId == tarea.TramiteId);
            if (!entregaExistente)
            {
                _db.Entregas.Add(new Entrega
                {
                    Id = Guid.NewGuid(),
                    TramiteId = tarea.TramiteId,
                    UbicacionEntrega = request.UbicacionEntrega,
                    NombreRecibe = request.NombreRecibe,
                    FirmaBase64 = request.FirmaBase64,
                    FotoEvidenciaUrl = request.FotosUrls?.FirstOrDefault(),
                    Descripcion = request.NotasChofer,
                    FechaEntrega = DateTime.UtcNow,
                    CreadoPor = _currentUser.UserId ?? Guid.Empty,
                });
            }
        }

        await _db.SaveChangesAsync();

        if (tarea.Estado == "ENTREGADO" && tarea.Tramite.EstadoLogistico != "ENTREGADO_AL_CLIENTE")
        {
            await _tramiteService.CambiarEstadoAsync(tarea.TramiteId, new CambiarEstadoRequest
            {
                NuevoEstado = "ENTREGADO_AL_CLIENTE",
                Notas = "Entrega registrada desde el módulo de choferes.",
            });
        }

        await _realtime.TramiteActualizadoAsync(tarea.TramiteId, "ENTREGA_COMPLETADA");

        var dto = (await GetById(id))!;
        var operadorNombre = dto.ChoferNombre ?? "El chofer";

        await _notificaciones.EmitirAsync(tarea.Estado == "INCIDENCIA"
            ? CatalogoNotificaciones.IncidenciaCampo(
                tarea.Id, tarea.TramiteId, dto.NumeroConsecutivo, dto.VehiculoResumen,
                tarea.Incidencia ?? "Sin detalle", operadorNombre)
            : CatalogoNotificaciones.TareaEntregaCompletada(
                tarea.Id, tarea.TramiteId, dto.NumeroConsecutivo, tarea.NombreRecibe, operadorNombre));

        return dto;
    }

    public async Task<List<VehiculoEntregaLookupDto>> BuscarVehiculosAsync(string query)
    {
        var normalized = NormalizeVin(query);
        if (string.IsNullOrWhiteSpace(normalized) || normalized.Length < 3)
            return [];

        var vehicles = await _db.Vehiculos
            .AsNoTracking()
            .Include(v => v.Cliente)
            .Include(v => v.Marca)
            .Include(v => v.Modelo)
            .Where(v => v.Vin.Contains(normalized) || (v.VinCorto != null && v.VinCorto.Contains(normalized)))
            .OrderBy(v => v.Vin)
            .Take(20)
            .ToListAsync();

        if (vehicles.Count == 0)
            return [];

        var vehicleIds = vehicles.Select(v => v.Id).ToArray();
        var tramites = await _db.Tramites
            .AsNoTracking()
            .Where(t => t.VehiculoId.HasValue && vehicleIds.Contains(t.VehiculoId.Value) && t.EstadoLogistico != "CANCELADO")
            .OrderByDescending(t => t.FechaCreacion)
            .Select(t => new
            {
                t.Id,
                t.VehiculoId,
                t.NumeroConsecutivo,
                t.EstadoLogistico,
                t.FechaCreacion,
            })
            .ToListAsync();

        return vehicles.Select(vehicle =>
        {
            var vehicleTramites = tramites
                .Where(t => t.VehiculoId == vehicle.Id)
                .OrderBy(t => IsFinalTramiteState(t.EstadoLogistico) ? 1 : 0)
                .ThenByDescending(t => t.FechaCreacion)
                .ToList();
            var tramite = vehicleTramites.FirstOrDefault();

            return new VehiculoEntregaLookupDto
            {
                VehiculoId = vehicle.Id,
                Vin = vehicle.Vin,
                VinCorto = vehicle.VinCorto,
                VehiculoResumen = BuildVehiculoResumen(vehicle),
                ClienteNombre = vehicle.Cliente == null
                    ? null
                    : FirstNotEmpty(vehicle.Cliente.NombreCompleto, vehicle.Cliente.Nombre, vehicle.Cliente.Apodo),
                UbicacionActual = vehicle.UbicacionActual,
                TramiteId = tramite?.Id,
                NumeroConsecutivo = tramite?.NumeroConsecutivo,
                EstadoTramite = tramite?.EstadoLogistico,
                YaEntregado = tramite != null && IsFinalTramiteState(tramite.EstadoLogistico),
            };
        }).ToList();
    }

    public async Task<TareaEntregaDto> RegistrarEntregaVehiculoAsync(RegistrarEntregaVehiculoRequest request)
    {
        var normalized = NormalizeVin(request.Vin);
        var vehicle = request.VehiculoId.HasValue
            ? await _db.Vehiculos.FirstOrDefaultAsync(v => v.Id == request.VehiculoId.Value)
            : await _db.Vehiculos.FirstOrDefaultAsync(v => v.Vin == normalized || v.VinCorto == normalized);

        if (vehicle == null)
            throw new KeyNotFoundException("Vehículo no encontrado");

        var tramite = await _db.Tramites
            .Where(t => t.VehiculoId == vehicle.Id && t.EstadoLogistico != "CANCELADO")
            .OrderBy(t => IsFinalTramiteState(t.EstadoLogistico) ? 1 : 0)
            .ThenByDescending(t => t.FechaCreacion)
            .FirstOrDefaultAsync();

        if (tramite == null)
            throw new InvalidOperationException("El vehículo no tiene un trámite registrado para entregar");

        if (IsFinalTramiteState(tramite.EstadoLogistico))
            throw new InvalidOperationException("El trámite de este vehículo ya está marcado como entregado");

        var tarea = await _db.TareasEntrega
            .FirstOrDefaultAsync(t => t.TramiteId == tramite.Id && t.Estado != "ENTREGADO" && t.Estado != "INCIDENCIA");

        if (tarea == null)
        {
            tarea = new TareaEntrega
            {
                Id = Guid.NewGuid(),
                TramiteId = tramite.Id,
                ChoferUserId = _currentUser.UserId,
                Estado = "PENDIENTE",
                UbicacionEntrega = request.UbicacionEntrega,
                NotasChofer = request.NotasChofer,
                FechaCreacion = DateTime.UtcNow,
                CreadoPor = _currentUser.UserId ?? Guid.Empty,
            };
            _db.TareasEntrega.Add(tarea);
            await _db.SaveChangesAsync();
        }

        return await RegistrarEntregaAsync(tarea.Id, new RegistrarEntregaRequest
        {
            UbicacionEntrega = request.UbicacionEntrega,
            NombreRecibe = request.NombreRecibe,
            NotasChofer = request.NotasChofer,
        });
    }

    public async Task<TareaEntregaDto> AgregarFotoAsync(Guid id, string fotoUrl)
    {
        var tarea = await _db.TareasEntrega.FindAsync(id)
            ?? throw new KeyNotFoundException("Tarea de entrega no encontrada");

        var fotos = tarea.FotosUrls.ToList();
        fotos.Add(fotoUrl);
        tarea.FotosUrls = fotos.ToArray();

        if (tarea.Estado == "PENDIENTE")
            tarea.Estado = "EN_CAMINO";

        await _db.SaveChangesAsync();
        return (await GetById(id))!;
    }

    private async Task<TareaEntregaDto?> GetById(Guid id)
    {
        var tarea = await _db.TareasEntrega
            .Include(t => t.Tramite).ThenInclude(t => t.Cliente)
            .Include(t => t.Tramite).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Marca)
            .Include(t => t.Tramite).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Modelo)
            .Include(t => t.Chofer)
            .FirstOrDefaultAsync(t => t.Id == id);

        return tarea == null ? null : Map(tarea);
    }

    private static TareaEntregaDto Map(TareaEntrega t)
    {
        var vehiculoResumen = t.Tramite.Vehiculo != null
            ? string.Join(" ", new[] { t.Tramite.Vehiculo.Marca?.Nombre, t.Tramite.Vehiculo.Modelo?.Nombre, t.Tramite.Vehiculo.Anno?.ToString() }.Where(x => !string.IsNullOrWhiteSpace(x)))
            : (t.Tramite.DescripcionMercancia ?? "Unidad sin descripción");

        var choferNombre = t.Chofer != null
            ? string.Join(" ", new[] { t.Chofer.Nombre, t.Chofer.Apellidos }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim()
            : null;

        return new TareaEntregaDto
        {
            Id = t.Id,
            TramiteId = t.TramiteId,
            NumeroConsecutivo = t.Tramite.NumeroConsecutivo,
            ClienteNombre = t.Tramite.Cliente != null
                ? (t.Tramite.Cliente.NombreCompleto ?? t.Tramite.Cliente.Nombre ?? t.Tramite.Cliente.Apodo)
                : null,
            VehiculoResumen = vehiculoResumen,
            Vin = t.Tramite.Vehiculo?.Vin,
            VinCorto = t.Tramite.Vehiculo?.VinCorto,
            ChoferUserId = t.ChoferUserId,
            ChoferNombre = choferNombre,
            Estado = t.Estado,
            FotosUrls = t.FotosUrls,
            UbicacionEntrega = t.UbicacionEntrega,
            NombreRecibe = t.NombreRecibe,
            FirmaBase64 = t.FirmaBase64,
            Incidencia = t.Incidencia,
            NotasChofer = t.NotasChofer,
            FechaCreacion = t.FechaCreacion,
            FechaTomada = t.FechaTomada,
            FechaEntregado = t.FechaEntregado,
        };
    }

    private static bool IsFinalTramiteState(string estado) => estado is
        "ENTREGADO_AL_CLIENTE" or "VERDE_ENTREGADO" or "AMARILLO_PENDIENTE_PAGO" or "COBRADO";

    private static string NormalizeVin(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return Regex.Replace(value.Trim().Trim('*').ToUpperInvariant(), @"[^A-HJ-NPR-Z0-9]", "");
    }

    private static string BuildVehiculoResumen(Vehiculo vehicle)
    {
        var summary = string.Join(" ", new[]
        {
            vehicle.Marca?.Nombre,
            vehicle.Modelo?.Nombre,
            vehicle.Anno?.ToString(),
        }.Where(value => !string.IsNullOrWhiteSpace(value)));

        return FirstNotEmpty(summary, vehicle.VinCorto, vehicle.Vin, "Unidad sin descripción");
    }

    private static string FirstNotEmpty(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;

}
