using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Entregas;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class EntregaTaskService : IEntregaTaskService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IRealtimeNotifier _realtime;

    public EntregaTaskService(AppDbContext db, ICurrentUserService currentUser, IRealtimeNotifier realtime)
    {
        _db = db;
        _currentUser = currentUser;
        _realtime = realtime;
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

        return (await GetById(tarea.Id))!;
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
        await _realtime.TramiteActualizadoAsync(tarea.TramiteId, "ENTREGA_COMPLETADA");

        return (await GetById(id))!;
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
}
