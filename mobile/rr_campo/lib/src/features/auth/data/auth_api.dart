import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_client.dart';
import '../domain/auth_models.dart';

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ref.watch(apiClientProvider));
});

class AuthApi {
  const AuthApi(this._api);

  final ApiClient _api;

  /// Lista de usuarios activos que YA tienen PIN configurado.
  Future<List<CampoUser>> getCampoUsers() async {
    final result = await _api.getJson('/api/auth/campo-users') as List<dynamic>;
    return result
        .map((item) => CampoUser.fromJson(item as Map<String, dynamic>))
        .where((user) => user.tienePin) // ← SEGURIDAD: solo los que tienen PIN
        .toList();
  }

  /// Login con PIN (campo / choferes).
  Future<LoginResponse> pinLogin({
    required String username,
    required String pin,
  }) async {
    final result =
        await _api.postJson('/api/auth/pin-login', {
              'username': username,
              'pin': pin,
            })
            as Map<String, dynamic>;
    return LoginResponse.fromJson(result);
  }

  /// Login con usuario y contraseña (admin / supervisores / dueño).
  Future<LoginResponse> login({
    required String username,
    required String password,
  }) async {
    final result =
        await _api.postJson('/api/auth/login', {
              'username': username,
              'password': password,
            })
            as Map<String, dynamic>;
    return LoginResponse.fromJson(result);
  }

  /// Solicitar reset de PIN al administrador.
  Future<void> requestPinReset(String username) async {
    await _api.postJson('/api/auth/forgot-pin', {'username': username});
  }
}
