import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../shared/api/api_client.dart';
import '../domain/tarea_campo.dart';

final campoApiProvider = Provider<CampoApi>((ref) {
  return CampoApi(ref.watch(apiClientProvider));
});

class CampoApi {
  const CampoApi(this._api);

  final ApiClient _api;

  String fileUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${_api.baseUrl}$url';
  }

  Future<List<TareaCampo>> getTareas({String? estatus}) async {
    final query = <String, String?>{};
    if (estatus != null) query['EstadoLogistico'] = estatus;

    final result =
        await _api.getJson('/api/campo/tareas', query) as List<dynamic>;
    return result
        .map((item) => TareaCampo.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<TareaCampo> getById(String id) async {
    final result =
        await _api.getJson('/api/campo/tareas/$id') as Map<String, dynamic>;
    return TareaCampo.fromJson(result);
  }

  Future<TareaCampo> crearPreInspeccion({
    required String vin,
    String? marcaId,
    String? modelo,
    int? anno,
    String? ubicacion,
    String? clienteId,
    String? clienteNombreLibre,
    String? descripcionVehiculo,
  }) async {
    final result =
        await _api.postJson('/api/campo/pre-inspecciones', {
              'vin': vin,
              'marcaId': marcaId,
              'modelo': modelo,
              'anno': anno,
              'ubicacion': ubicacion,
              'clienteId': clienteId,
              'clienteNombreLibre': clienteNombreLibre,
              'descripcionVehiculo': descripcionVehiculo ?? 'Registro en yarda',
            })
            as Map<String, dynamic>;
    return TareaCampo.fromJson(result);
  }

  Future<TareaCampo> tomar(String id) async {
    final result =
        await _api.postJson('/api/campo/tareas/$id/tomar', {
              'personalCampoId': null,
            })
            as Map<String, dynamic>;
    return TareaCampo.fromJson(result);
  }

  Future<UploadFotoResponse> uploadFoto(String id, XFile file) async {
    final result =
        await _api.uploadFile('/api/campo/tareas/$id/fotos', file)
            as Map<String, dynamic>;
    return UploadFotoResponse.fromJson(result);
  }

  Future<TareaCampo> completar(
    String id, {
    required String? ubicacion,
    required String? vinConfirmado,
    required List<String> fotosUrls,
    required String? incidencia,
  }) async {
    final result =
        await _api.postJson('/api/campo/tareas/$id/completar', {
              'ubicacion': ubicacion,
              'vinConfirmado': vinConfirmado,
              'fotosUrls': fotosUrls,
              'incidencia': incidencia,
            })
            as Map<String, dynamic>;
    return TareaCampo.fromJson(result);
  }
}
