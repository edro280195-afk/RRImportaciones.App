// ═══════════════════════════════════════════════════════════════════════════
// CLASIFICACIONES Y ENUMS AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

class PagedResult<T> {
  const PagedResult({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
  });

  final List<T> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;

  factory PagedResult.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    final itemsList = (json['items'] as List? ?? [])
        .map((item) => fromJsonT(item as Map<String, dynamic>))
        .toList();
    return PagedResult<T>(
      items: itemsList,
      total: json['total'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      pageSize: json['pageSize'] as int? ?? 20,
      totalPages: json['totalPages'] as int? ?? 0,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS DE CLIENTES
// ═══════════════════════════════════════════════════════════════════════════

class ClienteListDto {
  const ClienteListDto({
    required this.id,
    required this.apodo,
    this.nombreCompleto,
    this.telefono,
    this.email,
    this.procedencia,
    required this.totalVehiculos,
    required this.totalTramites,
    required this.totalFacturado,
    required this.fechaRegistro,
  });

  final String id;
  final String apodo;
  final String? nombreCompleto;
  final String? telefono;
  final String? email;
  final String? procedencia;
  final int totalVehiculos;
  final int totalTramites;
  final double totalFacturado;
  final String fechaRegistro;

  factory ClienteListDto.fromJson(Map<String, dynamic> json) {
    return ClienteListDto(
      id: json['id']?.toString() ?? '',
      apodo: json['apodo']?.toString() ?? '',
      nombreCompleto: json['nombreCompleto']?.toString(),
      telefono: json['telefono']?.toString(),
      email: json['email']?.toString(),
      procedencia: json['procedencia']?.toString(),
      totalVehiculos: json['totalVehiculos'] as int? ?? 0,
      totalTramites: json['totalTramites'] as int? ?? 0,
      totalFacturado: (json['totalFacturado'] as num? ?? 0).toDouble(),
      fechaRegistro: json['fechaRegistro']?.toString() ?? '',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS DE TRAMITES
// ═══════════════════════════════════════════════════════════════════════════

class TramiteDashboardDto {
  const TramiteDashboardDto({
    required this.activos,
    required this.verdesEsteMes,
    required this.amarillosPendientePago,
    required this.cobradoMes,
    required this.porCobrar,
    required this.vehiculosEnPatio,
  });

  final int activos;
  final int verdesEsteMes;
  final int amarillosPendientePago;
  final double cobradoMes;
  final double porCobrar;
  final int vehiculosEnPatio;

  factory TramiteDashboardDto.fromJson(Map<String, dynamic> json) {
    return TramiteDashboardDto(
      activos: json['activos'] as int? ?? 0,
      verdesEsteMes: json['verdesEsteMes'] as int? ?? 0,
      amarillosPendientePago: json['amarillosPendientePago'] as int? ?? 0,
      cobradoMes: (json['cobradoMes'] as num? ?? 0).toDouble(),
      porCobrar: (json['porCobrar'] as num? ?? 0).toDouble(),
      vehiculosEnPatio: json['vehiculosEnPatio'] as int? ?? 0,
    );
  }
}

class TramiteListDto {
  const TramiteListDto({
    required this.id,
    required this.numeroConsecutivo,
    this.loteId,
    this.folioLote,
    required this.fechaCreacion,
    this.clienteApodo,
    this.clienteNombre,
    this.vehiculoVinCorto,
    this.vehiculoMarcaModelo,
    this.aduanaNombre,
    this.tramitadorNombre,
    required this.estatus,
    required this.tipoTramite,
    required this.cobroTotal,
    required this.cargoExpress,
    required this.totalPagado,
    required this.saldoPendiente,
    this.fechaEstadoActual,
    required this.diasEnEstado,
  });

  final String id;
  final String numeroConsecutivo;
  final String? loteId;
  final String? folioLote;
  final String fechaCreacion;
  final String? clienteApodo;
  final String? clienteNombre;
  final String? vehiculoVinCorto;
  final String? vehiculoMarcaModelo;
  final String? aduanaNombre;
  final String? tramitadorNombre;
  final String estatus;
  final String tipoTramite;
  final double cobroTotal;
  final double cargoExpress;
  final double totalPagado;
  final double saldoPendiente;
  final String? fechaEstadoActual;
  final int diasEnEstado;

  factory TramiteListDto.fromJson(Map<String, dynamic> json) {
    return TramiteListDto(
      id: json['id']?.toString() ?? '',
      numeroConsecutivo: json['numeroConsecutivo']?.toString() ?? '',
      loteId: json['loteId']?.toString(),
      folioLote: json['folioLote']?.toString(),
      fechaCreacion: json['fechaCreacion']?.toString() ?? '',
      clienteApodo: json['clienteApodo']?.toString(),
      clienteNombre: json['clienteNombre']?.toString(),
      vehiculoVinCorto: json['vehiculoVinCorto']?.toString(),
      vehiculoMarcaModelo: json['vehiculoMarcaModelo']?.toString(),
      aduanaNombre: json['aduanaNombre']?.toString(),
      tramitadorNombre: json['tramitadorNombre']?.toString(),
      estatus: json['estatus']?.toString() ?? '',
      tipoTramite: json['tipoTramite']?.toString() ?? '',
      cobroTotal: (json['cobroTotal'] as num? ?? 0).toDouble(),
      cargoExpress: (json['cargoExpress'] as num? ?? 0).toDouble(),
      totalPagado: (json['totalPagado'] as num? ?? 0).toDouble(),
      saldoPendiente: (json['saldoPendiente'] as num? ?? 0).toDouble(),
      fechaEstadoActual: json['fechaEstadoActual']?.toString(),
      diasEnEstado: json['diasEnEstado'] as int? ?? 0,
    );
  }
}

class TramiteEventoDto {
  const TramiteEventoDto({
    required this.id,
    required this.tipo,
    this.estadoAnterior,
    this.estadoNuevo,
    required this.contenido,
    this.fotoUrl,
    required this.fechaEvento,
    this.creadoPorNombre,
  });

  final String id;
  final String tipo;
  final String? estadoAnterior;
  final String? estadoNuevo;
  final String contenido;
  final String? fotoUrl;
  final String fechaEvento;
  final String? creadoPorNombre;

  factory TramiteEventoDto.fromJson(Map<String, dynamic> json) {
    return TramiteEventoDto(
      id: json['id']?.toString() ?? '',
      tipo: json['tipo']?.toString() ?? '',
      estadoAnterior: json['estadoAnterior']?.toString(),
      estadoNuevo: json['estadoNuevo']?.toString(),
      contenido: json['contenido']?.toString() ?? '',
      fotoUrl: json['fotoUrl']?.toString(),
      fechaEvento: json['fechaEvento']?.toString() ?? '',
      creadoPorNombre: json['creadoPorNombre']?.toString(),
    );
  }
}

class TramitePedimentoDto {
  const TramitePedimentoDto({
    required this.id,
    required this.numeroPedimento,
    required this.tipo,
    this.fechaEntrada,
    this.patente,
    this.igi,
    this.dta,
    this.iva,
    this.totalContribuciones,
    this.estatus,
    this.motivoRectificacion,
    this.responsableError,
    required this.cobroAdicional,
  });

  final String id;
  final String numeroPedimento;
  final String tipo;
  final String? fechaEntrada;
  final String? patente;
  final double? igi;
  final double? dta;
  final double? iva;
  final double? totalContribuciones;
  final String? estatus;
  final String? motivoRectificacion;
  final String? responsableError;
  final double cobroAdicional;

  factory TramitePedimentoDto.fromJson(Map<String, dynamic> json) {
    return TramitePedimentoDto(
      id: json['id']?.toString() ?? '',
      numeroPedimento: json['numeroPedimento']?.toString() ?? '',
      tipo: json['tipo']?.toString() ?? '',
      fechaEntrada: json['fechaEntrada']?.toString(),
      patente: json['patente']?.toString(),
      igi: (json['igi'] as num?)?.toDouble(),
      dta: (json['dta'] as num?)?.toDouble(),
      iva: (json['iva'] as num?)?.toDouble(),
      totalContribuciones: (json['totalContribuciones'] as num?)?.toDouble(),
      estatus: json['estatus']?.toString(),
      motivoRectificacion: json['motivoRectificacion']?.toString(),
      responsableError: json['responsableError']?.toString(),
      cobroAdicional: (json['cobroAdicional'] as num? ?? 0).toDouble(),
    );
  }
}

class TramitePagoDto {
  const TramitePagoDto({
    required this.id,
    required this.monto,
    required this.moneda,
    this.tipoCambio,
    this.tipoMovimiento,
    this.pagadoPor,
    this.seCobraAlCliente,
    required this.metodo,
    this.banco,
    this.referencia,
    this.folioRecibo,
    this.reciboPagoUrl,
    required this.fechaPago,
    required this.verificado,
  });

  final String id;
  final double monto;
  final String moneda;
  final double? tipoCambio;
  final String? tipoMovimiento;
  final String? pagadoPor;
  final bool? seCobraAlCliente;
  final String metodo;
  final String? banco;
  final String? referencia;
  final String? folioRecibo;
  final String? reciboPagoUrl;
  final String fechaPago;
  final bool verificado;

  factory TramitePagoDto.fromJson(Map<String, dynamic> json) {
    return TramitePagoDto(
      id: json['id']?.toString() ?? '',
      monto: (json['monto'] as num? ?? 0).toDouble(),
      moneda: json['moneda']?.toString() ?? 'MXN',
      tipoCambio: (json['tipoCambio'] as num?)?.toDouble(),
      tipoMovimiento: json['tipoMovimiento']?.toString(),
      pagadoPor: json['pagadoPor']?.toString(),
      seCobraAlCliente: json['seCobraAlCliente'] as bool?,
      metodo: json['metodo']?.toString() ?? '',
      banco: json['banco']?.toString(),
      referencia: json['referencia']?.toString(),
      folioRecibo: json['folioRecibo']?.toString(),
      reciboPagoUrl: json['reciboPagoUrl']?.toString(),
      fechaPago: json['fechaPago']?.toString() ?? '',
      verificado: json['verificado'] as bool? ?? false,
    );
  }
}

class TipoGastoDto {
  const TipoGastoDto({
    required this.id,
    required this.categoria,
    required this.nombre,
    this.activo = true,
  });

  final String id;
  final String categoria;
  final String nombre;
  final bool activo;

  factory TipoGastoDto.fromJson(Map<String, dynamic> json) {
    return TipoGastoDto(
      id: json['id']?.toString() ?? '',
      categoria: json['categoria']?.toString() ?? '',
      nombre: json['nombre']?.toString() ?? '',
      activo: json['activo'] as bool? ?? true,
    );
  }
}

class TramiteGastoDto {
  const TramiteGastoDto({
    required this.id,
    required this.tipoGasto,
    required this.concepto,
    required this.monto,
    required this.moneda,
    required this.seCargaAlCliente,
    this.comprobanteUrl,
    required this.fechaGasto,
  });

  final String id;
  final String tipoGasto;
  final String concepto;
  final double monto;
  final String moneda;
  final bool seCargaAlCliente;
  final String? comprobanteUrl;
  final String fechaGasto;

  factory TramiteGastoDto.fromJson(Map<String, dynamic> json) {
    return TramiteGastoDto(
      id: json['id']?.toString() ?? '',
      tipoGasto: json['tipoGasto']?.toString() ?? '',
      concepto: json['concepto']?.toString() ?? '',
      monto: (json['monto'] as num? ?? 0).toDouble(),
      moneda: json['moneda']?.toString() ?? 'MXN',
      seCargaAlCliente: json['seCargaAlCliente'] as bool? ?? false,
      comprobanteUrl: json['comprobanteUrl']?.toString(),
      fechaGasto: json['fechaGasto']?.toString() ?? '',
    );
  }
}

class TramiteEntregaDto {
  const TramiteEntregaDto({
    required this.id,
    this.responsableCampoNombre,
    this.recibidoPorPartnerNombre,
    this.descripcion,
    this.ubicacionEntrega,
    required this.documentosEntregados,
    this.nombreRecibe,
    this.fotoEvidenciaUrl,
    this.firmaBase64,
    required this.fechaEntrega,
  });

  final String id;
  final String? responsableCampoNombre;
  final String? recibidoPorPartnerNombre;
  final String? descripcion;
  final String? ubicacionEntrega;
  final List<String> documentosEntregados;
  final String? nombreRecibe;
  final String? fotoEvidenciaUrl;
  final String? firmaBase64;
  final String fechaEntrega;

  factory TramiteEntregaDto.fromJson(Map<String, dynamic> json) {
    return TramiteEntregaDto(
      id: json['id']?.toString() ?? '',
      responsableCampoNombre: json['responsableCampoNombre']?.toString(),
      recibidoPorPartnerNombre: json['recibidoPorPartnerNombre']?.toString(),
      descripcion: json['descripcion']?.toString(),
      ubicacionEntrega: json['ubicacionEntrega']?.toString(),
      documentosEntregados: (json['documentosEntregados'] as List? ?? [])
          .map((item) => item.toString())
          .toList(),
      nombreRecibe: json['nombreRecibe']?.toString(),
      fotoEvidenciaUrl: json['fotoEvidenciaUrl']?.toString(),
      firmaBase64: json['firmaBase64']?.toString(),
      fechaEntrega: json['fechaEntrega']?.toString() ?? '',
    );
  }
}

class TramiteDocumentoDto {
  const TramiteDocumentoDto({
    required this.id,
    required this.tramiteId,
    required this.tipoDocumento,
    required this.nombre,
    required this.estadoLogistico,
    required this.esRequerido,
    this.archivoUrl,
    this.notas,
    this.fechaRecibido,
    this.fechaValidado,
  });

  final String id;
  final String tramiteId;
  final String tipoDocumento;
  final String nombre;
  final String estadoLogistico;
  final bool esRequerido;
  final String? archivoUrl;
  final String? notas;
  final String? fechaRecibido;
  final String? fechaValidado;

  factory TramiteDocumentoDto.fromJson(Map<String, dynamic> json) {
    return TramiteDocumentoDto(
      id: json['id']?.toString() ?? '',
      tramiteId: json['tramiteId']?.toString() ?? '',
      tipoDocumento: json['tipoDocumento']?.toString() ?? '',
      nombre: json['nombre']?.toString() ?? '',
      estadoLogistico: json['estadoLogistico']?.toString() ?? 'PENDIENTE',
      esRequerido: json['esRequerido'] as bool? ?? false,
      archivoUrl: json['archivoUrl']?.toString(),
      notas: json['notas']?.toString(),
      fechaRecibido: json['fechaRecibido']?.toString(),
      fechaValidado: json['fechaValidado']?.toString(),
    );
  }
}

class TramiteTareaCampoDto {
  const TramiteTareaCampoDto({
    required this.id,
    required this.tipo,
    required this.estatus,
    this.personalCampoNombre,
    this.ubicacion,
    this.vinConfirmado,
    required this.fotosUrls,
    this.incidencia,
    required this.fechaCreacion,
    this.fechaTomada,
    this.fechaCompletada,
  });

  final String id;
  final String tipo;
  final String estatus;
  final String? personalCampoNombre;
  final String? ubicacion;
  final String? vinConfirmado;
  final List<String> fotosUrls;
  final String? incidencia;
  final String fechaCreacion;
  final String? fechaTomada;
  final String? fechaCompletada;

  factory TramiteTareaCampoDto.fromJson(Map<String, dynamic> json) {
    return TramiteTareaCampoDto(
      id: json['id']?.toString() ?? '',
      tipo: json['tipo']?.toString() ?? '',
      estatus: json['estatus']?.toString() ?? '',
      personalCampoNombre: json['personalCampoNombre']?.toString(),
      ubicacion: json['ubicacion']?.toString(),
      vinConfirmado: json['vinConfirmado']?.toString(),
      fotosUrls: (json['fotosUrls'] as List? ?? [])
          .map((item) => item.toString())
          .toList(),
      incidencia: json['incidencia']?.toString(),
      fechaCreacion: json['fechaCreacion']?.toString() ?? '',
      fechaTomada: json['fechaTomada']?.toString(),
      fechaCompletada: json['fechaCompletada']?.toString(),
    );
  }
}

class TramiteDetailDto {
  const TramiteDetailDto({
    required this.id,
    required this.numeroConsecutivo,
    this.loteId,
    this.folioLote,
    this.clienteId,
    this.clienteApodo,
    this.clienteNombre,
    this.vehiculoId,
    this.vehiculoVin,
    this.vehiculoVinCorto,
    this.vehiculoMarca,
    this.vehiculoModelo,
    this.vehiculoAnno,
    this.descripcionMercancia,
    this.aduanaId,
    this.aduanaNombre,
    this.tramitadorId,
    this.tramitadorNombre,
    this.cotizacionOrigenId,
    this.cotizacionOrigenFolio,
    this.cotizacionFecha,
    required this.tipoTramite,
    required this.estatus,
    required this.cobroTotal,
    required this.honorarios,
    required this.cargoExpress,
    required this.totalPagado,
    required this.saldoPendiente,
    this.notas,
    this.fechaInicio,
    this.fechaEstadoActual,
    required this.diasEnEstado,
    required this.fechaCreacion,
    this.fechaModificacion,
    required this.eventos,
    required this.pedimentos,
    required this.pagos,
    required this.gastosHormiga,
    required this.entregas,
    required this.documentos,
    required this.tareasCampo,
  });

  final String id;
  final String numeroConsecutivo;
  final String? loteId;
  final String? folioLote;
  final String? clienteId;
  final String? clienteApodo;
  final String? clienteNombre;
  final String? vehiculoId;
  final String? vehiculoVin;
  final String? vehiculoVinCorto;
  final String? vehiculoMarca;
  final String? vehiculoModelo;
  final int? vehiculoAnno;
  final String? descripcionMercancia;
  final String? aduanaId;
  final String? aduanaNombre;
  final String? tramitadorId;
  final String? tramitadorNombre;
  final String? cotizacionOrigenId;
  final String? cotizacionOrigenFolio;
  final String? cotizacionFecha;
  final String tipoTramite;
  final String estatus;
  final double cobroTotal;
  final double honorarios;
  final double cargoExpress;
  final double totalPagado;
  final double saldoPendiente;
  final String? notas;
  final String? fechaInicio;
  final String? fechaEstadoActual;
  final int diasEnEstado;
  final String fechaCreacion;
  final String? fechaModificacion;
  final List<TramiteEventoDto> eventos;
  final List<TramitePedimentoDto> pedimentos;
  final List<TramitePagoDto> pagos;
  final List<TramiteGastoDto> gastosHormiga;
  final List<TramiteEntregaDto> entregas;
  final List<TramiteDocumentoDto> documentos;
  final List<TramiteTareaCampoDto> tareasCampo;

  factory TramiteDetailDto.fromJson(Map<String, dynamic> json) {
    return TramiteDetailDto(
      id: json['id']?.toString() ?? '',
      numeroConsecutivo: json['numeroConsecutivo']?.toString() ?? '',
      loteId: json['loteId']?.toString(),
      folioLote: json['folioLote']?.toString(),
      clienteId: json['clienteId']?.toString(),
      clienteApodo: json['clienteApodo']?.toString(),
      clienteNombre: json['clienteNombre']?.toString(),
      vehiculoId: json['vehiculoId']?.toString(),
      vehiculoVin: json['vehiculoVin']?.toString(),
      vehiculoVinCorto: json['vehiculoVinCorto']?.toString(),
      vehiculoMarca: json['vehiculoMarca']?.toString(),
      vehiculoModelo: json['vehiculoModelo']?.toString(),
      vehiculoAnno: json['vehiculoAnno'] as int?,
      descripcionMercancia: json['descripcionMercancia']?.toString(),
      aduanaId: json['aduanaId']?.toString(),
      aduanaNombre: json['aduanaNombre']?.toString(),
      tramitadorId: json['tramitadorId']?.toString(),
      tramitadorNombre: json['tramitadorNombre']?.toString(),
      cotizacionOrigenId: json['cotizacionOrigenId']?.toString(),
      cotizacionOrigenFolio: json['cotizacionOrigenFolio']?.toString(),
      cotizacionFecha: json['cotizacionFecha']?.toString(),
      tipoTramite: json['tipoTramite']?.toString() ?? '',
      estatus: json['estatus']?.toString() ?? '',
      cobroTotal: (json['cobroTotal'] as num? ?? 0).toDouble(),
      honorarios: (json['honorarios'] as num? ?? 0).toDouble(),
      cargoExpress: (json['cargoExpress'] as num? ?? 0).toDouble(),
      totalPagado: (json['totalPagado'] as num? ?? 0).toDouble(),
      saldoPendiente: (json['saldoPendiente'] as num? ?? 0).toDouble(),
      notas: json['notas']?.toString(),
      fechaInicio: json['fechaInicio']?.toString(),
      fechaEstadoActual: json['fechaEstadoActual']?.toString(),
      diasEnEstado: json['diasEnEstado'] as int? ?? 0,
      fechaCreacion: json['fechaCreacion']?.toString() ?? '',
      fechaModificacion: json['fechaModificacion']?.toString(),
      eventos: (json['eventos'] as List? ?? [])
          .map(
            (item) => TramiteEventoDto.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      pedimentos: (json['pedimentos'] as List? ?? [])
          .map(
            (item) =>
                TramitePedimentoDto.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      pagos: (json['pagos'] as List? ?? [])
          .map((item) => TramitePagoDto.fromJson(item as Map<String, dynamic>))
          .toList(),
      gastosHormiga: (json['gastosHormiga'] as List? ?? [])
          .map((item) => TramiteGastoDto.fromJson(item as Map<String, dynamic>))
          .toList(),
      entregas: (json['entregas'] as List? ?? [])
          .map(
            (item) => TramiteEntregaDto.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      documentos: (json['documentos'] as List? ?? [])
          .map(
            (item) =>
                TramiteDocumentoDto.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      tareasCampo: (json['tareasCampo'] as List? ?? [])
          .map(
            (item) =>
                TramiteTareaCampoDto.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS DE COTIZACIONES
// ═══════════════════════════════════════════════════════════════════════════

class CotizacionDashboardDto {
  const CotizacionDashboardDto({
    required this.pendientesRespuesta,
    required this.porExpirar,
    required this.aceptadasListas,
  });

  final int pendientesRespuesta;
  final int porExpirar;
  final List<CotizacionListDto> aceptadasListas;

  factory CotizacionDashboardDto.fromJson(Map<String, dynamic> json) {
    return CotizacionDashboardDto(
      pendientesRespuesta: json['pendientesRespuesta'] as int? ?? 0,
      porExpirar: json['porExpirar'] as int? ?? 0,
      aceptadasListas: (json['aceptadasListas'] as List? ?? [])
          .map(
            (item) => CotizacionListDto.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}

class CotizacionListDto {
  const CotizacionListDto({
    required this.id,
    this.folio,
    required this.estado,
    this.clienteNombre,
    this.vin,
    this.vehiculo,
    this.anno,
    required this.total,
    this.tramiteId,
    this.tramiteNumero,
    required this.fechaCreacion,
    this.fechaExpiracion,
  });

  final String id;
  final String? folio;
  final String estado;
  final String? clienteNombre;
  final String? vin;
  final String? vehiculo;
  final int? anno;
  final double total;
  final String? tramiteId;
  final String? tramiteNumero;
  final String fechaCreacion;
  final String? fechaExpiracion;

  factory CotizacionListDto.fromJson(Map<String, dynamic> json) {
    return CotizacionListDto(
      id: json['id']?.toString() ?? '',
      folio: json['folio']?.toString(),
      estado: json['estado']?.toString() ?? '',
      clienteNombre: json['clienteNombre']?.toString(),
      vin: json['vin']?.toString(),
      vehiculo: json['vehiculo']?.toString(),
      anno: json['anno'] as int?,
      total: (json['total'] as num? ?? 0).toDouble(),
      tramiteId: json['tramiteId']?.toString(),
      tramiteNumero: json['tramiteNumero']?.toString(),
      fechaCreacion: json['fechaCreacion']?.toString() ?? '',
      fechaExpiracion: json['fechaExpiracion']?.toString(),
    );
  }
}

class CotizacionInput {
  const CotizacionInput({
    this.vin,
    this.marcaId,
    this.marca,
    this.modelo,
    this.anno,
    this.cilindradaCm3,
    this.tipoVehiculo,
    this.valorAduanaUsdOverride,
    this.precioEstimadoIdOverride,
    this.categoriaAmparoOverride,
    required this.tcMargen,
    required this.tipoTramite,
    this.honorariosOverride,
  });

  final String? vin;
  final String? marcaId;
  final String? marca;
  final String? modelo;
  final int? anno;
  final int? cilindradaCm3;
  final String? tipoVehiculo;
  final double? valorAduanaUsdOverride;
  final String? precioEstimadoIdOverride;
  final String? categoriaAmparoOverride;
  final double tcMargen;
  final String tipoTramite;
  final double? honorariosOverride;

  Map<String, dynamic> toJson() {
    return {
      'vin': vin,
      'marcaId': marcaId,
      'marca': marca,
      'modelo': modelo,
      'anno': anno,
      'cilindradaCm3': cilindradaCm3,
      'tipoVehiculo': tipoVehiculo,
      'valorAduanaUsdOverride': valorAduanaUsdOverride,
      'precioEstimadoIdOverride': precioEstimadoIdOverride,
      'categoriaAmparoOverride': categoriaAmparoOverride,
      'tcMargen': tcMargen,
      'tipoTramite': tipoTramite,
      'honorariosOverride': honorariosOverride,
    };
  }
}

class GuardarCotizacionRequest {
  const GuardarCotizacionRequest({
    required this.input,
    this.folio,
    this.clienteId,
    this.notas,
    this.fechaExpiracion,
  });

  final CotizacionInput input;
  final String? folio;
  final String? clienteId;
  final String? notas;
  final String? fechaExpiracion;

  Map<String, dynamic> toJson() {
    final map = input.toJson();
    map.addAll({
      'folio': folio,
      'clienteId': clienteId,
      'notas': notas,
      'fechaExpiracion': fechaExpiracion,
    });
    return map;
  }
}

class CotizacionOutput {
  const CotizacionOutput({
    this.id,
    this.folio,
    this.tramiteId,
    this.tramiteNumero,
    this.clienteId,
    this.clienteNombre,
    this.clienteApodo,
    this.clienteTelefono,
    this.clienteEmail,
    required this.estado,
    this.vin,
    this.marcaId,
    this.marca,
    this.modelo,
    this.anno,
    this.cilindradaCm3,
    required this.categoria,
    required this.fraccion,
    required this.regimenFiscal,
    this.categoriaAmparoUsada,
    required this.fuentePrecio,
    this.precioCatalogoMarca,
    this.precioCatalogoModelo,
    this.precioCatalogoOrigen,
    this.precioAntiguedadAnios,
    this.precioMatchTipo,
    this.precioMatchScore,
    this.precioAdvertencia,
    this.valorAduanaUsd,
    required this.valorPesos,
    this.tipoCambioReferencia,
    this.tipoCambioAplicado,
    this.tipoCambioContexto,
    this.tipoCambioNota,
    required this.tipoCambioStale,
    required this.igiPorcentaje,
    required this.igi,
    required this.dta,
    required this.iva,
    required this.prev,
    required this.prv,
    required this.impuestosTotal,
    required this.honorarios,
    required this.cargoExpress,
    required this.total,
    this.notas,
    this.fechaExpiracion,
    this.fechaEnvio,
    this.enviadoPor,
    this.enviadoA,
  });

  final String? id;
  final String? folio;
  final String? tramiteId;
  final String? tramiteNumero;
  final String? clienteId;
  final String? clienteNombre;
  final String? clienteApodo;
  final String? clienteTelefono;
  final String? clienteEmail;
  final String estado;
  final String? vin;
  final String? marcaId;
  final String? marca;
  final String? modelo;
  final int? anno;
  final int? cilindradaCm3;
  final String categoria;
  final String fraccion;
  final String regimenFiscal;
  final String? categoriaAmparoUsada;
  final String fuentePrecio;
  final String? precioCatalogoMarca;
  final String? precioCatalogoModelo;
  final String? precioCatalogoOrigen;
  final int? precioAntiguedadAnios;
  final String? precioMatchTipo;
  final double? precioMatchScore;
  final String? precioAdvertencia;
  final double? valorAduanaUsd;
  final double valorPesos;
  final double? tipoCambioReferencia;
  final double? tipoCambioAplicado;
  final String? tipoCambioContexto;
  final String? tipoCambioNota;
  final bool tipoCambioStale;
  final double igiPorcentaje;
  final double igi;
  final double dta;
  final double iva;
  final double prev;
  final double prv;
  final double impuestosTotal;
  final double honorarios;
  final double cargoExpress;
  final double total;
  final String? notas;
  final String? fechaExpiracion;
  final String? fechaEnvio;
  final String? enviadoPor;
  final String? enviadoA;

  factory CotizacionOutput.fromJson(Map<String, dynamic> json) {
    return CotizacionOutput(
      id: json['id']?.toString(),
      folio: json['folio']?.toString(),
      tramiteId: json['tramiteId']?.toString(),
      tramiteNumero: json['tramiteNumero']?.toString(),
      clienteId: json['clienteId']?.toString(),
      clienteNombre: json['clienteNombre']?.toString(),
      clienteApodo: json['clienteApodo']?.toString(),
      clienteTelefono: json['clienteTelefono']?.toString(),
      clienteEmail: json['clienteEmail']?.toString(),
      estado: json['estado']?.toString() ?? '',
      vin: json['vin']?.toString(),
      marcaId: json['marcaId']?.toString(),
      marca: json['marca']?.toString(),
      modelo: json['modelo']?.toString(),
      anno: json['anno'] as int?,
      cilindradaCm3: json['cilindradaCm3'] as int?,
      categoria: json['categoria']?.toString() ?? '',
      fraccion: json['fraccion']?.toString() ?? '',
      regimenFiscal: json['regimenFiscal']?.toString() ?? '',
      categoriaAmparoUsada: json['categoriaAmparoUsada']?.toString(),
      fuentePrecio: json['fuentePrecio']?.toString() ?? '',
      precioCatalogoMarca: json['precioCatalogoMarca']?.toString(),
      precioCatalogoModelo: json['precioCatalogoModelo']?.toString(),
      precioCatalogoOrigen: json['precioCatalogoOrigen']?.toString(),
      precioAntiguedadAnios: json['precioAntiguedadAnios'] as int?,
      precioMatchTipo: json['precioMatchTipo']?.toString(),
      precioMatchScore: (json['precioMatchScore'] as num?)?.toDouble(),
      precioAdvertencia: json['precioAdvertencia']?.toString(),
      valorAduanaUsd: (json['valorAduanaUsd'] as num?)?.toDouble(),
      valorPesos: (json['valorPesos'] as num? ?? 0).toDouble(),
      tipoCambioReferencia: (json['tipoCambioReferencia'] as num?)?.toDouble(),
      tipoCambioAplicado: (json['tipoCambioAplicado'] as num?)?.toDouble(),
      tipoCambioContexto: json['tipoCambioContexto']?.toString(),
      tipoCambioNota: json['tipoCambioNota']?.toString(),
      tipoCambioStale: json['tipoCambioStale'] as bool? ?? false,
      igiPorcentaje: (json['igiPorcentaje'] as num? ?? 0).toDouble(),
      igi: (json['igi'] as num? ?? 0).toDouble(),
      dta: (json['dta'] as num? ?? 0).toDouble(),
      iva: (json['iva'] as num? ?? 0).toDouble(),
      prev: (json['prev'] as num? ?? 0).toDouble(),
      prv: (json['prv'] as num? ?? 0).toDouble(),
      impuestosTotal: (json['impuestosTotal'] as num? ?? 0).toDouble(),
      honorarios: (json['honorarios'] as num? ?? 0).toDouble(),
      cargoExpress: (json['cargoExpress'] as num? ?? 0).toDouble(),
      total: (json['total'] as num? ?? 0).toDouble(),
      notas: json['notas']?.toString(),
      fechaExpiracion: json['fechaExpiracion']?.toString(),
      fechaEnvio: json['fechaEnvio']?.toString(),
      enviadoPor: json['enviadoPor']?.toString(),
      enviadoA: json['enviadoA']?.toString(),
    );
  }
}

class CandidatoPrecio {
  const CandidatoPrecio({
    required this.precioEstimadoId,
    required this.fraccion,
    required this.modeloCatalogo,
    required this.marcaTextoCatalogo,
    required this.hojaOrigen,
    required this.matchTipo,
    required this.score,
    required this.antiguedadDisponible,
    required this.esAntiguedadExacta,
    required this.precioUsd,
    required this.esSugerido,
    required this.aniosDisponibles,
    required this.esGenerico,
    this.inciso,
  });

  final String precioEstimadoId;
  final String fraccion;
  final String modeloCatalogo;
  final String marcaTextoCatalogo;
  final String hojaOrigen;
  final String matchTipo;
  final double score;
  final int antiguedadDisponible;
  final bool esAntiguedadExacta;
  final double precioUsd;
  final bool esSugerido;
  final List<int> aniosDisponibles;
  final bool esGenerico;
  final String? inciso;

  factory CandidatoPrecio.fromJson(Map<String, dynamic> json) {
    return CandidatoPrecio(
      precioEstimadoId: json['precioEstimadoId']?.toString() ?? '',
      fraccion: json['fraccion']?.toString() ?? '',
      modeloCatalogo: json['modeloCatalogo']?.toString() ?? '',
      marcaTextoCatalogo: json['marcaTextoCatalogo']?.toString() ?? '',
      hojaOrigen: json['hojaOrigen']?.toString() ?? '',
      matchTipo: json['matchTipo']?.toString() ?? '',
      score: (json['score'] as num? ?? 0).toDouble(),
      antiguedadDisponible: json['antiguedadDisponible'] as int? ?? 0,
      esAntiguedadExacta: json['esAntiguedadExacta'] as bool? ?? false,
      precioUsd: (json['precioUsd'] as num? ?? 0).toDouble(),
      esSugerido: json['esSugerido'] as bool? ?? false,
      aniosDisponibles: (json['aniosDisponibles'] as List? ?? [])
          .map((item) => item as int)
          .toList(),
      esGenerico: json['esGenerico'] as bool? ?? false,
      inciso: json['inciso']?.toString(),
    );
  }
}

class CandidatosPrecioOutput {
  const CandidatosPrecioOutput({
    this.marca,
    this.modelo,
    this.anno,
    required this.antiguedadAnios,
    required this.requiereSeleccion,
    required this.candidatos,
  });

  final String? marca;
  final String? modelo;
  final int? anno;
  final int antiguedadAnios;
  final bool requiereSeleccion;
  final List<CandidatoPrecio> candidatos;

  factory CandidatosPrecioOutput.fromJson(Map<String, dynamic> json) {
    return CandidatosPrecioOutput(
      marca: json['marca']?.toString(),
      modelo: json['modelo']?.toString(),
      anno: json['anno'] as int?,
      antiguedadAnios: json['antiguedadAnios'] as int? ?? 0,
      requiereSeleccion: json['requiereSeleccion'] as bool? ?? false,
      candidatos: (json['candidatos'] as List? ?? [])
          .map((item) => CandidatoPrecio.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class VehicleDecodedDto {
  const VehicleDecodedDto({
    required this.vin,
    this.make,
    this.model,
    this.modelYear,
    this.manufacturer,
    this.vehicleType,
    this.bodyClass,
    this.engineCylinders,
    this.displacementCC,
    this.fuelTypePrimary,
    this.plantCountry,
  });

  final String vin;
  final String? make;
  final String? model;
  final int? modelYear;
  final String? manufacturer;
  final String? vehicleType;
  final String? bodyClass;
  final int? engineCylinders;
  final double? displacementCC;
  final String? fuelTypePrimary;
  final String? plantCountry;

  factory VehicleDecodedDto.fromJson(Map<String, dynamic> json) {
    return VehicleDecodedDto(
      vin: json['vin']?.toString() ?? '',
      make: json['make']?.toString() ?? json['makeName']?.toString(),
      model: json['model']?.toString() ?? json['modelName']?.toString(),
      modelYear: json['modelYear'] as int? ?? (json['year'] as int?),
      manufacturer: json['manufacturer']?.toString(),
      vehicleType: json['vehicleType']?.toString(),
      bodyClass: json['bodyClass']?.toString(),
      engineCylinders: json['engineCylinders'] as int?,
      displacementCC:
          (json['displacementCC'] as num?)?.toDouble() ??
          (json['displacementCc'] as num?)?.toDouble(),
      fuelTypePrimary: json['fuelTypePrimary']?.toString(),
      plantCountry: json['plantCountry']?.toString(),
    );
  }
}

class TipoCambioDto {
  const TipoCambioDto({
    required this.fecha,
    required this.tipoCambio,
    required this.fuente,
    required this.contexto,
    this.nota,
    required this.fetchedAt,
    required this.isStale,
  });

  final String fecha;
  final double tipoCambio;
  final String fuente;
  final String contexto;
  final String? nota;
  final String fetchedAt;
  final bool isStale;

  factory TipoCambioDto.fromJson(Map<String, dynamic> json) {
    return TipoCambioDto(
      fecha: json['fecha']?.toString() ?? '',
      tipoCambio: (json['tipoCambio'] as num? ?? 0).toDouble(),
      fuente: json['fuente']?.toString() ?? '',
      contexto: json['contexto']?.toString() ?? '',
      nota: json['nota']?.toString(),
      fetchedAt: json['fetchedAt']?.toString() ?? '',
      isStale: json['isStale'] as bool? ?? false,
    );
  }
}

class WhatsAppLinkResponse {
  const WhatsAppLinkResponse({
    required this.whatsappUrl,
    required this.pdfUrl,
    required this.mensaje,
  });

  final String whatsappUrl;
  final String pdfUrl;
  final String mensaje;

  factory WhatsAppLinkResponse.fromJson(Map<String, dynamic> json) {
    return WhatsAppLinkResponse(
      whatsappUrl: json['whatsappUrl']?.toString() ?? '',
      pdfUrl: json['pdfUrl']?.toString() ?? '',
      mensaje: json['mensaje']?.toString() ?? '',
    );
  }
}

class ConvertirCotizacionRequest {
  const ConvertirCotizacionRequest({
    required this.aduanaCodigo,
    required this.tramitadorId,
    required this.tipoTramite,
    this.notasAdicionales,
  });

  final String aduanaCodigo;
  final String tramitadorId;
  final String tipoTramite;
  final String? notasAdicionales;

  Map<String, dynamic> toJson() {
    return {
      'aduanaCodigo': aduanaCodigo,
      'tramitadorId': tramitadorId,
      'tipoTramite': tipoTramite,
      'notasAdicionales': notasAdicionales,
    };
  }
}

class AduanaDto {
  const AduanaDto({
    required this.id,
    required this.claveAduana,
    required this.nombre,
    required this.ciudad,
    required this.estado,
  });

  final String id;
  final String claveAduana;
  final String nombre;
  final String ciudad;
  final String estado;

  factory AduanaDto.fromJson(Map<String, dynamic> json) {
    return AduanaDto(
      id: json['id']?.toString() ?? '',
      claveAduana: json['claveAduana']?.toString() ?? '',
      nombre: json['nombre']?.toString() ?? '',
      ciudad: json['ciudad']?.toString() ?? '',
      estado: json['estado']?.toString() ?? '',
    );
  }
}

class TramitadorDto {
  const TramitadorDto({
    required this.id,
    required this.nombre,
    this.apellidos,
    this.rfc,
  });

  final String id;
  final String nombre;
  final String? apellidos;
  final String? rfc;

  String get nombreCompleto => '$nombre ${apellidos ?? ''}'.trim();

  factory TramitadorDto.fromJson(Map<String, dynamic> json) {
    return TramitadorDto(
      id: json['id']?.toString() ?? '',
      nombre: json['nombre']?.toString() ?? '',
      apellidos: json['apellidos']?.toString(),
      rfc: json['rfc']?.toString(),
    );
  }
}
