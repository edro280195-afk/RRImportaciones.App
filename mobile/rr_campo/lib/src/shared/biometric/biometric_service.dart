import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import '../api/api_client.dart';

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService(ref.watch(secureStorageProvider));
});

/// Servicio de autenticación biométrica (Face ID / Touch ID / Fingerprint).
///
/// La biometría no reemplaza el login real: desbloquea la sesión JWT
/// guardada en SecureStorage después de un login previo exitoso.
class BiometricService {
  BiometricService(this._storage);

  final _auth = LocalAuthentication();
  final FlutterSecureStorage _storage;

  static const _enabledKey = 'biometric_enabled';

  /// ¿El dispositivo soporta algún tipo de biometría?
  Future<bool> isAvailable() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } catch (_) {
      return false;
    }
  }

  /// Obtiene los tipos de biometría disponibles (face, fingerprint, etc.)
  Future<List<BiometricType>> getAvailableTypes() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return const [];
    }
  }

  /// Etiqueta legible: "Face ID", "Huella digital", o "Biometría".
  Future<String> getBiometricLabel() async {
    final types = await getAvailableTypes();
    if (types.contains(BiometricType.face)) return 'Face ID';
    if (types.contains(BiometricType.fingerprint)) return 'Huella digital';
    return 'Biometría';
  }

  /// Intentar autenticación biométrica del sistema operativo.
  Future<bool> authenticate({
    String localizedReason = 'Confirma tu identidad para entrar a R&R',
  }) async {
    try {
      return await _auth.authenticate(
        localizedReason: localizedReason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }

  /// ¿El usuario activó la biometría en esta app?
  Future<bool> isEnabled() async {
    final value = await _storage.read(key: _enabledKey);
    return value == 'true';
  }

  /// Activar/desactivar biometría para esta app.
  Future<void> setEnabled(bool enabled) async {
    await _storage.write(key: _enabledKey, value: enabled ? 'true' : 'false');
  }

  /// Valida la biometría antes de activarla en este dispositivo.
  Future<bool> enable() async {
    if (!await isAvailable()) return false;

    final authenticated = await authenticate(
      localizedReason: 'Confirma tu identidad para activar la biometría',
    );
    if (!authenticated) return false;

    await setEnabled(true);
    return true;
  }

  /// Elimina la preferencia biométrica del dispositivo.
  Future<void> clear() async {
    await _storage.delete(key: _enabledKey);
  }
}

final biometricEnabledStateProvider =
    AsyncNotifierProvider<BiometricEnabledStateNotifier, bool>(
      BiometricEnabledStateNotifier.new,
    );

class BiometricEnabledStateNotifier extends AsyncNotifier<bool> {
  @override
  Future<bool> build() async {
    final biometric = ref.watch(biometricServiceProvider);
    return biometric.isEnabled();
  }

  Future<bool> toggle(bool enabled) async {
    final biometric = ref.read(biometricServiceProvider);
    if (!enabled) {
      await biometric.setEnabled(false);
      state = const AsyncData(false);
      return true;
    }

    final activated = await biometric.enable();
    state = AsyncData(activated);
    return activated;
  }
}

final biometricAvailableProvider = FutureProvider<bool>((ref) {
  return ref.watch(biometricServiceProvider).isAvailable();
});

final biometricLabelProvider = FutureProvider<String>((ref) {
  return ref.watch(biometricServiceProvider).getBiometricLabel();
});
