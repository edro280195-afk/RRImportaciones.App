using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RR.Application.DTOs.Campo;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using System.Net.Http.Json;

namespace RR.Infrastructure.Services;

public class CampoService : ICampoService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IRealtimeNotifier _realtime;
    private readonly IEmailService _email;
    private readonly IConfiguration _configuration;

    public CampoService(
        AppDbContext db,
        ICurrentUserService currentUser,
        IRealtimeNotifier realtime,
        IEmailService email,
        IConfiguration configuration)
    {
        _db = db;
        _currentUser = currentUser;
        _realtime = realtime;
        _email = email;
        _configuration = configuration;
    }

    public async Task<List<TareaCampoDto>> GetTareasAsync(string? EstadoLogistico)
    {
        var query = _db.TareasCampo
            .Include(t => t.Tramite!).ThenInclude(t => t.Cliente)
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Marca)
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Modelo)
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
            .GroupBy(t => new { t.TramiteId, t.Tipo })
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
        Guid? vehiculoId = null;

        if (!string.IsNullOrWhiteSpace(request.Vin))
        {
            var vehiculo = new Vehiculo
            {
                Id = Guid.NewGuid(),
                Vin = request.Vin.ToUpperInvariant(),
                VinCorto = request.Vin.Length >= 6 ? request.Vin.Substring(request.Vin.Length - 6) : null,
                MarcaId = request.MarcaId,
                ModeloId = request.ModeloId,
                Anno = request.Anno,
                Estado = "PENDIENTE_DE_TRAMITE",
                UbicacionActual = request.Ubicacion,
                FechaRegistro = DateTime.UtcNow
            };
            _db.Vehiculos.Add(vehiculo);
            vehiculoId = vehiculo.Id;
        }

        var tarea = new TareaCampo
        {
            Id = Guid.NewGuid(),
            TramiteId = null,
            VehiculoId = vehiculoId,
            Tipo = "PRE_INSPECCION",
            EstadoLogistico = "ABIERTA",
            Ubicacion = request.Ubicacion,
            DescripcionVehiculo = request.DescripcionVehiculo,
            ClienteNombreLibre = request.ClienteNombreLibre,
            Incidencia = request.NotasInternas,
            FechaCreacion = DateTime.UtcNow,
            CreadoPor = _currentUser.UserId ?? Guid.Empty,
        };

        _db.TareasCampo.Add(tarea);
        await _db.SaveChangesAsync();
        await _realtime.CampoActualizadoAsync(tarea.Id, null, "CREADA");

        return (await GetById(tarea.Id))!;
    }

    public async Task<TareaCampoDto> VincularTramiteAsync(Guid id, VincularPreInspeccionRequest request)
    {
        var tarea = await _db.TareasCampo.FindAsync(id)
            ?? throw new KeyNotFoundException("Tarea de campo no encontrada");

        if (tarea.Tipo != "PRE_INSPECCION")
            throw new InvalidOperationException("Solo se pueden vincular pre-inspecciones");

        var tramite = await _db.Tramites.FindAsync(request.TramiteId)
            ?? throw new KeyNotFoundException("Trámite no encontrado");

        tarea.TramiteId = request.TramiteId;
        tarea.Tipo = "FOTOS_YARDA";
        await MoveEstadoIfAllowed(tramite, "FOTOS_SOLICITADAS", "Pre-inspección de campo vinculada al trámite.");
        await _db.SaveChangesAsync();
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
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Marca)
            .Include(t => t.Tramite!).ThenInclude(t => t.Vehiculo).ThenInclude(v => v.Modelo)
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
        return new TareaCampoDto
        {
            Id = t.Id,
            TramiteId = t.TramiteId,
            NumeroConsecutivo = t.Tramite?.NumeroConsecutivo,
            ClienteNombre = t.Tramite?.Cliente != null ? FirstNotEmpty(t.Tramite.Cliente.NombreCompleto, t.Tramite.Cliente.Nombre, t.Tramite.Cliente.Apodo) : null,
            VehiculoResumen = t.Tramite != null ? BuildVehiculoResumen(t.Tramite) : (t.DescripcionVehiculo ?? "Pre-inspección"),
            DescripcionVehiculo = t.DescripcionVehiculo,
            ClienteNombreLibre = t.ClienteNombreLibre,
            Vin = t.Tramite?.Vehiculo?.Vin,
            VinCorto = t.Tramite?.Vehiculo?.VinCorto,
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
            return tramite.DescripcionMercancia ?? "Unidad sin descripción";

        return string.Join(" ", new[]
        {
            tramite.Vehiculo.Marca?.Nombre,
            tramite.Vehiculo.Modelo?.Nombre,
            tramite.Vehiculo.Anno?.ToString(),
        }.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static string FirstNotEmpty(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? string.Empty;

    private static string? BuildUsuarioNombre(User? user)
    {
        if (user is null) return null;
        return string.Join(" ", new[] { user.Nombre, user.Apellidos }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
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
                        new { text = "Extrae el VIN (Vehicle Identification Number) de 17 caracteres alfanuméricos de esta imagen. Responde ÚNICAMENTE con los 17 caracteres del VIN en mayúsculas, sin texto adicional. Si no encuentras ningún VIN válido, responde 'NO_ENCONTRADO'." },
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

        // Clean up text to match just alphanumeric
        text = new string(text.Where(char.IsLetterOrDigit).ToArray()).ToUpper();
        if (text.Length > 17) text = text.Substring(0, 17);

        return new ExtractVinResponse { Vin = text };
    }
}
