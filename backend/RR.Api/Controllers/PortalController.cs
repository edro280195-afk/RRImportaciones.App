using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using RR.Application.DTOs.Portal;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Data;

namespace RR.Api.Controllers;

[ApiController]
[Route("api/portal")]
public class PortalController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPortalAccessService _portalAccess;
    private readonly ILogger<PortalController> _logger;

    public PortalController(AppDbContext db, IPortalAccessService portalAccess, ILogger<PortalController> logger)
    {
        _db = db;
        _portalAccess = portalAccess;
        _logger = logger;
    }

    [HttpGet("acceso/{token}")]
    [AllowAnonymous]
    [EnableRateLimiting("Portal")]
    public async Task<IActionResult> GetTramite(string token)
    {
        var tramiteId = _portalAccess.ValidateToken(token);
        if (tramiteId == null)
        {
            _logger.LogWarning("Intento de acceso con token inválido desde {IP}", HttpContext.Connection.RemoteIpAddress);
            return NotFound(new { message = "El enlace no es válido o ha expirado." });
        }

        var tramite = await _db.Tramites
            .IgnoreQueryFilters()
            .Include(t => t.Cliente)
            .Include(t => t.Vehiculo).ThenInclude(v => v.Marca)
            .Include(t => t.Vehiculo).ThenInclude(v => v.Modelo)
            .Include(t => t.Aduana)
            .Include(t => t.Eventos)
            .Include(t => t.Pagos)
            .Include(t => t.GastosHormiga).ThenInclude(g => g.TipoGasto)
            .Include(t => t.Pedimentos)
            .Include(t => t.Documentos)
            .Include(t => t.Entregas)
            .FirstOrDefaultAsync(t => t.Id == tramiteId);

        if (tramite == null)
            return NotFound(new { message = "El enlace no es válido o ha expirado." });

        _db.AuditoriaLogs.Add(new AuditoriaLog
        {
            Id = Guid.NewGuid(),
            TenantId = tramite.TenantId,
            Accion = "PORTAL_ACCESS",
            Entidad = "Tramite",
            EntidadId = tramite.Id.ToString(),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            Fecha = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var total = tramite.CobroTotal
            + tramite.CargoExpress
            + tramite.GastosHormiga
                .Where(g => g.SeCargaAlCliente)
                .Sum(g => g.Moneda == "USD" ? g.Monto * (g.GastoUsd ?? 0m) : g.Monto);

        var pagado = tramite.Pagos
            .Where(p => p.Verificado && p.DeletedAt == null && p.PagadoPor != "RR")
            .Sum(ConvertPagoToMxn);

        var cubiertoPorRr = tramite.Pagos
            .Where(p => p.Verificado && p.DeletedAt == null && p.PagadoPor == "RR" && p.SeCobraAlCliente)
            .Sum(ConvertPagoToMxn);

        var pendienteVerificacion = tramite.Pagos
            .Where(p => !p.Verificado && p.DeletedAt == null && p.PagadoPor != "RR")
            .Sum(ConvertPagoToMxn);

        var timeline = BuildTimeline(tramite.Eventos, tramite.EstadoLogistico);
        var documentos = BuildDocumentos(tramite.Pedimentos, tramite.Pagos, tramite.Documentos);

        var dto = new PortalTramiteDto
        {
            Id = tramite.Id,
            NumeroConsecutivo = tramite.NumeroConsecutivo,
            EstadoLogistico = tramite.EstadoLogistico,
            EstatusCliente = EstadoCliente(tramite.EstadoLogistico),
            EstatusDescripcion = EstadoDescripcion(tramite.EstadoLogistico),
            Progreso = EstadoProgreso(tramite.EstadoLogistico),
            FechaCreacion = tramite.FechaCreacion,
            FechaEstadoActual = tramite.FechaEstadoActual,
            ClienteNombre = FirstNotEmpty(tramite.Cliente?.NombreCompleto, tramite.Cliente?.Nombre, tramite.Cliente?.Apodo, "Cliente"),
            VehiculoResumen = BuildVehiculoResumen(tramite),
            VehiculoVinCorto = tramite.Vehiculo?.VinCorto,
            VehiculoMarca = tramite.Vehiculo?.Marca?.Nombre,
            VehiculoModelo = tramite.Vehiculo?.Modelo?.Nombre,
            VehiculoAnno = tramite.Vehiculo?.Anno,
            VehiculoVin = tramite.Vehiculo?.Vin,
            AduanaNombre = tramite.Aduana?.Nombre,
            TipoTramite = tramite.TipoTramite,
            PagosResumen = new PortalMoneySummaryDto
            {
                Total = total,
                Pagado = pagado,
                Pendiente = Math.Max(total - pagado, 0m),
                PendienteVerificacion = pendienteVerificacion,
                CubiertoPorRr = cubiertoPorRr,
            },
            Timeline = timeline,
            Pagos = tramite.Pagos
                .Where(p => p.DeletedAt == null)
                .OrderByDescending(p => p.FechaPago)
                .Select(p => new PortalPagoDto
                {
                    Id = p.Id,
                    Monto = p.Monto,
                    Moneda = p.Moneda,
                    Metodo = p.Metodo,
                    Banco = p.Banco,
                    Referencia = p.Referencia,
                    FechaPago = p.FechaPago,
                    Verificado = p.Verificado,
                })
                .ToList(),
            Documentos = documentos,
            Entrega = tramite.Entregas.OrderByDescending(e => e.FechaEntrega).Select(e => new PortalEntregaDto
            {
                Fecha = e.FechaEntrega,
                Ubicacion = e.UbicacionEntrega ?? "Yarda R&R",
                NombreRecibe = e.NombreRecibe ?? "Cliente",
                DocumentosEntregados = e.DocumentosEntregados ?? [],
                FotoEvidenciaUrl = e.FotoEvidenciaUrl,
                FirmaBase64 = e.FirmaBase64,
            }).FirstOrDefault(),
        };

        return Ok(dto);
    }

    [HttpGet("generar-token/{tramiteId:guid}")]
    [Authorize]
    public IActionResult GenerarToken(Guid tramiteId)
    {
        var token = _portalAccess.GenerateToken(tramiteId);
        return Ok(new { token });
    }

    private static List<PortalTimelineItemDto> BuildTimeline(IEnumerable<RR.Domain.Entities.Evento> eventos, string estatusActual)
    {
        var safeEvents = eventos
            .Where(e => e.Tipo != "NOTA")
            .OrderBy(e => e.FechaEvento)
            .Select(e => new PortalTimelineItemDto
            {
                Id = e.Id,
                Tipo = e.Tipo,
                Titulo = TimelineTitle(e),
                Descripcion = TimelineDescription(e),
                Fecha = e.FechaEvento,
                FotoUrl = e.FotoUrl,
                Completado = true,
            })
            .ToList();

        if (safeEvents.Count == 0)
        {
            safeEvents.Add(new PortalTimelineItemDto
            {
                Id = Guid.NewGuid(),
                Tipo = "CREACION",
                Titulo = "Trámite recibido",
                Descripcion = "R&R ya tiene registrado tu trámite y está preparando el seguimiento.",
                Fecha = DateTime.UtcNow,
                Completado = true,
            });
        }

        if (estatusActual is not ("ENTREGADO_AL_CLIENTE" or "CANCELADO"))
        {
            safeEvents.Add(new PortalTimelineItemDto
            {
                Id = Guid.NewGuid(),
                Tipo = "SIGUIENTE",
                Titulo = "Siguiente actualización",
                Descripcion = NextStepDescription(estatusActual),
                Fecha = DateTime.UtcNow,
                Completado = false,
            });
        }

        return safeEvents;
    }

    private static List<PortalDocumentoDto> BuildDocumentos(IEnumerable<RR.Domain.Entities.Pedimento> pedimentos, IEnumerable<RR.Domain.Entities.Pago> pagos, IEnumerable<RR.Domain.Entities.TramiteDocumento> documentosTramite)
    {
        var pedimentoPdfDoc = documentosTramite
            .FirstOrDefault(d => d.TipoDocumento == "PEDIMENTO_PDF" && d.EstadoLogistico is "RECIBIDO" or "VALIDADO" && !string.IsNullOrWhiteSpace(d.ArchivoUrl));

        var hasPedimentos = pedimentos.Any();

        var documentos = documentosTramite
            .Where(d => d.EstadoLogistico is "RECIBIDO" or "VALIDADO" && !string.IsNullOrWhiteSpace(d.ArchivoUrl))
            // If we have pedimento records, we will display the PDF linked to the pedimento record itself, so exclude it here to avoid duplication
            .Where(d => !hasPedimentos || d.TipoDocumento != "PEDIMENTO_PDF")
            .OrderByDescending(d => d.FechaRecibido ?? d.FechaCreacion)
            .Select(d => new PortalDocumentoDto
            {
                Tipo = d.TipoDocumento,
                Titulo = d.Nombre,
                Url = d.ArchivoUrl,
                Fecha = d.FechaRecibido ?? d.FechaCreacion,
            })
            .ToList();

        documentos.AddRange(documentosTramite
            .Where(d => d.EsRequerido && d.EstadoLogistico == "PENDIENTE")
            // If we have pedimento records, we will display it in the pedimentos section, so we don't need a pending "Pedimento PDF" item
            .Where(d => !hasPedimentos || d.TipoDocumento != "PEDIMENTO_PDF")
            .OrderBy(d => d.TipoDocumento)
            .Select(d => new PortalDocumentoDto
            {
                Tipo = d.TipoDocumento,
                Titulo = $"{d.Nombre} pendiente",
                Fecha = null,
            }));

        var originalPed = pedimentos.FirstOrDefault(p => p.Tipo == "ORIGINAL") ?? pedimentos.FirstOrDefault();

        documentos.AddRange(pedimentos
            .OrderByDescending(p => p.FechaEntrada ?? p.FechaCreacion)
            .Select(p => {
                string? url = null;
                if (p.Id == originalPed?.Id && pedimentoPdfDoc != null)
                {
                    url = pedimentoPdfDoc.ArchivoUrl;
                }

                return new PortalDocumentoDto
                {
                    Tipo = "PEDIMENTO",
                    Titulo = $"Pedimento {p.Tipo}: {p.NumeroPedimento}",
                    Url = url,
                    Fecha = p.FechaEntrada ?? p.FechaCreacion,
                };
            }));

        documentos.AddRange(pagos
            .Where(p => p.DeletedAt == null && !string.IsNullOrWhiteSpace(p.ComprobanteUrl))
            .OrderByDescending(p => p.FechaPago)
            .Select(p => new PortalDocumentoDto
            {
                Tipo = "COMPROBANTE",
                Titulo = $"Comprobante de pago {p.FechaPago:dd/MM/yyyy}",
                Url = p.ComprobanteUrl,
                Fecha = p.FechaPago,
            }));

        return documentos;
    }

    private static string TimelineTitle(RR.Domain.Entities.Evento e)
    {
        if (e.Tipo == "CAMBIO_ESTADO" && !string.IsNullOrWhiteSpace(e.EstadoNuevo))
            return EstadoCliente(e.EstadoNuevo);

        return e.Tipo switch
        {
            "CREACION" => "Trámite recibido",
            "CAMPO" => "Unidad verificada en yarda",
            "DOCUMENTO" => "Documento actualizado",
            "PEDIMENTO" => "Pedimento registrado",
            "ENTREGA" => "Entrega registrada",
            "PAGO" => "Pago registrado",
            _ => "Actualización del trámite",
        };
    }

    private static string TimelineDescription(RR.Domain.Entities.Evento e)
    {
        if (e.Tipo == "CAMBIO_ESTADO" && !string.IsNullOrWhiteSpace(e.EstadoNuevo))
            return EstadoDescripcion(e.EstadoNuevo);

        return CleanInternalText(e.Contenido);
    }

    private static string CleanInternalText(string text)
    {
        return text
            .Replace("Trámite", "Trámite", StringComparison.OrdinalIgnoreCase)
            .Trim();
    }

    private static string EstadoCliente(string estado) => estado switch
    {
        "PENDIENTE_TRAMITE" => "Preparando trámite",
        "FOTOS_SOLICITADAS" => "Validando unidad",
        "FOTOS_RECIBIDAS" => "Unidad verificada",
        "REQUISITOS_PENDIENTES" => "Requisitos pendientes",
        "BAJA_EN_PROCESO" => "Baja en proceso",
        "BAJA_COMPLETADA" => "Baja completada",
        "LISTO_PARA_PEDIMENTO" => "Expediente completo",
        "PEDIMENTO_DOCUMENTADO" => "Pedimento documentado",
        "PAGO_PEDIMENTO_PENDIENTE" => "En validación de pago",
        "MANDADO_A_CRUCE" => "En cruce aduanal",
        "EN_PROCESO" => "En proceso aduanal",
        "ROJO_DESADUANADO" => "Liberado por aduana",
        "ENTREGADO_AL_CLIENTE" => "Trámite cerrado",
        "VERDE_ENTREGADO" => "Trámite cerrado",
        "AMARILLO_PENDIENTE_PAGO" => "Trámite cerrado",
        "COBRADO" => "Trámite cerrado",
        "CANCELADO" => "Trámite cancelado",
        _ => "En seguimiento",
    };

    private static string EstadoDescripcion(string estado) => estado switch
    {
        "PENDIENTE_TRAMITE" => "Estamos validando los datos y preparando la documentación inicial.",
        "FOTOS_SOLICITADAS" => "Un yardero fue enviado a validar la unidad y tomar evidencia fotográfica.",
        "FOTOS_RECIBIDAS" => "La unidad ya fue validada en yarda con evidencia inicial.",
        "REQUISITOS_PENDIENTES" => "Estamos reuniendo factura, identificación y requisitos para la baja.",
        "BAJA_EN_PROCESO" => "La baja está en proceso. Este paso suele tomar alrededor de 72 horas.",
        "BAJA_COMPLETADA" => "La baja quedó completa y el expediente avanza al pedimento.",
        "LISTO_PARA_PEDIMENTO" => "El expediente está listo para documentar pedimento.",
        "PEDIMENTO_DOCUMENTADO" => "El pedimento fue documentado y está en revisión para el cruce.",
        "PAGO_PEDIMENTO_PENDIENTE" => "Estamos validando el pago necesario para continuar el cruce.",
        "MANDADO_A_CRUCE" => "La unidad fue enviada a cruce aduanal.",
        "EN_PROCESO" => "Tu unidad está avanzando dentro del proceso operativo y aduanal.",
        "ROJO_DESADUANADO" => "La unidad ya fue liberada por aduana y seguimos con los pasos finales.",
        "ENTREGADO_AL_CLIENTE" => "El trámite logístico ha finalizado. Puedes consultar tus pagos pendientes en la sección financiera.",
        "VERDE_ENTREGADO" => "El trámite logístico ha finalizado. Puedes consultar tus pagos pendientes en la sección financiera.",
        "AMARILLO_PENDIENTE_PAGO" => "El trámite quedó cerrado.",
        "COBRADO" => "El trámite quedó cerrado y pagado.",
        "CANCELADO" => "Este trámite fue cancelado. Contacta a R&R si necesitas más detalle.",
        _ => "R&R mantiene el seguimiento de tu trámite.",
    };

    private static string NextStepDescription(string estado) => estado switch
    {
        "PENDIENTE_TRAMITE" => "Te avisaremos cuando el expediente pase a proceso aduanal.",
        "FOTOS_SOLICITADAS" => "La siguiente actualización será cuando recibamos las fotos de yarda.",
        "FOTOS_RECIBIDAS" => "La siguiente actualización será la revisión de requisitos para baja.",
        "REQUISITOS_PENDIENTES" => "La siguiente actualización será cuando la baja inicie o el expediente quede completo.",
        "BAJA_EN_PROCESO" => "Te avisaremos cuando la baja quede completa.",
        "BAJA_COMPLETADA" => "El siguiente paso es documentar pedimento.",
        "LISTO_PARA_PEDIMENTO" => "El siguiente paso es recibir el pedimento documentado.",
        "PEDIMENTO_DOCUMENTADO" => "El siguiente paso es validar pago y mandar a cruce.",
        "PAGO_PEDIMENTO_PENDIENTE" => "Al validarse el pago, la unidad se manda a cruce.",
        "MANDADO_A_CRUCE" => "La siguiente actualización será la liberación por aduana.",
        "EN_PROCESO" => "La siguiente actualización será la liberación o una indicación operativa.",
        "ROJO_DESADUANADO" => "El siguiente paso es coordinar entrega y cierre del trámite.",
        "ENTREGADO_AL_CLIENTE" => "Trámite finalizado.",
        "VERDE_ENTREGADO" => "Trámite finalizado.",
        "AMARILLO_PENDIENTE_PAGO" => "Al confirmarse el pago, el trámite quedará cerrado.",
        _ => "Te notificaremos cuando haya una nueva actualización.",
    };

    private static decimal EstadoProgreso(string estado) => estado switch
    {
        "PENDIENTE_TRAMITE" => 18m,
        "FOTOS_SOLICITADAS" => 24m,
        "FOTOS_RECIBIDAS" => 30m,
        "REQUISITOS_PENDIENTES" => 38m,
        "BAJA_EN_PROCESO" => 46m,
        "BAJA_COMPLETADA" => 54m,
        "LISTO_PARA_PEDIMENTO" => 62m,
        "PEDIMENTO_DOCUMENTADO" => 70m,
        "PAGO_PEDIMENTO_PENDIENTE" => 76m,
        "MANDADO_A_CRUCE" => 82m,
        "EN_PROCESO" => 42m,
        "ROJO_DESADUANADO" => 70m,
        "ENTREGADO_AL_CLIENTE" => 100m,
        "VERDE_ENTREGADO" => 100m,
        "AMARILLO_PENDIENTE_PAGO" => 100m,
        "COBRADO" => 100m,
        "CANCELADO" => 100m,
        _ => 30m,
    };

    private static string BuildVehiculoResumen(RR.Domain.Entities.Tramite tramite)
    {
        if (tramite.Vehiculo == null)
            return FirstNotEmpty(tramite.DescripcionMercancia, "Mercancía en trámite");

        var marca = tramite.Vehiculo.Marca?.Nombre;
        var modelo = tramite.Vehiculo.Modelo?.Nombre;
        var anno = tramite.Vehiculo.Anno?.ToString();
        return string.Join(" ", new[] { marca, modelo, anno }.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static decimal ConvertPagoToMxn(RR.Domain.Entities.Pago pago)
    {
        return pago.Moneda == "USD" ? pago.Monto * (pago.TipoCambio ?? 0m) : pago.Monto;
    }

    private static string FirstNotEmpty(params string?[] values)
    {
        return values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? string.Empty;
    }
}
