using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RR.Application.DTOs.Campo;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using System.Net.Http.Json;
using System.Text.RegularExpressions;

namespace RR.Infrastructure.Services;

public class CampoService : ICampoService
{
    private static readonly Regex VinRegex = new(@"[A-HJ-NPR-Z0-9]{17}", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IRealtimeNotifier _realtime;
    private readonly IEmailService _email;
    private readonly IConfiguration _configuration;
    private readonly IWhatsAppService _whatsapp;
    private readonly IPushNotificationService _push;

    public CampoService(
        AppDbContext db,
        ICurrentUserService currentUser,
        IRealtimeNotifier realtime,
        IEmailService email,
        IConfiguration configuration,
        IWhatsAppService whatsapp,
        IPushNotificationService push)
    {
        _db = db;
        _currentUser = currentUser;
        _realtime = realtime;
        _email = email;
        _configuration = configuration;
        _whatsapp = whatsapp;
        _push = push;
    }

    public async Task<List<TareaCampoDto>> GetTareasAsync(string? EstadoLogistico)
    {
        var query = _db.TareasCampo
            .Include(t => t.Tramite!).ThenInclude(t => t.Cliente)
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(t => t.PersonalCampo)
            .Include(t => t.UsuarioCampo)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(EstadoLogistico))
            query = query.Where(t => t.EstadoLogistico == EstadoLogistico);

        var tareas = await query
            .OrderBy(t => t.EstadoLogistico == "ABIERTA" ? 0 : 1)
            .ThenByDescending(t => t.FechaCreacion)
            .Take(100)
            .ToListAsync();

        return tareas
            .GroupBy(t => new { TareaKey = t.TramiteId ?? t.Id, t.Tipo })
            .Select(g => g
                .OrderBy(t => t.EstadoLogistico == "COMPLETADA" || t.EstadoLogistico == "CANCELADA" ? 1 : 0)
                .ThenByDescending(t => t.FechaCreacion)
                .First())
            .Select(Map)
            .ToList();
    }

    public async Task<TareaCampoDto> CrearAsync(CrearTareaCampoRequest request)
    {
        var tramite = await _db.Tramites.FindAsync(request.TramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");

        var tieneTareaActiva = await _db.TareasCampo
            .AnyAsync(t => t.TramiteId == request.TramiteId && t.Tipo == request.Tipo && t.EstadoLogistico != "CANCELADA");

        if (tieneTareaActiva)
            throw new InvalidOperationException("Este trámite ya tiene una tarea de campo activa");

        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TramiteId = request.TramiteId,
            Tipo = request.Tipo,
            EstadoLogistico = "ABIERTA",
            Ubicacion = request.Ubicacion,
            FechaCreacion = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };

        _db.TareasCampo.Add(tarea);
        await MoveEstadoIfAllowed(tramite, "FOTOS_SOLICITADAS", "Tarea de campo creada para toma de fotos y validación de unidad.");
        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, "CREADA");
        await _realtime.TramiteActualizadoAsync(tarea.TramiteId!.Value, "CAMPO_CREADO");

        return (await GetById(tarea.Id))!;
    }

    public async Task<TareaCampoDto> CrearPreInspeccionAsync(CrearPreInspeccionRequest request)
    {
        var vin = NormalizeVin(request.Vin);
        if (!string.IsNullOrWhiteSpace(request.Vin) && vin?.Length != 17)
            throw new InvalidOperationException("El VIN debe tener 17 caracteres");

        Cliente? cliente = null;
        if (request.ClienteId.HasValue)
        {
            cliente = await _db.Clientes.FirstOrDefaultAsync(c => c.Id == request.ClienteId.Value && c.DeletedAt == null)
                ?? throw new KeyNotFoundException("Cliente no encontrado");
        }

        var modeloId = await ResolveModeloIdAsync(request.MarcaId, request.ModeloId, request.Modelo);
        Guid? vehiculoId = null;
        Vehiculo? vehiculo = null;

        if (!string.IsNullOrWhiteSpace(vin))
        {
            vehiculo = await _db.Vehiculos.FirstOrDefaultAsync(v => v.Vin == vin);

            if (vehiculo is null)
            {
                vehiculo = new Vehiculo
                {
                    Id = Guid.NewGuid(),
                    Vin = vin,
                    VinCorto = vin.Length >= 6 ? vin[^6..] : null,
                    ClienteId = request.ClienteId,
                    MarcaId = request.MarcaId,
                    ModeloId = modeloId,
                    Anno = request.Anno,
                    Estado = "PENDIENTE_DE_TRAMITE",
                    UbicacionActual = request.Ubicacion,
                    FechaIngresoPatio = DateTime.UtcNow,
                    FechaRegistro = DateTime.UtcNow
                };
                _db.Vehiculos.Add(vehiculo);
            }
            else
            {
                if (request.ClienteId.HasValue &&
                    vehiculo.ClienteId.HasValue &&
                    vehiculo.ClienteId.Value != request.ClienteId.Value)
                {
                    throw new InvalidOperationException("El vehiculo ya pertenece a otro cliente");
                }

                vehiculo.ClienteId ??= request.ClienteId;
                vehiculo.MarcaId ??= request.MarcaId;
                vehiculo.ModeloId ??= modeloId;
                vehiculo.Anno ??= request.Anno;
                vehiculo.UbicacionActual = FirstNotEmpty(request.Ubicacion, vehiculo.UbicacionActual);
                vehiculo.FechaIngresoPatio ??= DateTime.UtcNow;

                if (string.IsNullOrWhiteSpace(vehiculo.Estado))
                    vehiculo.Estado = "PENDIENTE_DE_TRAMITE";
            }

            vehiculoId = vehiculo.Id;
        }

        var clienteNombre = cliente is null
            ? request.ClienteNombreLibre
            : FirstNotEmpty(cliente.NombreCompleto, cliente.Nombre, cliente.Apodo);

        var descripcion = FirstNotEmpty(
            request.DescripcionVehiculo,
            vehiculo is null ? null : BuildVehiculoResumen(vehiculo),
            "Registro en yarda");

        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TramiteId = null,
            VehiculoId = vehiculoId,
            Tipo = "PRE_INSPECCION",
            EstadoLogistico = "ABIERTA",
            Ubicacion = request.Ubicacion,
            DescripcionVehiculo = descripcion,
            ClienteNombreLibre = clienteNombre,
            Incidencia = request.NotasInternas,
            FechaCreacion = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };

        _db.TareasCampo.Add(tarea);
        await _db.SaveChangesAsync();
        await RunBestEffortAsync(() => _realtime.CampoActualizadoAsync(tarea.Id, null, "CREADA"));
        var dto = (await GetById(tarea.Id))!;

        // Notificación específica a admins con resumen del operador para mostrar toast/bell.
        var operadorUserId = _currentUser.UserId;
        string operadorNombre = "Operador de campo";
        if (operadorUserId.HasValue && operadorUserId.Value != Guid.Empty)
        {
            var operadorUser = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == operadorUserId.Value);
            operadorNombre = BuildUsuarioNombre(operadorUser) ?? operadorNombre;
        }

        var resumenPreInsp = vehiculo != null ? BuildVehiculoResumen(vehiculo) : (descripcion ?? "Pre-inspección");

        await RunBestEffortAsync(() => _realtime.PreInspeccionCreadaAsync(
            tarea.Id,
            vehiculoId,
            resumenPreInsp,
            vin,
            request.Ubicacion,
            clienteNombre,
            operadorNombre,
            (tarea.FotosUrls ?? Array.Empty<string>()).Length));

        // WhatsApp a admins (best-effort, no bloquea ni revierte si falla)
        await RunBestEffortAsync(() => _whatsapp.EnviarPreInspeccionAdminsAsync(
            tarea.Id,
            resumenPreInsp,
            vin,
            operadorNombre,
            clienteNombre));

        // Push notification a admins (best-effort)
        await RunBestEffortAsync(() => _push.SendToAdminsAsync(
            "Pre-inspección nueva en yarda",
            $"{operadorNombre} capturó {resumenPreInsp}" + (vin != null ? $" — VIN {vin}" : ""),
            "/campo/bandeja-admin",
            "pre-inspeccion-" + tarea.Id));

        return dto;
    }

    public async Task<TareaCampoDto> SolicitarFotosAdicionalesAsync(Guid id, SolicitarFotosAdicionalesRequest request)
    {
        var tarea = await _db.TareasCampo
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(t => t.Tramite).ThenInclude(t => t!.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Tramite).ThenInclude(t => t!.Vehiculo).ThenInclude(v => v!.Modelo)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        var mensaje = string.IsNullOrWhiteSpace(request.Mensaje) ? "Se solicitan fotos adicionales." : request.Mensaje.Trim();

        var operadorUserId = tarea.TomadaPorUsuarioId ?? tarea.CreadoPor;
        if (operadorUserId == Guid.Empty)
            throw new InvalidOperationException("La tarea no tiene un operador asignado al que notificar");

        // Reabrir la tarea si ya estaba completada o incidencia, para que el yardero pueda agregar más fotos.
        if (tarea.EstadoLogistico is "COMPLETADA" or "INCIDENCIA")
        {
            tarea.EstadoLogistico = "TOMADA";
            tarea.FechaCompletada = null;
        }

        var vehiculoResumen = tarea.Tramite?.Vehiculo != null
            ? BuildVehiculoResumen(tarea.Tramite.Vehiculo)
            : (tarea.Vehiculo != null ? BuildVehiculoResumen(tarea.Vehiculo) : (tarea.DescripcionVehiculo ?? "Unidad sin descripción"));

        if (tarea.TramiteId.HasValue)
        {
            _db.Eventos.Add(new Evento
            {
                Id = Guid.NewGuid(),
                TramiteId = tarea.TramiteId.Value,
                Tipo = "CAMPO",
                Contenido = $"Admin solicita fotos adicionales: {mensaje}",
                FechaEvento = DateTime.UtcNow,
                CreadoPor = _currentUser.UserId ?? Guid.Empty,
            });
        }

        await _db.SaveChangesAsync();

        _ = _realtime.FotosAdicionalesSolicitadasAsync(
            operadorUserId,
            tarea.Id,
            tarea.TramiteId,
            vehiculoResumen,
            mensaje);

        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, "FOTOS_SOLICITADAS");

        // Push al yardero (puede llegar aún con la PWA cerrada)
        await RunBestEffortAsync(() => _push.SendToUserAsync(
            operadorUserId,
            "Admin pide más fotos",
            $"{vehiculoResumen} — {mensaje}",
            "/campo",
            "solicitud-fotos-" + tarea.Id));

        return (await GetById(id))!;
    }

    public async Task<TareaCampoDto> VincularTramiteAsync(Guid id, VincularPreInspeccionRequest request)
    {
        var tarea = await _db.TareasCampo
            .Include(t => t.Vehiculo)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        if (tarea.Tipo != "PRE_INSPECCION")
            throw new InvalidOperationException("Solo se pueden vincular pre-inspecciones");

        var tramite = await _db.Tramites.FindAsync(request.TramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");

        if (tarea.VehiculoId.HasValue)
        {
            if (tramite.VehiculoId.HasValue && tramite.VehiculoId.Value != tarea.VehiculoId.Value)
                throw new InvalidOperationException("El tramite ya tiene otro vehiculo asignado");

            tramite.VehiculoId = tarea.VehiculoId;

            if (tarea.Vehiculo != null)
            {
                if (tarea.Vehiculo.ClienteId.HasValue &&
                    tramite.ClienteId.HasValue &&
                    tarea.Vehiculo.ClienteId.Value != tramite.ClienteId.Value)
                {
                    throw new InvalidOperationException("El vehiculo ya pertenece a otro cliente");
                }

                if (!tarea.Vehiculo.ClienteId.HasValue && tramite.ClienteId.HasValue)
                    tarea.Vehiculo.ClienteId = tramite.ClienteId;

                tarea.Vehiculo.Estado = "EN_TRAMITE";
            }
        }

        if (string.IsNullOrWhiteSpace(tramite.DescripcionMercancia))
            tramite.DescripcionMercancia = tarea.DescripcionVehiculo;

        tarea.TramiteId = request.TramiteId;
        tarea.Tipo = "FOTOS_YARDA";
        await MoveEstadoIfAllowed(tramite, "FOTOS_SOLICITADAS", "Pre-inspección de campo vinculada al trámite.");
        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, "VINCULADA");
        await _realtime.TramiteActualizadoAsync(request.TramiteId, "CAMPO_CREADO");

        return (await GetById(id))!;
    }

    public async Task<TareaCampoDto> TomarAsync(Guid id, TomarTareaCampoRequest request)
    {
        var tarea = await _db.TareasCampo.FindAsync(id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        if (tarea.EstadoLogistico != "ABIERTA")
            throw new InvalidOperationException("Solo se pueden tomar tareas abiertas");

        var userId = _currentUser.UserId
            ?? throw new InvalidOperationException("No se pudo identificar al usuario que toma la tarea");

        tarea.EstadoLogistico = "TOMADA";
        tarea.TomadaPorUsuarioId = userId;
        tarea.FechaTomada = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, "TOMADA");

        return (await GetById(id))!;
    }

    public async Task<TareaCampoDto> CompletarAsync(Guid id, CompletarTareaCampoRequest request)
    {
        var tarea = await _db.TareasCampo
            .Include(t => t.Tramite)
            .Include(t => t.PersonalCampo)
            .Include(t => t.UsuarioCampo)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        tarea.Ubicacion = request.Ubicacion ?? tarea.Ubicacion;
        tarea.VinConfirmado = request.VinConfirmado;
        tarea.FotosUrls = request.FotosUrls ?? [];
        tarea.Incidencia = request.Incidencia;
        tarea.EstadoLogistico = string.IsNullOrWhiteSpace(request.Incidencia) ? "COMPLETADA" : "INCIDENCIA";
        tarea.FechaCompletada = DateTime.UtcNow;

        if (tarea.TramiteId.HasValue)
        {
            _db.Eventos.Add(new Evento
            {
                Id = Guid.NewGuid(),
                TramiteId = tarea.TramiteId.Value,
                Tipo = "CAMPO",
                Contenido = tarea.EstadoLogistico == "COMPLETADA"
                    ? "Fotos y validación de unidad completadas en yarda."
                    : $"Incidencia de campo: {request.Incidencia}",
                FotoUrl = tarea.FotosUrls.FirstOrDefault(),
                FechaEvento = DateTime.UtcNow,
                CreadoPor = _currentUser.UserId ?? Guid.Empty,
            });
        }

        if (tarea.EstadoLogistico == "COMPLETADA" && tarea.Tramite != null)
        {
            await MoveEstadoIfAllowed(tarea.Tramite, "FOTOS_RECIBIDAS", "Fotos de yarda recibidas.");

            if (tarea.Tipo == "FOTOS_YARDA" && tarea.Tramite != null && tarea.Tramite.VehiculoId.HasValue)
            {
                var vehiculo = await _db.Vehiculos.FindAsync(tarea.Tramite.VehiculoId.Value);
                if (vehiculo != null)
                {
                    if (vehiculo.FechaIngresoPatio == null)
                    {
                        vehiculo.FechaIngresoPatio = DateTime.UtcNow;
                    }
                    if (!string.IsNullOrWhiteSpace(tarea.Ubicacion))
                    {
                        vehiculo.UbicacionActual = tarea.Ubicacion;
                    }
                    vehiculo.CumplioRequisitos = true;
                }
            }
        }

        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, tarea.EstadoLogistico);
        if (tarea.TramiteId.HasValue)
            await _realtime.TramiteActualizadoAsync(tarea.TramiteId.Value, "CAMPO_COMPLETADO");

        // ── Notificaciones a admins ────────────────────────────────────────────
        var operadorNombre = BuildUsuarioNombre(tarea.UsuarioCampo)
            ?? (tarea.PersonalCampo != null ? tarea.PersonalCampo.Nombre : "Operador de campo");

        var dto = (await GetById(id))!;

        // SignalR → solo al grupo "admins" (solo si tiene tramite ligado)
        if (tarea.TramiteId.HasValue)
        {
            _ = _realtime.TareaCampoCompletadaAsync(
                tarea.Id, tarea.TramiteId.Value,
                dto.NumeroConsecutivo ?? "PRE-INSPECCION", dto.VehiculoResumen,
                tarea.Ubicacion, tarea.VinConfirmado, tarea.Incidencia,
                tarea.FotosUrls.Length, operadorNombre);
        }

        // Email → a todos los usuarios admin del tenant que tengan email
        var appBaseUrl = _configuration["AppBaseUrl"] ?? string.Empty;
        var tramiteTenantId = tarea.Tramite?.TenantId ?? tarea.TenantId;
        // Avisar por email a usuarios de oficina (los que NO tienen el permiso CAMPO_USAR).
        var admins = await _db.Usuarios
            .Include(u => u.Role)
                .ThenInclude(r => r!.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Where(u => u.TenantId == tramiteTenantId
                     && u.Activo
                     && !string.IsNullOrEmpty(u.Email)
                     && u.Role != null
                     && !u.Role.RolePermissions.Any(rp => rp.Permission != null && rp.Permission.Codigo == "CAMPO_USAR"))
            .Select(u => u.Email!)
            .ToListAsync();

        foreach (var email in admins)
        {
            _ = _email.SendCampoCompletadoAsync(
                email,
                dto.NumeroConsecutivo ?? "Pre-inspección", dto.VehiculoResumen,
                tarea.VinConfirmado, tarea.Ubicacion, tarea.Incidencia,
                tarea.FotosUrls, operadorNombre, appBaseUrl)
                .ContinueWith(t => { /* silenciar fallo de email */ }, TaskContinuationOptions.OnlyOnFaulted);
        }

        return dto;
    }

    public Task<TareaCampoDto?> GetByIdAsync(Guid id) => GetById(id);

    private async Task<TareaCampoDto?> GetById(Guid id)
    {
        var tarea = await _db.TareasCampo
            .Include(t => t.Tramite!).ThenInclude(t => t.Cliente)
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(t => t.PersonalCampo)
            .Include(t => t.UsuarioCampo)
            .Where(t => t.Id == id)
            .FirstOrDefaultAsync();

        return tarea == null ? null : Map(tarea);
    }

    public async Task<TareaCampoDto> AgregarFotoAsync(Guid id, string fotoUrl)
    {
        var tarea = await _db.TareasCampo.FindAsync(id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        var fotos = tarea.FotosUrls.ToList();
        fotos.Add(fotoUrl);
        tarea.FotosUrls = fotos.ToArray();

        if (tarea.VehiculoId.HasValue)
        {
            var vehiculo = await _db.Vehiculos.FindAsync(tarea.VehiculoId.Value);
            if (vehiculo != null)
            {
                var vFotos = vehiculo.FotosUrls.ToList();
                if (!vFotos.Contains(fotoUrl))
                {
                    vFotos.Add(fotoUrl);
                    vehiculo.FotosUrls = vFotos.ToArray();
                }
            }
        }

        if (tarea.EstadoLogistico is "ABIERTA" or "TOMADA")
            tarea.EstadoLogistico = "EN_YARDA";

        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, "FOTO_SUBIDA");
        return (await GetById(id))!;
    }

    public async Task<TareaCampoDto> EliminarFotoAsync(Guid id, EliminarFotoCampoRequest request)
    {
        var fotoUrl = request.FotoUrl?.Trim();
        if (string.IsNullOrWhiteSpace(fotoUrl))
            throw new InvalidOperationException("La foto es obligatoria");

        var tarea = await _db.TareasCampo
            .Include(t => t.Tramite)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        var fotos = (tarea.FotosUrls ?? Array.Empty<string>()).ToList();
        if (!fotos.Remove(fotoUrl))
            throw new KeyNotFoundException("Foto no encontrada en la tarea");

        tarea.FotosUrls = fotos.ToArray();

        var vehiculoId = tarea.VehiculoId ?? tarea.Tramite?.VehiculoId;
        if (vehiculoId.HasValue)
        {
            var vehiculo = await _db.Vehiculos.FindAsync(vehiculoId.Value);
            if (vehiculo != null)
            {
                var vehiculoFotos = (vehiculo.FotosUrls ?? Array.Empty<string>()).ToList();
                if (vehiculoFotos.Remove(fotoUrl))
                    vehiculo.FotosUrls = vehiculoFotos.ToArray();
            }
        }

        if (tarea.TramiteId.HasValue)
        {
            _db.Eventos.Add(new Evento
            {
                Id = Guid.NewGuid(),
                TramiteId = tarea.TramiteId.Value,
                Tipo = "CAMPO",
                Contenido = "Foto de campo eliminada por administrador.",
                FechaEvento = DateTime.UtcNow,
                CreadoPor = _currentUser.UserId ?? Guid.Empty,
            });
        }

        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, "FOTO_ELIMINADA");
        return (await GetById(id))!;
    }

    public async Task<TareaCampoDto> DescartarAsync(Guid id, DescartarTareaCampoRequest request)
    {
        var tarea = await _db.TareasCampo.FindAsync(id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        if (tarea.EstadoLogistico == "CANCELADA")
            return (await GetById(id))!;

        var motivo = string.IsNullOrWhiteSpace(request.Motivo) ? "Descartada por admin." : request.Motivo.Trim();

        tarea.EstadoLogistico = "CANCELADA";
        tarea.Incidencia = string.IsNullOrWhiteSpace(tarea.Incidencia) ? motivo : tarea.Incidencia + " | " + motivo;

        if (tarea.TramiteId.HasValue)
        {
            _db.Eventos.Add(new Evento
            {
                Id = Guid.NewGuid(),
                TramiteId = tarea.TramiteId.Value,
                Tipo = "CAMPO",
                Contenido = $"Tarea de campo descartada: {motivo}",
                FechaEvento = DateTime.UtcNow,
                CreadoPor = _currentUser.UserId ?? Guid.Empty,
            });
        }

        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, tarea.TramiteId, "CANCELADA");
        return (await GetById(id))!;
    }

    public async Task<List<TareaCampoDto>> GetBandejaAdminAsync(BandejaCampoAdminFilters? filtros)
    {
        var query = _db.TareasCampo
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v!.Modelo)
            .Include(t => t.PersonalCampo)
            .Include(t => t.UsuarioCampo)
            .Where(t => t.Tipo == "PRE_INSPECCION"
                     && t.TramiteId == null
                     && t.EstadoLogistico != "CANCELADA")
            .AsQueryable();

        if (filtros != null)
        {
            if (filtros.Desde.HasValue)
                query = query.Where(t => t.FechaCreacion >= filtros.Desde.Value);
            if (filtros.Hasta.HasValue)
                query = query.Where(t => t.FechaCreacion <= filtros.Hasta.Value);
            if (filtros.OperadorUsuarioId.HasValue)
                query = query.Where(t => t.TomadaPorUsuarioId == filtros.OperadorUsuarioId.Value
                                       || t.CreadoPor == filtros.OperadorUsuarioId.Value);
            if (!string.IsNullOrWhiteSpace(filtros.Ubicacion))
            {
                var loc = filtros.Ubicacion.Trim();
                query = query.Where(t => t.Ubicacion != null && EF.Functions.Like(t.Ubicacion, $"%{loc}%"));
            }
        }

        var tareas = await query
            .OrderByDescending(t => t.FechaCreacion)
            .Take(200)
            .ToListAsync();

        return tareas.Select(Map).ToList();
    }

    private Task MoveEstadoIfAllowed(Tramite tramite, string nuevoEstado, string contenido)
    {
        var allowed = (tramite.EstadoLogistico, nuevoEstado) switch
        {
            ("PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS") => true,
            ("FOTOS_SOLICITADAS", "FOTOS_RECIBIDAS") => true,
            _ => false,
        };

        if (!allowed) return Task.CompletedTask;

        var anterior = tramite.EstadoLogistico;
        tramite.EstadoLogistico = nuevoEstado;
        tramite.FechaEstadoActual = DateTime.UtcNow;
        tramite.FechaModificacion = DateTime.UtcNow;
        _db.Eventos.Add(new Evento
        {
            Id = Guid.NewGuid(),
            TramiteId = tramite.Id,
            Tipo = "CAMBIO_ESTADO",
            EstadoAnterior = anterior,
            EstadoNuevo = nuevoEstado,
            Contenido = contenido,
            FechaEvento = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        });

        return Task.CompletedTask;
    }

    private static TareaCampoDto Map(TareaCampo t)
    {
        var vehiculo = t.Tramite?.Vehiculo ?? t.Vehiculo;

        return new TareaCampoDto
        {
            Id = t.Id,
            TramiteId = t.TramiteId,
            VehiculoId = t.Tramite?.VehiculoId ?? t.VehiculoId,
            ClienteId = t.Tramite?.ClienteId ?? vehiculo?.ClienteId,
            NumeroConsecutivo = t.Tramite?.NumeroConsecutivo,
            ClienteNombre = t.Tramite?.Cliente != null
                ? FirstNotEmpty(t.Tramite.Cliente.NombreCompleto, t.Tramite.Cliente.Nombre, t.Tramite.Cliente.Apodo)
                : (t.Vehiculo?.Cliente != null ? FirstNotEmpty(t.Vehiculo.Cliente.NombreCompleto, t.Vehiculo.Cliente.Nombre, t.Vehiculo.Cliente.Apodo) : null),
            VehiculoResumen = t.Tramite != null ? BuildVehiculoResumen(t.Tramite) : BuildPreInspeccionResumen(t),
            DescripcionVehiculo = t.DescripcionVehiculo,
            ClienteNombreLibre = t.ClienteNombreLibre,
            Vin = vehiculo?.Vin,
            VinCorto = vehiculo?.VinCorto,
            Tipo = t.Tipo,
            Estatus = t.EstadoLogistico,
            PersonalCampoId = t.TomadaPorUsuarioId ?? t.PersonalCampoId,
            PersonalCampoNombre = BuildUsuarioNombre(t.UsuarioCampo) ?? (t.PersonalCampo != null ? t.PersonalCampo.Nombre : null),
            UsuarioCampoId = t.TomadaPorUsuarioId,
            UsuarioCampoNombre = BuildUsuarioNombre(t.UsuarioCampo),
            Ubicacion = t.Ubicacion,
            VinConfirmado = t.VinConfirmado,
            FotosUrls = t.FotosUrls,
            Incidencia = t.Incidencia,
            FechaCreacion = t.FechaCreacion,
            FechaTomada = t.FechaTomada,
            FechaCompletada = t.FechaCompletada,
        };
    }

    private static string BuildVehiculoResumen(Tramite tramite)
    {
        if (tramite.Vehiculo == null)
            return tramite.DescripcionMercancia ?? "Unidad sin descripcion";

        return BuildVehiculoResumen(tramite.Vehiculo);
    }

    private static string BuildPreInspeccionResumen(TareaCampo tarea)
    {
        if (tarea.Vehiculo != null)
            return BuildVehiculoResumen(tarea.Vehiculo);

        return tarea.DescripcionVehiculo ?? "Pre-inspeccion";
    }

    private static string BuildVehiculoResumen(Vehiculo vehiculo)
    {
        var resumen = string.Join(" ", new[]
        {
            vehiculo.Marca?.Nombre,
            vehiculo.Modelo?.Nombre,
            vehiculo.Anno?.ToString(),
        }.Where(x => !string.IsNullOrWhiteSpace(x)));

        if (!string.IsNullOrWhiteSpace(resumen))
            return resumen;

        return FirstNotEmpty(vehiculo.VinCorto, vehiculo.Vin, "Unidad sin descripcion");
    }

    private async Task<Guid?> ResolveModeloIdAsync(Guid? marcaId, Guid? modeloId, string? modeloNombre)
    {
        if (modeloId.HasValue)
            return modeloId.Value;

        if (!marcaId.HasValue || string.IsNullOrWhiteSpace(modeloNombre))
            return null;

        var nombre = modeloNombre.Trim();
        var nombreUpper = nombre.ToUpper();
        var modelo = await _db.Modelos.FirstOrDefaultAsync(m =>
            m.MarcaId == marcaId.Value &&
            m.Nombre.ToUpper() == nombreUpper);

        if (modelo != null)
            return modelo.Id;

        modelo = new Modelo
        {
            Id = Guid.NewGuid(),
            MarcaId = marcaId.Value,
            Nombre = nombre
        };

        _db.Modelos.Add(modelo);
        return modelo.Id;
    }

    private static string? NormalizeVin(string? vin)
    {
        if (string.IsNullOrWhiteSpace(vin))
            return null;

        var clean = Regex.Replace(vin.Trim().Trim('*').ToUpperInvariant(), @"[^A-HJ-NPR-Z0-9]", "");
        var match = VinRegex.Match(clean);
        if (match.Success)
            return match.Value.ToUpperInvariant();

        if (clean.Length > 17)
            clean = clean[^17..];

        return string.IsNullOrWhiteSpace(clean) ? null : clean;
    }

    private static string FirstNotEmpty(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? string.Empty;

    private static string? BuildUsuarioNombre(User? user)
    {
        if (user is null) return null;
        return string.Join(" ", new[] { user.Nombre, user.Apellidos }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
    }

    private static async Task RunBestEffortAsync(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch
        {
            // Las notificaciones no deben revertir una captura ya guardada.
        }
    }

    public async Task<ExtractVinResponse> ExtractVinFromImageAsync(ExtractVinRequest request)
    {
        var apiKey = _configuration["GeminiApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Gemini API key no configurada.");

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
        
        var payload = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new object[]
                    {
                        new { text = "Extrae el VIN vehicular de 17 caracteres de esta etiqueta. Puede estar como texto impreso encima del codigo de barras o dentro del codigo de barras. Ignora fecha, pesos, fabricante y cualquier otro numero. Responde UNICAMENTE con el VIN en mayusculas, sin espacios ni texto adicional. Un VIN no usa las letras I, O ni Q. Si no encuentras un VIN completo, responde NO_ENCONTRADO." },
                        new { inline_data = new { mime_type = request.ImagenMime, data = request.ImagenBase64 } }
                    }
                }
            }
        };

        using var client = new HttpClient();
        var response = await client.PostAsJsonAsync(url, payload);
        
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Error de Gemini: {err}");
        }

        using var doc = await System.Text.Json.JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        
        var text = "";
        if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
        {
            var parts = candidates[0].GetProperty("content").GetProperty("parts");
            if (parts.GetArrayLength() > 0)
            {
                text = parts[0].GetProperty("text").GetString()?.Trim() ?? "";
            }
        }

        if (text == "NO_ENCONTRADO" || text.Length < 10)
        {
            return new ExtractVinResponse { Vin = "" };
        }

        return new ExtractVinResponse { Vin = ExtractBestVin(text) ?? "" };
    }

    private static string? ExtractBestVin(string value)
    {
        var candidates = new List<string>();

        foreach (Match match in VinRegex.Matches(value.ToUpperInvariant()))
        {
            candidates.Add(match.Value.ToUpperInvariant());
        }

        var compact = Regex.Replace(value.ToUpperInvariant().Replace("VIN", " "), @"[^A-Z0-9]", "");
        if (compact.StartsWith("VIN", StringComparison.Ordinal))
        {
            compact = compact[3..];
        }

        for (var i = 0; i <= compact.Length - 17; i++)
        {
            var candidate = compact.Substring(i, 17);
            if (!candidate.Any(c => c is 'I' or 'O' or 'Q'))
            {
                candidates.Add(candidate);
            }
        }

        var unique = candidates.Distinct().ToList();
        return unique.FirstOrDefault(HasValidVinCheckDigit) ?? unique.FirstOrDefault();
    }

    private static bool HasValidVinCheckDigit(string vin)
    {
        var transliteration = new Dictionary<char, int>
        {
            ['A'] = 1, ['B'] = 2, ['C'] = 3, ['D'] = 4, ['E'] = 5, ['F'] = 6, ['G'] = 7, ['H'] = 8,
            ['J'] = 1, ['K'] = 2, ['L'] = 3, ['M'] = 4, ['N'] = 5, ['P'] = 7, ['R'] = 9,
            ['S'] = 2, ['T'] = 3, ['U'] = 4, ['V'] = 5, ['W'] = 6, ['X'] = 7, ['Y'] = 8, ['Z'] = 9
        };
        var weights = new[] { 8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2 };

        var sum = 0;
        for (var i = 0; i < vin.Length; i++)
        {
            var ch = vin[i];
            var transliterated = char.IsDigit(ch) ? ch - '0' : transliteration.GetValueOrDefault(ch, 0);
            sum += transliterated * weights[i];
        }

        var expected = sum % 11 == 10 ? 'X' : (char)('0' + (sum % 11));
        return vin[8] == expected;
    }
}
