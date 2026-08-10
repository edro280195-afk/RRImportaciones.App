import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_client.dart';
import '../domain/auth_models.dart';

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ref.watch(apiClientProvider));
});

class AuthApi {
  const AuthApi(this._api);

  final ApiClient _api;

  /// Único punto de entrada remoto. Se usa solo la primera vez en cada
  /// dispositivo; el resto de aperturas se resuelven con biometría local.
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
}
