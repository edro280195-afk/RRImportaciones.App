using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/bancos")]
[Authorize]
public class BancosController : ControllerBase
{
    private readonly AppDbContext _db;

    public BancosController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool soloActivos = true)
    {
        var query = _db.Bancos.AsQueryable();
        if (soloActivos)
            query = query.Where(x => x.Activo);

        var bancos = await query
            .OrderByDescending(x => x.Activo)
            .ThenBy(x => x.Nombre)
            .Select(x => new BancoDto(
                x.Id,
                x.Identificador,
                x.Nombre,
                x.Titular,
                x.Cuenta,
                x.Clabe,
                x.Moneda,
                x.Notas,
                x.Activo))
            .ToListAsync();

        return Ok(bancos);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var banco = await _db.Bancos
            .Where(x => x.Id == id)
            .Select(x => new BancoDto(x.Id, x.Identificador, x.Nombre, x.Titular, x.Cuenta, x.Clabe, x.Moneda, x.Notas, x.Activo))
            .FirstOrDefaultAsync();

        return banco is null ? NotFound() : Ok(banco);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GuardarBancoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Identificador) || string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "Identificador y banco son obligatorios." });

        var identificador = request.Identificador.Trim().ToUpperInvariant();
        var existe = await _db.Bancos.AnyAsync(x => x.Identificador == identificador);
        if (existe)
            return BadRequest(new { message = "Ya existe un banco con ese identificador." });

        var banco = new Banco
        {
            Id = Guid.NewGuid(),
            Identificador = identificador,
            Nombre = request.Nombre.Trim(),
            Titular = Clean(request.Titular),
            Cuenta = Clean(request.Cuenta),
            Clabe = Clean(request.Clabe),
            Moneda = Clean(request.Moneda)?.ToUpperInvariant(),
            Notas = Clean(request.Notas),
            Activo = request.Activo,
            FechaRegistro = DateTime.UtcNow,
        };

        _db.Bancos.Add(banco);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = banco.Id }, new BancoDto(banco.Id, banco.Identificador, banco.Nombre, banco.Titular, banco.Cuenta, banco.Clabe, banco.Moneda, banco.Notas, banco.Activo));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] GuardarBancoRequest request)
    {
        var banco = await _db.Bancos.FindAsync(id);
        if (banco is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Identificador) || string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "Identificador y banco son obligatorios." });

        var identificador = request.Identificador.Trim().ToUpperInvariant();
        var existe = await _db.Bancos.AnyAsync(x => x.Id != id && x.Identificador == identificador);
        if (existe)
            return BadRequest(new { message = "Ya existe un banco con ese identificador." });

        banco.Identificador = identificador;
        banco.Nombre = request.Nombre.Trim();
        banco.Titular = Clean(request.Titular);
        banco.Cuenta = Clean(request.Cuenta);
        banco.Clabe = Clean(request.Clabe);
        banco.Moneda = Clean(request.Moneda)?.ToUpperInvariant();
        banco.Notas = Clean(request.Notas);
        banco.Activo = request.Activo;

        await _db.SaveChangesAsync();
        return Ok(new BancoDto(banco.Id, banco.Identificador, banco.Nombre, banco.Titular, banco.Cuenta, banco.Clabe, banco.Moneda, banco.Notas, banco.Activo));
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record BancoDto(Guid Id, string Identificador, string Nombre, string? Titular, string? Cuenta, string? Clabe, string? Moneda, string? Notas, bool Activo);

public class GuardarBancoRequest
{
    public string Identificador { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Titular { get; set; }
    public string? Cuenta { get; set; }
    public string? Clabe { get; set; }
    public string? Moneda { get; set; }
    public string? Notas { get; set; }
    public bool Activo { get; set; } = true;
}
