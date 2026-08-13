import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../domain/tarea_campo.dart';
import 'campo_api.dart';

final campoOfflineProvider = Provider<CampoOfflineService>((ref) {
  return CampoOfflineService(ref.watch(campoApiProvider));
});

enum OfflineMediaType { foto, video }

class OfflineMediaItem {
  OfflineMediaItem({
    required this.id,
    required this.path,
    required this.type,
    required this.fileName,
    this.durationSeconds,
    this.uploaded = false,
  });

  final String id;
  final String path;
  final OfflineMediaType type;
  final String fileName;
  final double? durationSeconds;
  bool uploaded;

  Map<String, dynamic> toJson() => {
    'id': id,
    'path': path,
    'type': type.name,
    'fileName': fileName,
    'durationSeconds': durationSeconds,
    'uploaded': uploaded,
  };

  factory OfflineMediaItem.fromJson(Map<String, dynamic> json) {
    return OfflineMediaItem(
      id: json['id'].toString(),
      path: json['path'].toString(),
      type: json['type'] == 'video'
          ? OfflineMediaType.video
          : OfflineMediaType.foto,
      fileName: json['fileName']?.toString() ?? 'captura.jpg',
      durationSeconds: (json['durationSeconds'] as num?)?.toDouble(),
      uploaded: json['uploaded'] == true,
    );
  }
}

class CampoOfflineDraft {
  CampoOfflineDraft({
    required this.id,
    required this.clientOperationId,
    required this.vin,
    required this.descripcionVehiculo,
    required this.ubicacion,
    required this.clienteId,
    required this.clienteNombreLibre,
    required this.marcaId,
    required this.modelo,
    required this.anno,
    required this.incidencia,
    required this.media,
    this.serverTaskId,
    this.status = 'BORRADOR',
  });

  final String id;
  final String clientOperationId;
  String vin;
  final String descripcionVehiculo;
  String? ubicacion;
  final String? clienteId;
  final String? clienteNombreLibre;
  final String? marcaId;
  final String? modelo;
  final int? anno;
  String? incidencia;
  final List<OfflineMediaItem> media;
  String? serverTaskId;
  String status;

  bool get readyToSync => status == 'LISTO' || status == 'ERROR';

  Map<String, dynamic> toJson() => {
    'id': id,
    'clientOperationId': clientOperationId,
    'vin': vin,
    'descripcionVehiculo': descripcionVehiculo,
    'ubicacion': ubicacion,
    'clienteId': clienteId,
    'clienteNombreLibre': clienteNombreLibre,
    'marcaId': marcaId,
    'modelo': modelo,
    'anno': anno,
    'incidencia': incidencia,
    'media': media.map((item) => item.toJson()).toList(),
    'serverTaskId': serverTaskId,
    'status': status,
  };

  factory CampoOfflineDraft.fromJson(Map<String, dynamic> json) {
    return CampoOfflineDraft(
      id: json['id'].toString(),
      clientOperationId: json['clientOperationId'].toString(),
      vin: json['vin']?.toString() ?? '',
      descripcionVehiculo:
          json['descripcionVehiculo']?.toString() ?? 'Registro en yarda',
      ubicacion: json['ubicacion']?.toString(),
      clienteId: json['clienteId']?.toString(),
      clienteNombreLibre: json['clienteNombreLibre']?.toString(),
      marcaId: json['marcaId']?.toString(),
      modelo: json['modelo']?.toString(),
      anno: (json['anno'] as num?)?.toInt(),
      incidencia: json['incidencia']?.toString(),
      media: (json['media'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(OfflineMediaItem.fromJson)
          .toList(),
      serverTaskId: json['serverTaskId']?.toString(),
      status: json['status']?.toString() ?? 'BORRADOR',
    );
  }
}

class CampoOfflineService {
  CampoOfflineService(this._api);

  final CampoApi _api;
  final List<CampoOfflineDraft> _drafts = [];
  Directory? _root;
  File? _index;
  bool _loaded = false;
  Future<void>? _syncing;

  List<CampoOfflineDraft> get drafts => List.unmodifiable(_drafts);

  Future<void> initialize() async {
    if (_loaded) return;
    final base = await getApplicationDocumentsDirectory();
    _root = Directory('${base.path}${Platform.pathSeparator}campo_offline');
    await _root!.create(recursive: true);
    _index = File('${_root!.path}${Platform.pathSeparator}index.json');
    if (await _index!.exists()) {
      try {
        final raw = await _index!.readAsString();
        final values = jsonDecode(raw) as List<dynamic>;
        _drafts
          ..clear()
          ..addAll(
            values.whereType<Map<String, dynamic>>().map(
              CampoOfflineDraft.fromJson,
            ),
          );
      } catch (_) {
        _drafts.clear();
      }
    }
    _loaded = true;
  }

  Future<CampoOfflineDraft> createDraft({
    required String vin,
    required String descripcionVehiculo,
    String? ubicacion,
    String? clienteId,
    String? clienteNombreLibre,
    String? marcaId,
    String? modelo,
    int? anno,
  }) async {
    await initialize();
    final draft = CampoOfflineDraft(
      id: newCampoClientGuid(),
      clientOperationId: newCampoClientGuid(),
      vin: vin,
      descripcionVehiculo: descripcionVehiculo.trim().isEmpty
          ? 'Registro en yarda'
          : descripcionVehiculo.trim(),
      ubicacion: ubicacion,
      clienteId: clienteId,
      clienteNombreLibre: clienteNombreLibre,
      marcaId: marcaId,
      modelo: modelo,
      anno: anno,
      incidencia: null,
      media: [],
    );
    _drafts.add(draft);
    await _save();
    return draft;
  }

  Future<CampoOfflineDraft?> getDraft(String id) async {
    await initialize();
    for (final draft in _drafts) {
      if (draft.id == id) return draft;
    }
    return null;
  }

  Future<List<TareaCampo>> getTasks() async {
    await initialize();
    return _drafts
        .where((draft) => draft.status != 'COMPLETADO')
        .map(_toTask)
        .toList();
  }

  Future<TareaCampo?> getTask(String id) async {
    final draft = await getDraft(id);
    return draft == null ? null : _toTask(draft);
  }

  Future<void> addMedia(
    String draftId,
    XFile source,
    OfflineMediaType type, {
    double? durationSeconds,
  }) async {
    await initialize();
    final draft = await getDraft(draftId);
    if (draft == null) return;

    final mediaId = newCampoClientGuid();
    final extension = _extension(
      source.name,
      type == OfflineMediaType.video ? 'webm' : 'jpg',
    );
    final directory = Directory(
      '${_root!.path}${Platform.pathSeparator}$draftId',
    );
    await directory.create(recursive: true);
    final target = File(
      '${directory.path}${Platform.pathSeparator}$mediaId.$extension',
    );
    await target.writeAsBytes(await source.readAsBytes(), flush: true);
    draft.media.add(
      OfflineMediaItem(
        id: mediaId,
        path: target.path,
        type: type,
        fileName: target.uri.pathSegments.last,
        durationSeconds: durationSeconds,
      ),
    );
    await _save();
  }

  Future<void> removeMedia(String draftId, String path) async {
    final draft = await getDraft(draftId);
    if (draft == null) return;
    draft.media.removeWhere((item) => item.path == path);
    final file = File(path);
    if (await file.exists()) await file.delete();
    await _save();
  }

  Future<void> updateDraft(
    String id, {
    String? ubicacion,
    required String vin,
    String? incidencia,
  }) async {
    final draft = await getDraft(id);
    if (draft == null) return;
    draft.ubicacion = ubicacion;
    draft.vin = vin;
    draft.incidencia = incidencia;
    await _save();
  }

  Future<void> markReady(
    String id, {
    required String ubicacion,
    required String vin,
    String? incidencia,
  }) async {
    await updateDraft(
      id,
      ubicacion: ubicacion,
      vin: vin,
      incidencia: incidencia,
    );
    final draft = await getDraft(id);
    if (draft == null) return;
    draft.status = 'LISTO';
    await _save();
  }

  Future<void> syncAll() async {
    if (_syncing != null) return _syncing!;
    _syncing = _runSync();
    try {
      await _syncing;
    } finally {
      _syncing = null;
    }
  }

  Future<void> _runSync() async {
    await initialize();
    for (final draft in List<CampoOfflineDraft>.from(_drafts)) {
      if (!draft.readyToSync) continue;
      try {
        await _syncDraft(draft);
      } catch (_) {
        draft.status = 'ERROR';
        await _save();
      }
    }
  }

  Future<void> _syncDraft(CampoOfflineDraft draft) async {
    draft.status = 'SINCRONIZANDO';
    await _save();
    var task = draft.serverTaskId == null
        ? await _api.crearPreInspeccion(
            clientOperationId: draft.clientOperationId,
            vin: draft.vin,
            marcaId: draft.marcaId,
            modelo: draft.modelo,
            anno: draft.anno,
            ubicacion: draft.ubicacion,
            clienteId: draft.clienteId,
            clienteNombreLibre: draft.clienteNombreLibre,
            descripcionVehiculo: draft.descripcionVehiculo,
          )
        : await _api.getById(draft.serverTaskId!);

    draft.serverTaskId ??= task.id;
    await _save();

    if (task.estatus == 'COMPLETADA' || task.estatus == 'INCIDENCIA') {
      draft.status = 'COMPLETADO';
      await _save();
      return;
    }

    for (final media in draft.media) {
      if (media.uploaded) continue;
      final response = await _api.uploadMedia(
        task.id,
        XFile(media.path),
        clientMediaId: media.id,
        tipo: media.type == OfflineMediaType.video ? 'VIDEO' : 'FOTO',
        videoDurationSeconds: media.durationSeconds,
      );
      task = response.tarea;
      media.uploaded = true;
      await _save();
    }

    await _api.completar(
      task.id,
      ubicacion: draft.ubicacion,
      vinConfirmado: draft.vin,
      fotosUrls: task.fotosUrls,
      incidencia: draft.incidencia,
    );
    draft.status = 'COMPLETADO';
    await _save();
    await _deleteFiles(draft);
  }

  TareaCampo _toTask(CampoOfflineDraft draft) {
    final vin = draft.vin.isEmpty ? null : draft.vin;
    return TareaCampo(
      id: draft.id,
      tramiteId: null,
      vehiculoId: null,
      numeroConsecutivo: null,
      clienteNombre: draft.clienteNombreLibre,
      vehiculoResumen: draft.descripcionVehiculo,
      descripcionVehiculo: draft.descripcionVehiculo,
      clienteNombreLibre: draft.clienteNombreLibre,
      vin: vin,
      vinCorto: vin == null || vin.length < 6
          ? vin
          : vin.substring(vin.length - 6),
      tipo: 'PRE_INSPECCION',
      estatus: draft.status == 'COMPLETADO' ? 'COMPLETADA' : 'ABIERTA',
      ubicacion: draft.ubicacion,
      vinConfirmado: vin,
      fotosUrls: [],
      videosUrls: [],
      incidencia: draft.incidencia,
      clientOperationId: draft.clientOperationId,
    );
  }

  Future<void> _save() async {
    await _index!.writeAsString(
      jsonEncode(_drafts.map((draft) => draft.toJson()).toList()),
      flush: true,
    );
  }

  Future<void> _deleteFiles(CampoOfflineDraft draft) async {
    final directory = Directory(
      '${_root!.path}${Platform.pathSeparator}${draft.id}',
    );
    if (await directory.exists()) await directory.delete(recursive: true);
  }

  String _extension(String value, String fallback) {
    final extension = value.contains('.')
        ? value.split('.').last.toLowerCase()
        : '';
    return extension.isEmpty || extension.length > 5 ? fallback : extension;
  }
}
