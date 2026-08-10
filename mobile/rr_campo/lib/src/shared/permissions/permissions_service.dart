import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permission_handler/permission_handler.dart';

import '../api/api_client.dart';

final permissionsServiceProvider = Provider<PermissionsService>((ref) {
  return PermissionsService(ref.watch(secureStorageProvider));
});

/// Permisos que la app necesita para operar en campo: cámara para
/// evidencia/VIN y notificaciones para avisos de tareas.
///
/// Se piden todos juntos una sola vez, justo después del primer login,
/// en lugar de sorprender al usuario cuando abre cada función.
class PermissionsService {
  PermissionsService(this._storage);

  final FlutterSecureStorage _storage;

  static const _requestedKey = 'initial_permissions_requested';

  static const List<Permission> _initialPermissions = [
    Permission.camera,
    Permission.notification,
  ];

  Future<bool> wasRequested() async {
    return await _storage.read(key: _requestedKey) == 'true';
  }

  Future<void> requestInitial() async {
    await _storage.write(key: _requestedKey, value: 'true');
    for (final permission in _initialPermissions) {
      await permission.request();
    }
  }
}
