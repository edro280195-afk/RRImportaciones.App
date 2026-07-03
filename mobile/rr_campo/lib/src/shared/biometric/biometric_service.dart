import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import '../api/api_client.dart';
import '../session/session_controller.dart';

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService(ref.watch(secureStorageProvider));
});

/// La biometría protege una sesión ya creada; nunca sustituye al login remoto.
class BiometricService {
  BiometricService(this._storage);

  final _auth = LocalAuthentication();
  final FlutterSecureStorage _storage;

  static const _enabledUserKey = 'biometric_enabled_user_id';
  static const _legacyEnabledKey = 'biometric_enabled';
  static const _promptedPrefix = 'biometric_prompted_';

  Future<bool> isAvailable() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } catch (_) {
      return false;
    }
  }

  Future<List<BiometricType>> getAvailableTypes() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return const [];
    }
  }

  Future<String> getBiometricLabel() async {
    final types = await getAvailableTypes();
    if (types.contains(BiometricType.face)) return 'Face ID';
    if (types.contains(BiometricType.fingerprint)) return 'Huella digital';
    return 'Biometría';
  }

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

  /// La habilitación se asocia a la cuenta para no heredarla al cambiar usuario.
  Future<bool> isEnabledFor(String userId) async {
    // La versión anterior guardaba solamente "true"; no se puede saber quién
    // autorizó esa preferencia, así que se descarta de forma segura.
    await _storage.delete(key: _legacyEnabledKey);
    final enabledUserId = await _storage.read(key: _enabledUserKey);
    return enabledUserId == userId;
  }

  Future<void> disableFor(String userId) async {
    if (await isEnabledFor(userId)) {
      await _storage.delete(key: _enabledUserKey);
    }
  }

  Future<bool> enableFor(String userId) async {
    if (!await isAvailable()) return false;

    final authenticated = await authenticate(
      localizedReason: 'Confirma tu identidad para activar la biometría',
    );
    if (!authenticated) return false;

    await _storage.write(key: _enabledUserKey, value: userId);
    await markOfferedFor(userId);
    return true;
  }

  Future<bool> wasOfferedFor(String userId) async {
    return await _storage.read(key: '$_promptedPrefix$userId') == 'true';
  }

  Future<void> markOfferedFor(String userId) async {
    await _storage.write(key: '$_promptedPrefix$userId', value: 'true');
  }
}

final biometricEnabledStateProvider =
    AsyncNotifierProvider<BiometricEnabledStateNotifier, bool>(
      BiometricEnabledStateNotifier.new,
    );

class BiometricEnabledStateNotifier extends AsyncNotifier<bool> {
  @override
  Future<bool> build() async {
    final session = ref.watch(sessionControllerProvider);
    final userId = session.asData?.value.user?.id;
    if (userId == null) return false;

    return ref.watch(biometricServiceProvider).isEnabledFor(userId);
  }

  Future<bool> toggle(bool enabled) async {
    final userId = ref.read(sessionControllerProvider).asData?.value.user?.id;
    if (userId == null) return false;

    final biometric = ref.read(biometricServiceProvider);
    if (!enabled) {
      await biometric.disableFor(userId);
      state = const AsyncData(false);
      return true;
    }

    final activated = await biometric.enableFor(userId);
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
