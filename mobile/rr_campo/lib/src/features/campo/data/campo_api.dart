import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../shared/api/api_client.dart';
import '../domain/tarea_campo.dart';

final campoApiProvider = Provider<CampoApi>((ref) {
  return CampoApi(ref.watch(apiClientProvider));
});

String newCampoClientGuid() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((value) => value.toRadixString(16).padLeft(2, '0'));
  final value = hex.join();
  return '${value.substring(0, 8)}-${value.substring(8, 12)}-'
      '${value.substring(12, 16)}-${value.substring(16, 20)}-'
      '${value.substring(20)}';
}

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
    String? clientOperationId,
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
              'clientOperationId': clientOperationId,
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

  Future<CampoMediaUploadResponse> uploadMedia(
    String id,
    XFile file, {
    required String clientMediaId,
    required String tipo,
    double? videoDurationSeconds,
  }) async {
    final result =
        await _api.uploadFile(
              '/api/campo/tareas/$id/medios',
              file,
              headers: {
                'X-Campo-Media-Id': clientMediaId,
                'X-Campo-Media-Type': tipo,
                if (videoDurationSeconds != null)
                  'X-Campo-Video-Duration': videoDurationSeconds
                      .toStringAsFixed(2),
              },
            )
            as Map<String, dynamic>;
    return CampoMediaUploadResponse.fromJson(result);
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

class CampoMediaUploadResponse {
  const CampoMediaUploadResponse({
    required this.clientMediaId,
    required this.tipo,
    required this.url,
    required this.yaExistia,
    required this.tarea,
  });

  final String clientMediaId;
  final String tipo;
  final String url;
  final bool yaExistia;
  final TareaCampo tarea;

  factory CampoMediaUploadResponse.fromJson(Map<String, dynamic> json) {
    return CampoMediaUploadResponse(
      clientMediaId: json['clientMediaId'].toString(),
      tipo: json['tipo']?.toString() ?? 'FOTO',
      url: json['url'].toString(),
      yaExistia: json['yaExistia'] == true,
      tarea: TareaCampo.fromJson(json['tarea'] as Map<String, dynamic>),
    );
  }
}
