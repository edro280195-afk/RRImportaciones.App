import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_client.dart';
import '../domain/auth_models.dart';

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ref.watch(apiClientProvider));
});

class AuthApi {
  const AuthApi(this._api);

  final ApiClient _api;

  Future<List<CampoUser>> getCampoUsers() async {
    final result = await _api.getJson('/api/auth/campo-users') as List<dynamic>;
    return result
        .map((item) => CampoUser.fromJson(item as Map<String, dynamic>))
        .toList();
  }

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

  Future<LoginResponse> setInitialCampoPin({
    required String username,
    required String newPin,
  }) async {
    final result =
        await _api.postJson('/api/auth/initial-campo-pin', {
              'username': username,
              'newPin': newPin,
            })
            as Map<String, dynamic>;
    return LoginResponse.fromJson(result);
  }

  Future<void> requestPinReset(String username) async {
    await _api.postJson('/api/auth/forgot-pin', {'username': username});
  }
}
