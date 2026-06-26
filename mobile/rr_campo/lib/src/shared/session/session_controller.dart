import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/domain/auth_models.dart';
import '../api/api_client.dart';

final sessionControllerProvider =
    AsyncNotifierProvider<SessionController, SessionState>(
      SessionController.new,
    );

class SessionState {
  const SessionState({
    required this.token,
    required this.refreshToken,
    required this.user,
  });

  const SessionState.empty() : token = null, refreshToken = null, user = null;

  final String? token;
  final String? refreshToken;
  final UserInfo? user;

  bool get isAuthenticated => token != null && user != null;
}

class SessionController extends AsyncNotifier<SessionState> {
  @override
  Future<SessionState> build() async {
    final storage = ref.watch(secureStorageProvider);
    final token = await storage.read(key: 'token');
    final refreshToken = await storage.read(key: 'refreshToken');
    final userRaw = await storage.read(key: 'user');

    if (token == null || userRaw == null) {
      return const SessionState.empty();
    }

    return SessionState(
      token: token,
      refreshToken: refreshToken,
      user: UserInfo.decode(userRaw),
    );
  }

  Future<void> save(LoginResponse response) async {
    final storage = ref.read(secureStorageProvider);
    await storage.write(key: 'token', value: response.token);
    await storage.write(key: 'refreshToken', value: response.refreshToken);
    await storage.write(key: 'user', value: response.user.encode());
    state = AsyncData(
      SessionState(
        token: response.token,
        refreshToken: response.refreshToken,
        user: response.user,
      ),
    );
  }

  Future<void> logout() async {
    final storage = ref.read(secureStorageProvider);
    await storage.delete(key: 'token');
    await storage.delete(key: 'refreshToken');
    await storage.delete(key: 'user');
    state = const AsyncData(SessionState.empty());
  }
}
