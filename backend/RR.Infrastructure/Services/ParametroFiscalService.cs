using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Cotizaciones;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Infrastructure.Services;

public class ParametroFiscalService : IParametroFiscalService
{
    private readonly AppDbContext _db;

    public ParametroFiscalService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ParametroFiscalDto>> GetAllAsync()
    {
        return await _db.ParametrosFiscales
            .OrderBy(x => x.Regimen)
            .ThenByDescending(x => x.VigenteDesde)
            .Select(x => ToDto(x))
            .ToListAsync();
    }

    public async Task<ParametroFiscalDto> UpdateAsync(string regimen, UpdateParametroFiscalRequest request)
    {
        regimen = regimen.Trim().ToUpperInvariant();
        var rawDesde = request.VigenteDesde ?? DateTime.UtcNow;
        var desde = DateTime.SpecifyKind(rawDesde.Date, DateTimeKind.Utc);

        var current = await _db.ParametrosFiscales
            .Where(x => x.Regimen == regimen && x.Activo)
            .OrderByDescending(x => x.VigenteDesde)
            .FirstOrDefaultAsync();

        if (current is not null)
        {
            current.Activo = false;
            current.VigenteHasta = desde.AddDays(-1);
        }

        var nuevo = new ParametroFiscal
        {
            Id = Guid.NewGuid(),
            Regimen = regimen,
            Descripcion = regimen == "POST_2017"
                ? "Vehículos modelo 2017 en adelante"
                : "Vehículos modelo 2016 y anteriores",
            Igi = request.IgiPorcentaje,
            Dta = request.DtaPorcentaje,
            DtaFijo = request.DtaFijo,
            Iva = request.IvaPorcentaje,
            PrevFijo = request.PrevFijo,
            PrvFijo = request.PrvFijo,
            VigenteDesde = desde,
            Activo = true,
        };

        _db.ParametrosFiscales.Add(nuevo);
        await _db.SaveChangesAsync();
        return ToDto(nuevo);
    }

    private static ParametroFiscalDto ToDto(ParametroFiscal x)
    {
        return new ParametroFiscalDto
        {
            Id = x.Id,
            Regimen = x.Regimen,
            Descripcion = x.Descripcion,
            IgiPorcentaje = x.Igi,
            DtaPorcentaje = x.Dta,
            DtaFijo = x.DtaFijo,
            IvaPorcentaje = x.Iva,
            PrevFijo = x.PrevFijo,
            PrvFijo = x.PrvFijo,
            VigenteDesde = x.VigenteDesde,
            VigenteHasta = x.VigenteHasta,
            Activo = x.Activo,
        };
    }
}
