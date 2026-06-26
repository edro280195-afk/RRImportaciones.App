import 'package:flutter_riverpod/flutter_riverpod.dart';

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
    final response = await _api.getJson('/api/tramites/dashboard') as Map<String, dynamic>;
    return TramiteDashboardDto.fromJson(response);
  }

  Future<CotizacionDashboardDto> getCotizacionesDashboard() async {
    final response = await _api.getJson('/api/cotizaciones/dashboard') as Map<String, dynamic>;
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
    final response = await _api.getJson(
      '/api/tramites',
      {
        if (search != null) 'search': search,
        if (estado != null) 'estado': estado,
        if (tramitadorId != null) 'tramitadorId': tramitadorId,
        if (clienteId != null) 'clienteId': clienteId,
        if (aduanaId != null) 'aduanaId': aduanaId,
        if (loteId != null) 'loteId': loteId,
        if (fechaDesde != null) 'fechaDesde': fechaDesde,
        if (fechaHasta != null) 'fechaHasta': fechaHasta,
        if (orderBy != null) 'orderBy': orderBy,
        if (orderDir != null) 'orderDir': orderDir,
        'page': page.toString(),
        'pageSize': pageSize.toString(),
      },
    ) as Map<String, dynamic>;

    return PagedResult.fromJson(response, TramiteListDto.fromJson);
  }

  Future<TramiteDetailDto> getTramiteById(String id) async {
    final response = await _api.getJson('/api/tramites/$id') as Map<String, dynamic>;
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
      if (notas != null) 'notas': notas,
      if (fechaEvento != null) 'fechaEvento': fechaEvento,
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
      if (patente != null) 'patente': patente,
      if (igi != null) 'igi': igi,
      if (dta != null) 'dta': dta,
      if (iva != null) 'iva': iva,
      if (totalContribuciones != null) 'totalContribuciones': totalContribuciones,
      if (fechaEntrada != null) 'fechaEntrada': fechaEntrada,
    });
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
    final response = await _api.getJson(
      '/api/cotizaciones',
      {
        if (search != null) 'search': search,
        if (estado != null) 'estado': estado,
        if (clienteId != null) 'clienteId': clienteId,
        'page': page.toString(),
        'pageSize': pageSize.toString(),
      },
    ) as Map<String, dynamic>;

    return PagedResult.fromJson(response, CotizacionListDto.fromJson);
  }

  Future<CotizacionOutput> getCotizacionById(String id) async {
    final response = await _api.getJson('/api/cotizaciones/$id') as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<CotizacionOutput> calcularCotizacion(CotizacionInput input) async {
    final response = await _api.postJson('/api/cotizaciones/calcular', input.toJson()) as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<CandidatosPrecioOutput> obtenerCandidatos(CotizacionInput input) async {
    final response = await _api.postJson('/api/cotizaciones/candidatos', input.toJson()) as Map<String, dynamic>;
    return CandidatosPrecioOutput.fromJson(response);
  }

  Future<VehicleDecodedDto> decodeVin(String vin) async {
    final response = await _api.getJson('/api/cotizaciones/decode-vin/$vin') as Map<String, dynamic>;
    return VehicleDecodedDto.fromJson(response);
  }

  Future<TipoCambioDto> getTipoCambio([String contexto = 'FIX']) async {
    final response = await _api.getJson('/api/cotizaciones/tipo-cambio', {'contexto': contexto}) as Map<String, dynamic>;
    return TipoCambioDto.fromJson(response);
  }

  Future<CotizacionOutput> crearCotizacion(GuardarCotizacionRequest request) async {
    final response = await _api.postJson('/api/cotizaciones', request.toJson()) as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<CotizacionOutput> actualizarCotizacion(String id, GuardarCotizacionRequest request) async {
    final response = await _api.putJson('/api/cotizaciones/$id', request.toJson()) as Map<String, dynamic>;
    return CotizacionOutput.fromJson(response);
  }

  Future<WhatsAppLinkResponse> getWhatsAppLink(String id) async {
    final response = await _api.postJson('/api/cotizaciones/$id/whatsapp-link', {}) as Map<String, dynamic>;
    return WhatsAppLinkResponse.fromJson(response);
  }

  Future<TramiteDetailDto> convertirATramite(String id, ConvertirCotizacionRequest request) async {
    final response = await _api.postJson('/api/cotizaciones/$id/convertir-a-tramite', request.toJson()) as Map<String, dynamic>;
    return TramiteDetailDto.fromJson(response);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATALOGOS (CLIENTES, ADUANAS, TRAMITADORES)
  // ═══════════════════════════════════════════════════════════════════════════

  Future<List<ClienteListDto>> searchClientesAutocomplete(String q) async {
    final response = await _api.getJson('/api/clientes/search', {'q': q}) as List<dynamic>;
    return response.map((item) => ClienteListDto.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<List<AduanaDto>> getAduanas() async {
    final response = await _api.getJson('/api/aduanas') as List<dynamic>;
    return response.map((item) => AduanaDto.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<List<TramitadorDto>> getTramitadores({bool soloActivos = true}) async {
    final response = await _api.getJson(
      '/api/tramitadores',
      {'soloActivos': soloActivos.toString()},
    ) as List<dynamic>;
    return response.map((item) => TramitadorDto.fromJson(item as Map<String, dynamic>)).toList();
  }
}
