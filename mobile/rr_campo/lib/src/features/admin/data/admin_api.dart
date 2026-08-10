import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../shared/api/api_client.dart';
import '../domain/admin_models.dart';

final adminApiProvider = Provider<AdminApi>((ref) {
  return AdminApi(ref.watch(apiClientProvider));
});

class AdminApi {
  const AdminApi(this._api);

  final ApiClient _api;

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARDS
  // ═══════════════════════════════════════════════════════════════════════════

  Future<TramiteDashboardDto> getTramitesDashboard() async {
    final response =
        await _api.getJson('/api/tramites/dashboard') as Map<String, dynamic>;
    return TramiteDashboardDto.fromJson(response);
  }

  Future<CotizacionDashboardDto> getCotizacionesDashboard() async {
    final response =
        await _api.getJson('/api/cotizaciones/dashboard')
            as Map<String, dynamic>;
    return CotizacionDashboardDto.fromJson(response);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAMITES
  // ═══════════════════════════════════════════════════════════════════════════

  Future<PagedResult<TramiteListDto>> getTramites({
    String? search,
    String? estado,
    String? tramitadorId,
    String? clienteId,
    String? aduanaId,
    String? loteId,
    String? fechaDesde,
    String? fechaHasta,
    String? orderBy,
    String? orderDir,
    int page = 1,
    int pageSize = 20,
  }) async {
    final response =
        await _api.getJson('/api/tramites', {
              'search': ?search,
              'estado': ?estado,
              'tramitadorId': ?tramitadorId,
              'clienteId': ?clienteId,
              'aduanaId': ?aduanaId,
              'loteId': ?loteId,
              'fechaDesde': ?fechaDesde,
              'fechaHasta': ?fechaHasta,
              'orderBy': ?orderBy,
              'orderDir': ?orderDir,
              'page': page.toString(),
              'pageSize': pageSize.toString(),
            })
            as Map<String, dynamic>;

    return PagedResult.fromJson(response, TramiteListDto.fromJson);
  }

  Future<TramiteDetailDto> getTramiteById(String id) async {
    final response =
        await _api.getJson('/api/tramites/$id') as Map<String, dynamic>;
    return TramiteDetailDto.fromJson(response);
  }

  Future<dynamic> cambiarEstadoTramite(
    String id, {
    required String nuevoEstado,
    String? notas,
    String? fechaEvento,
  }) async {
    return await _api.postJson('/api/tramites/$id/cambiar-estado', {
      'nuevoEstado': nuevoEstado,
      'notas': ?notas,
      'fechaEvento': ?fechaEvento,
    });
  }

  Future<dynamic> agregarNotaTramite(String id, String contenido) async {
    return await _api.postJson('/api/tramites/$id/notas', {
      'contenido': contenido,
    });
  }

  Future<dynamic> agregarPedimento(
    String id, {
    required String numeroPedimento,
    required String tipo,
    String? patente,
    double? igi,
    double? dta,
    double? iva,
    double? totalContribuciones,
    String? fechaEntrada,
  }) async {
    return await _api.postJson('/api/tramites/$id/pedimentos', {
      'numeroPedimento': numeroPedimento,
      'tipo': tipo,
      'patente': ?patente,
      'igi': ?igi,
      'dta': ?dta,
      'iva': ?iva,
      'totalContribuciones': ?totalContribuciones,
      'fechaEntrada': ?fechaEntrada,
    });
  }

  /// Estados a los que se puede transicionar desde [estadoActual].
  /// El backend valida el flujo; el móvil solo debe ofrecer estos.
  Future<List<String>> getTransicionesEstado(String estadoActual) async {
    final response =
        await _api.getJson('/api/estados/$estadoActual/transiciones')
            as List<dynamic>;
    return response.map((item) => item.toString()).toList();
  }

  /// Registra el acuse de entrega física del vehículo.
  Future<dynamic> agregarEntrega(
    String tramiteId, {
    required String ubicacionEntrega,
    required String nombreRecibe,
    required List<String> documentosEntregados,
    String? descripcion,
    String? fotoEvidenciaUrl,
  }) async {
    return await _api.postJson('/api/tramites/$tramiteId/entregas', {
      'ubicacionEntrega': ubicacionEntrega,
      'nombreRecibe': nombreRecibe,
      'documentosEntregados': documentosEntregados,
      'descripcion': ?descripcion,
      'fotoEvidenciaUrl': ?fotoEvidenciaUrl,
    });
  }

  /// Sube la foto de evidencia (o firma escaneada) de una entrega.
  Future<String> uploadEvidenciaEntrega(XFile file) async {
    final response =
        await _api.uploadFile('/api/tramites/upload-evidencia', file)
            as Map<String, dynamic>;
    return response['url']?.toString() ?? '';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGOS
  // ═══════════════════════════════════════════════════════════════════════════

  Future<dynamic> registrarPago({
    required String tramiteId,
    required double monto,
    required String moneda,
    required String metodo,
    required String fechaPago,
    double? tipoCambio,
    String? banco,
    String? referencia,
    String? notas,
  }) async {
    return await _api.postJson('/api/pagos', {
      'tramiteId': tramiteId,
      'monto': monto,
      'moneda': moneda,
      'metodo': metodo,
      'fechaPago': fechaPago,
      'tipoCambio': ?tipoCambio,
      'banco': ?banco,
      'referencia': ?referencia,
      'notas': ?notas,
    });
  }

  Future<void> eliminarPago(String pagoId) async {
    await _api.deleteJson('/api/pagos/$pagoId');
  }

  /// Libro mayor global de pagos ("Más > Pagos"), cruzando todos los trámites.
  Future<PagedResult<PagoListDto>> getPagos({
    String? search,
    String? fechaDesde,
    String? fechaHasta,
    bool? verificado,
    String? metodo,
    int page = 1,
    int pageSize = 20,
  }) async {
    final verificadoParam = verificado?.toString();
    final response =
        await _api.getJson('/api/pagos', {
              'search': ?search,
              'fechaDesde': ?fechaDesde,
              'fechaHasta': ?fechaHasta,
              'verificado': ?verificadoParam,
              'metodo': ?metodo,
              'page': page.toString(),
              'pageSize': pageSize.toString(),
            })
            as Map<String, dynamic>;
    return PagedResult.fromJson(response, PagoListDto.fromJson);
  }

  Future<PagoVerificarResponse> verificarPago(String pagoId) async {
    final response =
        await _api.postJson('/api/pagos/$pagoId/verificar', {})
            as Map<String, dynamic>;
    return PagoVerificarResponse.fromJson(response);
  }

  Future<PagoVerificarResponse> verificarPagosBulk(
    List<String> pagoIds,
  ) async {
    final response =
        await _api.postJson('/api/pagos/verificar-bulk', {
              'pagoIds': pagoIds,
            })
            as Map<String, dynamic>;
    return PagoVerificarResponse.fromJson(response);
  }

  Future<void> regenerarRecibo(String pagoId) async {
    await _api.postJson('/api/pagos/$pagoId/recibo/regenerar', {});
  }

  /// Descarga el PDF del recibo cuando aún no tiene `reciboPagoUrl` público
  /// (lo genera el backend al vuelo). Requiere token porque pasa por el
  /// controller protegido, a diferencia de un archivo ya subido a storage.
  Future<List<int>> getPagoRecibo(String pagoId) async {
    return _api.getBytes('/api/pagos/$pagoId/recibo');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GASTOS HORMIGA
  // ═══════════════════════════════════════════════════════════════════════════

  Future<List<TipoGastoDto>> getTiposGasto() async {
    final response = await _api.getJson('/api/tipos-gasto') as List<dynamic>;
    return response
        .map((item) => TipoGastoDto.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<dynamic> registrarGasto({
    required String tipoGastoId,
    required String concepto,
    required double monto,
    required String moneda,
    required bool seCargaAlCliente,
    required String fechaGasto,
    String? tramiteId,
    String? clienteId,
    String? vehiculoId,
  }) async {
    return await _api.postJson('/api/gastos-hormiga', {
      'tipoGastoId': tipoGastoId,
      'concepto': concepto,
      'monto': monto,
      'moneda': moneda,
      'seCargaAlCliente': seCargaAlCliente,
      'fechaGasto': fechaGasto,
      'tramiteId': ?tramiteId,
      'clienteId': ?clienteId,
      'vehiculoId': ?vehiculoId,
    });
  }

  Future<void> eliminarGasto(String gastoId) async {
    await _api.deleteJson('/api/gastos-hormiga/$gastoId');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COTIZACIONES
  // ═══════════════════════════════════════════════════════════════════════════

  Future<PagedResult<CotizacionListDto>> getCotizaciones({
    String? search,
    String? estado,
    String? clienteId,
    int page = 1,
    int pageSize = 20,
  }) async {
    final response =
        await _api.getJson('/api/cotizaciones', {
              'search': ?search,
              'estado': ?estado,
              'clienteId': ?clienteId,
              'page': page.toString(),
              'pageSize': pageSize.toString(),
            })
            as Map<String, dynamic>;

    return PagedResult.fromJson(response, CotizacionListDto.fromJson);
  }

  Future<CotizacionOutput> getCotizacionById(String id) async {
    final response =
        await _api.getJson('/api/cotizaciones/$id') as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<CotizacionOutput> calcularCotizacion(CotizacionInput input) async {
    final response =
        await _api.postJson('/api/cotizaciones/calcular', input.toJson())
            as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<CandidatosPrecioOutput> obtenerCandidatos(
    CotizacionInput input,
  ) async {
    final response =
        await _api.postJson('/api/cotizaciones/candidatos', input.toJson())
            as Map<String, dynamic>;
    return CandidatosPrecioOutput.fromJson(response);
  }

  Future<VehicleDecodedDto> decodeVin(String vin) async {
    final response =
        await _api.getJson('/api/cotizaciones/decode-vin/$vin')
            as Map<String, dynamic>;
    return VehicleDecodedDto.fromJson(response);
  }

  Future<TipoCambioDto> getTipoCambio([String contexto = 'FIX']) async {
    final response =
        await _api.getJson('/api/cotizaciones/tipo-cambio', {
              'contexto': contexto,
            })
            as Map<String, dynamic>;
    return TipoCambioDto.fromJson(response);
  }

  Future<CotizacionOutput> crearCotizacion(
    GuardarCotizacionRequest request,
  ) async {
    final response =
        await _api.postJson('/api/cotizaciones', request.toJson())
            as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<CotizacionOutput> actualizarCotizacion(
    String id,
    GuardarCotizacionRequest request,
  ) async {
    final response =
        await _api.putJson('/api/cotizaciones/$id', request.toJson())
            as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<WhatsAppLinkResponse> getWhatsAppLink(String id) async {
    final response =
        await _api.postJson('/api/cotizaciones/$id/whatsapp-link', {})
            as Map<String, dynamic>;
    return WhatsAppLinkResponse.fromJson(response);
  }

  Future<TramiteDetailDto> convertirATramite(
    String id,
    ConvertirCotizacionRequest request,
  ) async {
    final response =
        await _api.postJson(
              '/api/cotizaciones/$id/convertir-a-tramite',
              request.toJson(),
            )
            as Map<String, dynamic>;
    return TramiteDetailDto.fromJson(response);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENTES
  // ═══════════════════════════════════════════════════════════════════════════

  Future<PagedResult<ClienteListDto>> getClientes({
    String? search,
    String? procedencia,
    int page = 1,
    int pageSize = 20,
    String? orderBy,
  }) async {
    final response =
        await _api.getJson('/api/clientes', {
              'search': ?search,
              'procedencia': ?procedencia,
              'page': page.toString(),
              'pageSize': pageSize.toString(),
              'orderBy': ?orderBy,
            })
            as Map<String, dynamic>;
    return PagedResult.fromJson(response, ClienteListDto.fromJson);
  }

  Future<ClienteDetailDto> getClienteById(String id) async {
    final response =
        await _api.getJson('/api/clientes/$id') as Map<String, dynamic>;
    return ClienteDetailDto.fromJson(response);
  }

  Future<ClienteDetailDto> crearCliente(ClienteRequest request) async {
    final response =
        await _api.postJson('/api/clientes', request.toJson())
            as Map<String, dynamic>;
    return ClienteDetailDto.fromJson(response);
  }

  Future<ClienteDetailDto> actualizarCliente(
    String id,
    ClienteRequest request,
  ) async {
    final response =
        await _api.putJson('/api/clientes/$id', request.toJson())
            as Map<String, dynamic>;
    return ClienteDetailDto.fromJson(response);
  }

  Future<void> eliminarCliente(String id) async {
    await _api.deleteJson('/api/clientes/$id');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTARIO
  // ═══════════════════════════════════════════════════════════════════════════

  Future<List<VehiculoListDto>> getInventario() async {
    final response =
        await _api.getJson('/api/vehiculos/inventario') as List<dynamic>;
    return response
        .map((item) => VehiculoListDto.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATALOGOS (CLIENTES, ADUANAS, TRAMITADORES)
  // ═══════════════════════════════════════════════════════════════════════════

  Future<List<ClienteListDto>> searchClientesAutocomplete(String q) async {
    final response =
        await _api.getJson('/api/clientes/search', {'q': q}) as List<dynamic>;
    return response
        .map((item) => ClienteListDto.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<AduanaDto>> getAduanas() async {
    final response = await _api.getJson('/api/aduanas') as List<dynamic>;
    return response
        .map((item) => AduanaDto.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<TramitadorDto>> getTramitadores({bool soloActivos = true}) async {
    final response =
        await _api.getJson('/api/tramitadores', {
              'soloActivos': soloActivos.toString(),
            })
            as List<dynamic>;
    return response
        .map((item) => TramitadorDto.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
