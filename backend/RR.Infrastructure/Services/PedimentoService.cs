using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Tramites;
using RR.Application.Interfaces;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class PedimentoService : IPedimentoService
{
    private readonly AppDbContext _db;

    public PedimentoService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<PedimentoDto>> GetAllAsync(string? search = null)
    {
        var list = await _db.Pedimentos
            .Include(p => p.Tramite)
            .ThenInclude(t => t.Cliente)
            .OrderByDescending(p => p.FechaCreacion)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.ToLower();
            list = list.Where(p => 
                p.NumeroPedimento.ToLower().Contains(search) || 
                (p.Tramite.NumeroConsecutivo?.ToLower().Contains(search) ?? false) ||
                (p.Tramite.Cliente?.Apodo?.ToLower().Contains(search) ?? false)
            ).ToList();
        }

        return list.Select(p => new PedimentoDto
        {
            Id = p.Id,
            TramiteId = p.TramiteId,
            NumeroConsecutivo = p.Tramite.NumeroConsecutivo,
            NumeroPedimento = p.NumeroPedimento,
            Tipo = p.Tipo,
            FechaEntrada = p.FechaEntrada,
            FechaPago = p.FechaPago,
            ClienteApodo = p.Tramite.Cliente?.Apodo,
            ClienteNombre = p.Tramite.Cliente?.Nombre,
            EstadoLogistico = p.EstadoLogistico,
            FechaCreacion = p.FechaCreacion
        }).ToList();
    }
}
