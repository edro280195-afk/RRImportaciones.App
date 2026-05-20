using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Clientes;
using RR.Application.DTOs.Common;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class ClienteService : IClienteService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public ClienteService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<ClienteListDto>> GetListAsync(string? search, string? procedencia, int page, int pageSize, string? orderBy)
    {
        var query = _db.Clientes
            .Include(c => c.Vehiculos)
            .Include(c => c.Tramites)
            .Where(c => c.DeletedAt == null)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(c =>
                c.Apodo.ToLower().Contains(term) ||
                (c.NombreCompleto != null && c.NombreCompleto.ToLower().Contains(term)) ||
                (c.Rfc != null && c.Rfc.ToLower().Contains(term)) ||
                (c.Telefono != null && c.Telefono.Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(procedencia))
            query = query.Where(c => c.Procedencia == procedencia);

        query = (orderBy?.ToLower()) switch
        {
            "apodo" => query.OrderBy(c => c.Apodo),
            "fecha" => query.OrderByDescending(c => c.FechaRegistro),
            _ => query.OrderByDescending(c => c.FechaRegistro),
        };

        var total = await query.CountAsync();

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ClienteListDto
            {
                Id = c.Id,
                Apodo = c.Apodo,
                NombreCompleto = c.NombreCompleto,
                Telefono = c.Telefono,
                Email = c.Email,
                Procedencia = c.Procedencia,
                TotalVehiculos = c.Vehiculos.Count(v => v.DeletedAt == null),
                TotalTramites = c.Tramites.Count,
                TotalFacturado = c.Tramites
                    .SelectMany(t => t.Pagos)
                    .Where(p => p.Moneda == "MXN")
                    .Sum(p => p.Monto),
                FechaRegistro = c.FechaRegistro,
            })
            .ToListAsync();

        return new PagedResult<ClienteListDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<ClienteDetailDto?> GetByIdAsync(Guid id)
    {
        return await _db.Clientes
            .Include(c => c.Vehiculos).ThenInclude(v => v.Marca)
            .Include(c => c.Vehiculos).ThenInclude(v => v.Modelo)
            .Include(c => c.Tramites.OrderByDescending(t => t.FechaCreacion).Take(5))
            .Include(c => c.Tramites).ThenInclude(t => t.Pagos)
            .Where(c => c.DeletedAt == null)
            .Select(c => new ClienteDetailDto
            {
                Id = c.Id,
                Apodo = c.Apodo,
                NombreCompleto = c.NombreCompleto,
                Telefono = c.Telefono,
                Email = c.Email,
                Procedencia = c.Procedencia,
                Notas = c.Notas,
                Rfc = c.Rfc,
                Direccion = c.Direccion,
                TotalVehiculos = c.Vehiculos.Count(v => v.DeletedAt == null),
                TotalTramites = c.Tramites.Count,
                TotalFacturado = c.Tramites.SelectMany(t => t.Pagos).Where(p => p.Moneda == "MXN").Sum(p => p.Monto),
                FechaRegistro = c.FechaRegistro,
                Vehiculos = c.Vehiculos.Where(v => v.DeletedAt == null).Select(v => new VehiculoSimpleDto
                {
                    Id = v.Id,
                    Vin = v.Vin,
                    MarcaNombre = v.Marca != null ? v.Marca.Nombre : null,
                    ModeloNombre = v.Modelo != null ? v.Modelo.Nombre : null,
                    Anno = v.Anno,
                }).ToList(),
                UltimosTramites = c.Tramites.OrderByDescending(t => t.FechaCreacion).Take(5).Select(t => new TramiteSimpleDto
                {
                    Id = t.Id,
                    NumeroConsecutivo = t.NumeroConsecutivo,
                    EstadoLogistico = t.EstadoLogistico,
                    FechaCreacion = t.FechaCreacion,
                }).ToList(),
                SaldoPendiente = c.Tramites
                    .Where(t => t.EstadoLogistico != "ENTREGADO_AL_CLIENTE" && t.EstadoLogistico != "CANCELADO")
                    .SelectMany(t => t.Pagos)
                    .Where(p => p.Moneda == "MXN")
                    .Sum(p => p.Monto),
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ClienteDetailDto> CreateAsync(CreateClienteRequest request)
    {
        var apodoExists = await _db.Clientes
            .AnyAsync(c => c.Apodo.ToLower() == request.Apodo.ToLower() && c.DeletedAt == null);

        if (apodoExists)
            throw new InvalidOperationException($"Ya existe un cliente con el apodo '{request.Apodo}'");

        var cliente = new Cliente
        {
            Id = Guid.NewGuid(),
            Apodo = request.Apodo,
            Nombre = request.Apodo,
            NombreCompleto = request.NombreCompleto,
            Rfc = request.Rfc,
            Telefono = request.Telefono,
            Email = request.Email,
            Procedencia = request.Procedencia,
            Direccion = request.Direccion,
            Notas = request.Notas,
            FechaRegistro = DateTime.UtcNow,
            Activo = true,
        };

        _db.Clientes.Add(cliente);
        await _db.SaveChangesAsync();

        return (await GetByIdAsync(cliente.Id))!;
    }

    public async Task<ClienteDetailDto> UpdateAsync(Guid id, UpdateClienteRequest request)
    {
        var cliente = await _db.Clientes
            .Where(c => c.DeletedAt == null)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException($"Cliente {id} no encontrado");

        var apodoExists = await _db.Clientes
            .AnyAsync(c => c.Id != id && c.Apodo.ToLower() == request.Apodo.ToLower() && c.DeletedAt == null);

        if (apodoExists)
            throw new InvalidOperationException($"Ya existe otro cliente con el apodo '{request.Apodo}'");

        var hasTramites = await _db.Tramites.AnyAsync(t => t.ClienteId == id);
        if (hasTramites && cliente.Apodo != request.Apodo)
            throw new InvalidOperationException("No se puede cambiar el apodo de un cliente con trámites activos");

        cliente.Apodo = request.Apodo;
        cliente.Nombre = request.Apodo;
        cliente.NombreCompleto = request.NombreCompleto;
        cliente.Rfc = request.Rfc;
        cliente.Telefono = request.Telefono;
        cliente.Email = request.Email;
        cliente.Procedencia = request.Procedencia;
        cliente.Direccion = request.Direccion;
        cliente.Notas = request.Notas;

        await _db.SaveChangesAsync();

        return (await GetByIdAsync(id))!;
    }

    public async Task DeleteAsync(Guid id)
    {
        var cliente = await _db.Clientes
            .Where(c => c.DeletedAt == null)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException($"Cliente {id} no encontrado");

        cliente.DeletedAt = DateTime.UtcNow;
        cliente.Activo = false;
        await _db.SaveChangesAsync();
    }

    public async Task<IEnumerable<ClienteListDto>> SearchAutocompleteAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return [];

        var term = query.ToLower();
        return await _db.Clientes
            .Where(c => c.DeletedAt == null)
            .Where(c => c.Apodo.ToLower().Contains(term) || (c.NombreCompleto != null && c.NombreCompleto.ToLower().Contains(term)))
            .OrderBy(c => c.Apodo)
            .Take(20)
            .Select(c => new ClienteListDto
            {
                Id = c.Id,
                Apodo = c.Apodo,
                NombreCompleto = c.NombreCompleto,
                Telefono = c.Telefono,
                Email = c.Email,
                Procedencia = c.Procedencia,
                FechaRegistro = c.FechaRegistro,
            })
            .ToListAsync();
    }
}
