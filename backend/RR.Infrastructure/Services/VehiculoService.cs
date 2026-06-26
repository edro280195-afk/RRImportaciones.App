using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Clientes;
using RR.Application.DTOs.Common;
using RR.Application.DTOs.Vehiculos;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;
using System.Text.Json;

namespace RR.Infrastructure.Services;

public class VehiculoService : IVehiculoService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ITenantContext _tenantContext;

    public VehiculoService(AppDbContext db, ICurrentUserService currentUser, ITenantContext tenantContext)
    {
        _db = db;
        _currentUser = currentUser;
        _tenantContext = tenantContext;
    }

    public async Task<PagedResult<VehiculoListDto>> GetListAsync(string? search, Guid? clienteId, string? clienteNombre, Guid? marcaId, int? annoMin, int? annoMax, bool? enPatio, string? estado, string? orderBy, string? orderDir, int page = 1, int pageSize = 20)
    {
        var query = BuildListQuery(search, clienteId, clienteNombre, marcaId, annoMin, annoMax, enPatio, estado);

        var total = await query.CountAsync();

        query = ApplySorting(query, orderBy, orderDir);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(v => new VehiculoListDto
            {
                Id = v.Id,
                Vin = v.Vin,
                VinCorto = v.VinCorto,
                MarcaNombre = v.Marca != null ? v.Marca.Nombre : null,
                ModeloNombre = v.Modelo != null ? v.Modelo.Nombre : null,
                Anno = v.Anno,
                ClienteApodo = v.Cliente.Apodo,
                FechaIngresoPatio = v.FechaIngresoPatio,
                UbicacionActual = v.UbicacionActual,
                TieneTramiteActivo = v.Tramites.Any(t => t.EstadoLogistico != "ENTREGADO_AL_CLIENTE" && t.EstadoLogistico != "CANCELADO"),
                CumplioRequisitos = v.CumplioRequisitos,
                TieneSelloAduanal = v.TieneSelloAduanal,
                Estado = v.Estado,
                FotosUrls = v.FotosUrls
            })
            .ToListAsync();

        await MergeCampoFotosAsync(items);

        return new PagedResult<VehiculoListDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    private IQueryable<Vehiculo> BuildListQuery(string? search, Guid? clienteId, string? clienteNombre, Guid? marcaId, int? annoMin, int? annoMax, bool? enPatio, string? estado)
    {
        var query = _db.Vehiculos
            .Include(v => v.Cliente)
            .Include(v => v.Marca)
            .Include(v => v.Modelo)
            .Include(v => v.Tramites)
            .Where(v => v.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(v =>
                v.Vin.ToLower().Contains(term) ||
                (v.VinCorto != null && v.VinCorto.ToLower().Contains(term)) ||
                (v.Marca != null && v.Marca.Nombre.ToLower().Contains(term)) ||
                (v.Modelo != null && v.Modelo.Nombre.ToLower().Contains(term)) ||
                (v.Cliente != null && v.Cliente.Apodo.ToLower().Contains(term)));
        }

        if (clienteId.HasValue)
            query = query.Where(v => v.ClienteId == clienteId.Value);

        if (!string.IsNullOrWhiteSpace(clienteNombre))
        {
            var term = clienteNombre.ToLower();
            query = query.Where(v => v.Cliente.Apodo.ToLower().Contains(term));
        }

        if (marcaId.HasValue)
            query = query.Where(v => v.MarcaId == marcaId.Value);

        if (annoMin.HasValue)
            query = query.Where(v => v.Anno >= annoMin.Value);

        if (annoMax.HasValue)
            query = query.Where(v => v.Anno <= annoMax.Value);

        if (enPatio.HasValue)
            query = enPatio.Value
                ? query.Where(v => v.FechaIngresoPatio != null)
                : query.Where(v => v.FechaIngresoPatio == null);

        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(v => v.Estado == estado);

        return query;
    }

    private static IQueryable<Vehiculo> ApplySorting(IQueryable<Vehiculo> query, string? orderBy, string? orderDir)
    {
        var descending = string.Equals(orderDir, "desc", StringComparison.OrdinalIgnoreCase);

        return (orderBy?.ToLower()) switch
        {
            "vin" => descending ? query.OrderByDescending(v => v.Vin) : query.OrderBy(v => v.Vin),
            "marca" => descending
                ? query.OrderByDescending(v => v.Marca != null ? v.Marca.Nombre : "")
                : query.OrderBy(v => v.Marca != null ? v.Marca.Nombre : ""),
            "modelo" => descending
                ? query.OrderByDescending(v => v.Modelo != null ? v.Modelo.Nombre : "")
                : query.OrderBy(v => v.Modelo != null ? v.Modelo.Nombre : ""),
            "anno" => descending ? query.OrderByDescending(v => v.Anno) : query.OrderBy(v => v.Anno),
            "cliente" => descending
                ? query.OrderByDescending(v => v.Cliente != null ? v.Cliente.Apodo : "")
                : query.OrderBy(v => v.Cliente != null ? v.Cliente.Apodo : ""),
            "ubicacion" => descending
                ? query.OrderByDescending(v => v.UbicacionActual ?? "")
                : query.OrderBy(v => v.UbicacionActual ?? ""),
            "ingreso" => descending
                ? query.OrderByDescending(v => v.FechaIngresoPatio ?? v.FechaRegistro)
                : query.OrderBy(v => v.FechaIngresoPatio ?? v.FechaRegistro),
            _ => query.OrderByDescending(v => v.FechaIngresoPatio ?? v.FechaRegistro),
        };
    }

    public async Task<VehiculoDetailDto?> GetByIdAsync(Guid id)
    {
        var vehiculo = await _db.Vehiculos
            .Include(v => v.Cliente)
            .Include(v => v.Marca)
            .Include(v => v.Modelo)
            .Include(v => v.FraccionArancelaria)
            .Include(v => v.Tramites.OrderByDescending(t => t.FechaCreacion).Take(10))
            .Where(v => v.Id == id && v.DeletedAt == null)
            .Select(v => new VehiculoDetailDto
            {
                Id = v.Id,
                Vin = v.Vin,
                VinCorto = v.VinCorto,
                MarcaNombre = v.Marca != null ? v.Marca.Nombre : null,
                ModeloNombre = v.Modelo != null ? v.Modelo.Nombre : null,
                Anno = v.Anno,
                ClienteApodo = v.Cliente.Apodo,
                FechaIngresoPatio = v.FechaIngresoPatio,
                UbicacionActual = v.UbicacionActual,
                TieneTramiteActivo = v.Tramites.Any(t => t.EstadoLogistico != "ENTREGADO_AL_CLIENTE" && t.EstadoLogistico != "CANCELADO"),
                CumplioRequisitos = v.CumplioRequisitos,
                TieneSelloAduanal = v.TieneSelloAduanal,
                Estado = v.Estado,
                FotosUrls = v.FotosUrls,
                CilindradaCm3 = v.CilindradaCm3,
                Categoria = v.Categoria,
                FraccionArancelaria = v.FraccionArancelaria != null ? v.FraccionArancelaria.Fraccion : null,
                Color = v.Color,
                NumMotor = v.NumMotor,
                ValorFactura = v.ValorFactura,
                Moneda = v.Moneda,
                FechaRegistro = v.FechaRegistro,
                HistorialTramites = v.Tramites.OrderByDescending(t => t.FechaCreacion).Take(10).Select(t => new TramiteSimpleDto
                {
                    Id = t.Id,
                    NumeroConsecutivo = t.NumeroConsecutivo,
                    EstadoLogistico = t.EstadoLogistico,
                    FechaCreacion = t.FechaCreacion,
                }).ToList(),
            })
            .FirstOrDefaultAsync();

        if (vehiculo != null)
            await MergeCampoFotosAsync([vehiculo]);

        return vehiculo;
    }

    public async Task<VehiculoDetailDto> CreateAsync(CreateVehiculoRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Vin))
        {
            var vinExists = await _db.Vehiculos
                .AnyAsync(v => v.Vin == request.Vin && v.DeletedAt == null);
            if (vinExists)
                throw new InvalidOperationException($"Ya existe un vehículo con el VIN '{request.Vin}'");
        }

        var _ = await _db.Clientes
            .FirstOrDefaultAsync(c => c.Id == request.ClienteId && c.DeletedAt == null)
            ?? throw new KeyNotFoundException($"Cliente {request.ClienteId} no encontrado");

        var fraccionId = await AutoClassifyFraccionAsync(request.Categoria, request.CilindradaCm3);

        Guid? modeloId = null;
        if (!string.IsNullOrWhiteSpace(request.Modelo))
        {
            modeloId = await ResolveModeloId(request.MarcaId, request.Modelo);
        }

        var vin = request.Vin ?? string.Empty;
        var vehiculo = new Vehiculo
        {
            Id = Guid.NewGuid(),
            ClienteId = request.ClienteId,
            Vin = vin,
            VinCorto = !string.IsNullOrWhiteSpace(vin) && vin.Length >= 6 ? vin[^6..] : null,
            MarcaId = request.MarcaId,
            ModeloId = modeloId,
            Anno = request.Anno,
            CilindradaCm3 = request.CilindradaCm3,
            Categoria = request.Categoria,
            Color = request.Color,
            ValorFactura = request.ValorFactura,
            Moneda = request.Moneda,
            NumMotor = request.NumMotor,
            NumSerie = request.NumSerie,
            FechaIngresoPatio = request.FechaIngresoPatio,
            UbicacionActual = request.UbicacionActual,
            CumplioRequisitos = request.CumplioRequisitos,
            TieneSelloAduanal = request.TieneSelloAduanal,
            FraccionArancelariaId = fraccionId,
            FechaRegistro = DateTime.UtcNow,
        };

        _db.Vehiculos.Add(vehiculo);
        await _db.SaveChangesAsync();

        return (await GetByIdAsync(vehiculo.Id))!;
    }

    public async Task<VehiculoDetailDto> UpdateAsync(Guid id, CreateVehiculoRequest request)
    {
        var vehiculo = await _db.Vehiculos
            .Where(v => v.DeletedAt == null)
            .FirstOrDefaultAsync(v => v.Id == id)
            ?? throw new KeyNotFoundException($"Vehículo {id} no encontrado");

        if (!string.IsNullOrWhiteSpace(request.Vin) && request.Vin != vehiculo.Vin)
        {
            var vinExists = await _db.Vehiculos
                .AnyAsync(v => v.Vin == request.Vin && v.Id != id && v.DeletedAt == null);
            if (vinExists)
                throw new InvalidOperationException($"Ya existe otro vehículo con el VIN '{request.Vin}'");
        }

        var oldClienteId = vehiculo.ClienteId;

        if (request.ClienteId != vehiculo.ClienteId)
        {
            var _ = await _db.Clientes
                .FirstOrDefaultAsync(c => c.Id == request.ClienteId && c.DeletedAt == null)
                ?? throw new KeyNotFoundException($"Cliente {request.ClienteId} no encontrado");
        }

        var fraccionId = await AutoClassifyFraccionAsync(request.Categoria, request.CilindradaCm3);

        Guid? modeloId = vehiculo.ModeloId;
        if (!string.IsNullOrWhiteSpace(request.Modelo))
        {
            modeloId = await ResolveModeloId(request.MarcaId, request.Modelo);
        }

        var vin = request.Vin ?? vehiculo.Vin;
        vehiculo.ClienteId = request.ClienteId;
        vehiculo.Vin = vin;
        vehiculo.VinCorto = vin.Length >= 6 ? vin[^6..] : null;
        vehiculo.MarcaId = request.MarcaId;
        vehiculo.ModeloId = modeloId;
        vehiculo.Anno = request.Anno;
        vehiculo.CilindradaCm3 = request.CilindradaCm3;
        vehiculo.Categoria = request.Categoria;
        vehiculo.Color = request.Color;
        vehiculo.ValorFactura = request.ValorFactura;
        vehiculo.Moneda = request.Moneda;
        vehiculo.NumMotor = request.NumMotor;
        vehiculo.NumSerie = request.NumSerie;
        vehiculo.FechaIngresoPatio = request.FechaIngresoPatio;
        vehiculo.UbicacionActual = request.UbicacionActual;
        vehiculo.CumplioRequisitos = request.CumplioRequisitos;
        vehiculo.TieneSelloAduanal = request.TieneSelloAduanal;
        vehiculo.FraccionArancelariaId = fraccionId;

        await _db.SaveChangesAsync();

        if (oldClienteId != request.ClienteId)
        {
            _db.AuditoriaLogs.Add(new AuditoriaLog
            {
                Id = Guid.NewGuid(),
                TenantId = _tenantContext.TenantId,
                Accion = "VEHICULO_CAMBIO_CLIENTE",
                Entidad = "Vehiculo",
                EntidadId = id.ToString(),
                UsuarioId = _currentUser.UserId,
                ValoresAnteriores = JsonSerializer.Serialize(new { ClienteId = oldClienteId }),
                ValoresNuevos = JsonSerializer.Serialize(new { ClienteId = request.ClienteId }),
                Fecha = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
        }

        return (await GetByIdAsync(id))!;
    }

    public async Task DeleteAsync(Guid id)
    {
        var vehiculo = await _db.Vehiculos
            .Where(v => v.DeletedAt == null)
            .FirstOrDefaultAsync(v => v.Id == id)
            ?? throw new KeyNotFoundException($"Vehículo {id} no encontrado");

        vehiculo.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task UpdateInventarioAsync(Guid id, UpdateInventarioRequest request)
    {
        var vehiculo = await _db.Vehiculos
            .Where(v => v.DeletedAt == null)
            .FirstOrDefaultAsync(v => v.Id == id)
            ?? throw new KeyNotFoundException($"Vehículo {id} no encontrado");

        vehiculo.UbicacionActual = request.UbicacionActual ?? vehiculo.UbicacionActual;
        vehiculo.CumplioRequisitos = request.CumplioRequisitos;
        vehiculo.TieneSelloAduanal = request.TieneSelloAduanal;
        vehiculo.FechaPedimentoProforma = request.FechaPedimentoProforma;

        await _db.SaveChangesAsync();
    }

    public async Task<IEnumerable<VehiculoListDto>> GetInventarioActualAsync()
    {
        var items = await _db.Vehiculos
            .Include(v => v.Cliente)
            .Include(v => v.Marca)
            .Include(v => v.Modelo)
            .Include(v => v.Tramites)
            .Where(v => v.DeletedAt == null && v.FechaIngresoPatio != null)
            .OrderByDescending(v => v.FechaIngresoPatio)
            .Select(v => new VehiculoListDto
            {
                Id = v.Id,
                Vin = v.Vin,
                VinCorto = v.VinCorto,
                MarcaNombre = v.Marca != null ? v.Marca.Nombre : null,
                ModeloNombre = v.Modelo != null ? v.Modelo.Nombre : null,
                Anno = v.Anno,
                ClienteApodo = v.Cliente.Apodo,
                FechaIngresoPatio = v.FechaIngresoPatio,
                UbicacionActual = v.UbicacionActual,
                TieneTramiteActivo = v.Tramites.Any(t => t.EstadoLogistico != "ENTREGADO_AL_CLIENTE" && t.EstadoLogistico != "CANCELADO"),
                CumplioRequisitos = v.CumplioRequisitos,
                TieneSelloAduanal = v.TieneSelloAduanal,
                Estado = v.Estado,
                FotosUrls = v.FotosUrls
            })
            .ToListAsync();

        await MergeCampoFotosAsync(items);
        return items;
    }

    private async Task MergeCampoFotosAsync(IReadOnlyCollection<VehiculoListDto> vehiculos)
    {
        if (vehiculos.Count == 0)
            return;

        var vehiculoIds = vehiculos.Select(v => v.Id).ToArray();

        var fotosDirectas = await _db.TareasCampo
            .Where(t => t.VehiculoId.HasValue && vehiculoIds.Contains(t.VehiculoId.Value) && t.FotosUrls.Length > 0)
            .Select(t => new { VehiculoId = t.VehiculoId!.Value, t.FotosUrls })
            .ToListAsync();

        var fotosPorTramite = await _db.TareasCampo
            .Where(t => t.Tramite != null
                     && t.Tramite.VehiculoId.HasValue
                     && vehiculoIds.Contains(t.Tramite.VehiculoId.Value)
                     && t.FotosUrls.Length > 0)
            .Select(t => new { VehiculoId = t.Tramite!.VehiculoId!.Value, t.FotosUrls })
            .ToListAsync();

        var fotosPorVehiculo = fotosDirectas
            .Concat(fotosPorTramite)
            .GroupBy(x => x.VehiculoId)
            .ToDictionary(
                g => g.Key,
                g => g.SelectMany(x => x.FotosUrls ?? Array.Empty<string>())
                    .Where(url => !string.IsNullOrWhiteSpace(url))
                    .Distinct(StringComparer.Ordinal)
                    .ToArray());

        foreach (var vehiculo in vehiculos)
        {
            if (!fotosPorVehiculo.TryGetValue(vehiculo.Id, out var fotosCampo))
                continue;

            var fotos = (vehiculo.FotosUrls ?? Array.Empty<string>()).ToList();
            var existentes = new HashSet<string>(fotos, StringComparer.Ordinal);
            foreach (var foto in fotosCampo)
            {
                if (existentes.Add(foto))
                    fotos.Add(foto);
            }

            vehiculo.FotosUrls = fotos.ToArray();
        }
    }

    private async Task<Guid?> AutoClassifyFraccionAsync(string? categoria, int? cilindradaCm3)
    {
        string? fraccionStr = categoria?.ToUpper() switch
        {
            "MOTO" => cilindradaCm3 < 250 ? "8711.20" : null,
            "AUTOMOVIL" or null => cilindradaCm3 switch
            {
                <= 2000 => "8703.23.02",
                > 2000 => "8703.24.02",
                _ => "8703.23.02",
            },
            "CAMIONETA" => "8704.21.04",
            "CAMION" => cilindradaCm3 > 5000 ? "8701.21.01" : "8704.21.04",
            "TRACTOR" => "8701.21.01",
            _ => null,
        };

        if (fraccionStr == null) return null;

        var fraccion = await _db.FraccionesArancelarias
            .FirstOrDefaultAsync(f => f.Fraccion == fraccionStr && f.Activo);

        return fraccion?.Id;
    }

    private async Task<Guid?> ResolveModeloId(Guid marcaId, string modeloNombre)
    {
        var modelo = await _db.Modelos
            .FirstOrDefaultAsync(m => m.MarcaId == marcaId && m.Nombre.ToLower() == modeloNombre.ToLower());

        if (modelo != null) return modelo.Id;

        modelo = new Modelo
        {
            Id = Guid.NewGuid(),
            MarcaId = marcaId,
            Nombre = modeloNombre,
        };
        _db.Modelos.Add(modelo);
        await _db.SaveChangesAsync();

        return modelo.Id;
    }
}
