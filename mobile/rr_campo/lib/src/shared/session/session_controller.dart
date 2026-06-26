import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/domain/auth_models.dart';
import '../api/api_client.dart';
import '../biometric/biometric_service.dart';

final sessionControllerProvider =
    AsyncNotifierProvider<SessionController, SessionState>(
      SessionController.new,
    );

enum SessionStatus {
  /// No hay sesión guardada — mostrar login.
  unauthenticated,

  /// Hay sesión guardada pero necesita desbloqueo (biometría o PIN).
  locked,

  /// Sesión activa y desbloqueada.
  authenticated,
}

class SessionState {
  const SessionState({
    required this.status,
    required this.token,
    required this.refreshToken,
    required this.user,
  });

  const SessionState.empty()
    : status = SessionStatus.unauthenticated,
      token = null,
      refreshToken = null,
      user = null;

  const SessionState.locked({
    required this.token,
    required this.refreshToken,
    required this.user,
  }) : status = SessionStatus.locked;

  final SessionStatus status;
  final String? token;
  final String? refreshToken;
  final UserInfo? user;

  bool get isAuthenticated => status == SessionStatus.authenticated;
  bool get isLocked => status == SessionStatus.locked;
  bool get isUnauthenticated => status == SessionStatus.unauthenticated;

  /// ¿El usuario tiene rol de administración? (admin, dueño, o permisos admin)
  bool get isAdmin {
    final role = user?.role.toUpperCase();
    return role == 'ADMIN' || role == 'DUEÑO' || role == 'DUENO';
  }

  /// ¿El usuario es de campo/chofer?
  bool get isCampo {
    if (user == null) return false;
    final role = user!.role.toUpperCase();
    return role.contains('CAMPO') ||
        role.contains('YARD') ||
        role.contains('CHOFER');
  }

  SessionState copyWith({SessionStatus? status}) {
    return SessionState(
      status: status ?? this.status,
      token: token,
      refreshToken: refreshToken,
      user: user,
    );
  }
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

    final user = UserInfo.decode(userRaw);

    // Toda sesión persistida debe confirmar identidad al abrir la app.
    // La biometría es el primer intento; el PIN queda como respaldo.
    return SessionState.locked(
      token: token,
      refreshToken: refreshToken,
      user: user,
    );
  }

  /// Desbloquear sesión después de biometría o PIN exitoso.
  void unlock() {
    final current = state.asData?.value;
    if (current == null || !current.isLocked) return;
    state = AsyncData(current.copyWith(status: SessionStatus.authenticated));
  }

  /// Guardar sesión tras login exitoso (PIN o contraseña).
  Future<void> save(LoginResponse response) async {
    final storage = ref.read(secureStorageProvider);
    await storage.write(key: 'token', value: response.token);
    await storage.write(key: 'refreshToken', value: response.refreshToken);
    await storage.write(key: 'user', value: response.user.encode());
    state = AsyncData(
      SessionState(
        status: SessionStatus.authenticated,
        token: response.token,
        refreshToken: response.refreshToken,
        user: response.user,
      ),
    );
  }

  /// Cerrar sesión y limpiar todo.
  Future<void> logout() async {
    final storage = ref.read(secureStorageProvider);
    final biometric = ref.read(biometricServiceProvider);
    await storage.delete(key: 'token');
    await storage.delete(key: 'refreshToken');
    await storage.delete(key: 'user');
    await biometric.clear();
    state = const AsyncData(SessionState.empty());
  }
}
