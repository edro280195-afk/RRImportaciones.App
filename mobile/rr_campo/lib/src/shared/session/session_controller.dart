import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/domain/auth_models.dart';
import '../api/api_client.dart';

final sessionControllerProvider =
    AsyncNotifierProvider<SessionController, SessionState>(
      SessionController.new,
    );

enum SessionStatus {
  /// No hay sesion guardada: mostrar login.
  unauthenticated,

  /// Hay sesion guardada pero necesita desbloqueo biometrico o PIN.
  locked,

  /// Sesion activa y desbloqueada.
  authenticated,
}

class SessionState {
  const SessionState({
    required this.status,
    required this.token,
    required this.refreshToken,
    required this.expiresAt,
    required this.user,
  });

  const SessionState.empty()
    : status = SessionStatus.unauthenticated,
      token = null,
      refreshToken = null,
      expiresAt = null,
      user = null;

  const SessionState.locked({
    required this.token,
    required this.refreshToken,
    required this.user,
    this.expiresAt,
  }) : status = SessionStatus.locked;

  final SessionStatus status;
  final String? token;
  final String? refreshToken;
  final String? expiresAt;
  final UserInfo? user;

  bool get isAuthenticated => status == SessionStatus.authenticated;
  bool get isLocked => status == SessionStatus.locked;
  bool get isUnauthenticated => status == SessionStatus.unauthenticated;

  /// El usuario tiene rol de administracion.
  bool get isAdmin {
    final role = user?.role.toUpperCase();
    return role == 'ADMIN' || role == 'DUEÑO' || role == 'DUENO';
  }

  /// El usuario es de campo/chofer.
  bool get isCampo {
    if (user == null) return false;
    final role = user!.role.toUpperCase();
    return role.contains('CAMPO') ||
        role.contains('YARD') ||
        role.contains('CHOFER');
  }

  SessionState copyWith({
    SessionStatus? status,
    String? token,
    String? refreshToken,
    String? expiresAt,
    UserInfo? user,
  }) {
    return SessionState(
      status: status ?? this.status,
      token: token ?? this.token,
      refreshToken: refreshToken ?? this.refreshToken,
      expiresAt: expiresAt ?? this.expiresAt,
      user: user ?? this.user,
    );
  }
}

class SessionController extends AsyncNotifier<SessionState> {
  static const _refreshSkew = Duration(minutes: 2);

  @override
  Future<SessionState> build() async {
    final storage = ref.watch(secureStorageProvider);
    final token = await storage.read(key: 'token');
    final refreshToken = await storage.read(key: 'refreshToken');
    final expiresAt = await storage.read(key: 'expiresAt');
    final userRaw = await storage.read(key: 'user');

    final sub = ApiClient.onSessionExpired.listen((_) {
      unawaited(onSessionExpired());
    });
    ref.onDispose(sub.cancel);

    if (token == null || refreshToken == null || userRaw == null) {
      return const SessionState.empty();
    }

    final user = _decodeStoredUser(userRaw);
    if (user == null) {
      await _clearActiveSession();
      return const SessionState.empty();
    }

    if (_shouldRefreshToken(token, expiresAt)) {
      final refreshed = await _refreshStoredSession(
        fallbackUser: user,
        status: SessionStatus.locked,
      );
      return refreshed ?? const SessionState.empty();
    }

    return SessionState.locked(
      token: token,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      user: user,
    );
  }

  /// Desbloquear sesion despues de biometria o PIN exitoso.
  Future<bool> unlock() async {
    final current = state.asData?.value;
    if (current == null || !current.isLocked) return false;

    final ready = await ensureFreshSession();
    if (!ready) return false;

    final freshSession = state.asData?.value;
    if (freshSession == null || freshSession.isUnauthenticated) return false;

    state = AsyncData(
      freshSession.copyWith(status: SessionStatus.authenticated),
    );
    return true;
  }

  /// Bloquea la aplicacion conservando la cuenta y tokens del dispositivo.
  void lock() {
    final current = state.asData?.value;
    if (current == null || !current.isAuthenticated) return;
    state = AsyncData(current.copyWith(status: SessionStatus.locked));
  }

  /// Guardar sesion tras login exitoso.
  Future<void> save(LoginResponse response) async {
    final storage = ref.read(secureStorageProvider);
    await storage.write(key: 'token', value: response.token);
    await storage.write(key: 'refreshToken', value: response.refreshToken);
    await storage.write(key: 'expiresAt', value: response.expiresAt);
    await storage.write(key: 'user', value: response.user.encode());

    await saveProfile(response.user);

    state = AsyncData(
      SessionState(
        status: SessionStatus.authenticated,
        token: response.token,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
        user: response.user,
      ),
    );
  }

  /// Cambiar de usuario: elimina la sesion, pero conserva perfiles locales.
  Future<void> logout() async {
    await _clearActiveSession();
    state = const AsyncData(SessionState.empty());
  }

  /// Callback para cuando el refresh token expira definitivamente.
  Future<void> onSessionExpired() async {
    await _clearActiveSession();
    state = const AsyncData(SessionState.empty());
  }

  Future<bool> ensureFreshSession() async {
    final current = state.asData?.value;
    if (current == null || current.isUnauthenticated) return false;

    final token = current.token;
    if (token == null || token.isEmpty) return false;

    if (!_shouldRefreshToken(token, current.expiresAt)) {
      return true;
    }

    final refreshed = await _refreshStoredSession(
      fallbackUser: current.user,
      status: current.status,
    );
    if (refreshed == null) {
      await _clearActiveSession();
      state = const AsyncData(SessionState.empty());
      return false;
    }

    state = AsyncData(refreshed);
    return true;
  }

  Future<SessionState?> _refreshStoredSession({
    required SessionStatus status,
    UserInfo? fallbackUser,
  }) async {
    final refreshed = await ref.read(apiClientProvider).refreshSession();
    if (!refreshed) return null;

    final storage = ref.read(secureStorageProvider);
    final token = await storage.read(key: 'token');
    final refreshToken = await storage.read(key: 'refreshToken');
    final expiresAt = await storage.read(key: 'expiresAt');
    final userRaw = await storage.read(key: 'user');
    final user = userRaw == null ? fallbackUser : _decodeStoredUser(userRaw);

    if (token == null ||
        token.isEmpty ||
        refreshToken == null ||
        refreshToken.isEmpty ||
        user == null) {
      return null;
    }

    return SessionState(
      status: status,
      token: token,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      user: user,
    );
  }

  bool _shouldRefreshToken(String token, String? storedExpiresAt) {
    final expiration = _earliestExpiration([
      _readJwtExpiration(token),
      _readStoredExpiration(storedExpiresAt),
    ]);
    if (expiration == null) return false;

    final refreshBefore = expiration.toUtc().subtract(_refreshSkew);
    return DateTime.now().toUtc().isAfter(refreshBefore);
  }

  DateTime? _earliestExpiration(List<DateTime?> values) {
    DateTime? earliest;
    for (final value in values) {
      if (value == null) continue;

      final utcValue = value.toUtc();
      if (earliest == null || utcValue.isBefore(earliest)) {
        earliest = utcValue;
      }
    }
    return earliest;
  }

  DateTime? _readStoredExpiration(String? value) {
    if (value == null || value.isEmpty) return null;
    return DateTime.tryParse(value)?.toUtc();
  }

  DateTime? _readJwtExpiration(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      final payload = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final data = jsonDecode(payload) as Map<String, dynamic>;
      final exp = data['exp'];

      if (exp is int) {
        return DateTime.fromMillisecondsSinceEpoch(exp * 1000, isUtc: true);
      }
      if (exp is String) {
        final seconds = int.tryParse(exp);
        if (seconds != null) {
          return DateTime.fromMillisecondsSinceEpoch(
            seconds * 1000,
            isUtc: true,
          );
        }
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  UserInfo? _decodeStoredUser(String value) {
    try {
      return UserInfo.decode(value);
    } catch (_) {
      return null;
    }
  }

  Future<void> _clearActiveSession() async {
    final storage = ref.read(secureStorageProvider);
    await storage.delete(key: 'token');
    await storage.delete(key: 'refreshToken');
    await storage.delete(key: 'expiresAt');
    await storage.delete(key: 'user');
  }

  /// Gestion de perfiles locales guardados en el dispositivo.

  Future<List<CampoUser>> getSavedProfiles() async {
    final storage = ref.read(secureStorageProvider);
    final savedProfilesRaw = await storage.read(key: 'saved_profiles');
    if (savedProfilesRaw == null) return [];
    try {
      final list = jsonDecode(savedProfilesRaw) as List<dynamic>;
      return list
          .map((item) => CampoUser.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveProfile(UserInfo user) async {
    final storage = ref.read(secureStorageProvider);
    final savedProfilesRaw = await storage.read(key: 'saved_profiles');
    List<dynamic> list = [];
    if (savedProfilesRaw != null) {
      try {
        list = jsonDecode(savedProfilesRaw) as List<dynamic>;
      } catch (_) {}
    }

    list.removeWhere((item) => item['username'] == user.username);

    list.insert(0, {
      'id': user.id,
      'username': user.username,
      'nombre': user.nombre,
      'apellidos': user.apellidos,
      'tienePin': true,
    });

    await storage.write(key: 'saved_profiles', value: jsonEncode(list));
  }

  Future<void> removeProfile(String username) async {
    final storage = ref.read(secureStorageProvider);
    final savedProfilesRaw = await storage.read(key: 'saved_profiles');
    if (savedProfilesRaw == null) return;
    try {
      final list = jsonDecode(savedProfilesRaw) as List<dynamic>;
      list.removeWhere((item) => item['username'] == username);
      await storage.write(key: 'saved_profiles', value: jsonEncode(list));
    } catch (_) {}
  }
}
