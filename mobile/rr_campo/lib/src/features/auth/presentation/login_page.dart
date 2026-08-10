import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/api/api_client.dart';
import '../../../shared/biometric/biometric_service.dart';
import '../../../shared/permissions/permissions_service.dart';
import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/auth_api.dart';
import '../domain/auth_models.dart';
import 'login_unlock_screen.dart';
import 'login_widgets.dart';

/// Login de la app: contraseña una sola vez por dispositivo, biometría el
/// resto de las veces. Al terminar el primer login se ofrece activar
/// biometría y se piden los permisos que la app necesita (cámara,
/// notificaciones), para no interrumpir después con solicitudes sueltas.
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  // ── Formulario de contraseña ──
  final _userController = TextEditingController();
  final _passController = TextEditingController();
  bool _obscurePass = true;
  String _loginError = '';
  bool _loginSaving = false;
  bool _completingLogin = false;

  // ── Desbloqueo biométrico de una sesión ya guardada ──
  bool _biometricAttempted = false;
  bool _biometricLoading = false;
  String _unlockError = '';

  StreamSubscription? _sessionExpiredSub;

  @override
  void initState() {
    super.initState();

    _sessionExpiredSub = ApiClient.onSessionExpired.listen((_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Tu sesión expiró por inactividad. Ingresa de nuevo.',
            ),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _userController.dispose();
    _passController.dispose();
    _sessionExpiredSub?.cancel();
    super.dispose();
  }

  // ── Desbloqueo biométrico ──

  Future<void> _tryBiometric({bool force = false}) async {
    final session = ref.read(sessionControllerProvider).asData?.value;
    final user = session?.user;
    if (session == null || user == null || !session.isLocked) return;
    if (_biometricAttempted && !force) return;
    if (_biometricLoading) return;
    _biometricAttempted = true;
    setState(() {
      _biometricLoading = true;
      _unlockError = '';
    });

    final biometric = ref.read(biometricServiceProvider);
    final available = await biometric.isAvailable();
    final enabled = await biometric.isEnabledFor(user.id);

    if (!mounted) return;
    if (!available || !enabled) {
      setState(() {
        _biometricLoading = false;
        _unlockError = 'Vuelve a iniciar sesión con tu contraseña.';
      });
      return;
    }

    final success = await biometric.authenticate();
    if (!mounted) return;

    if (success) {
      final unlocked = await ref
          .read(sessionControllerProvider.notifier)
          .unlock();
      if (!mounted) return;
      setState(() => _biometricLoading = false);

      if (unlocked) {
        final activeSession = ref.read(sessionControllerProvider).asData?.value;
        if (activeSession != null) {
          _navigateToShell(activeSession);
        }
      } else {
        HapticFeedback.heavyImpact();
        setState(() {
          _unlockError = 'Tu sesión expiró. Ingresa de nuevo con tu contraseña.';
        });
      }
    } else {
      setState(() {
        _biometricLoading = false;
        _unlockError = 'No se pudo confirmar tu identidad. Inténtalo de nuevo.';
      });
    }
  }

  void _navigateToShell(SessionState session) {
    if (session.usesAdminShell) {
      context.go('/admin');
    } else {
      context.go('/campo');
    }
  }

  void _navigateToShellForUser(UserInfo user) {
    if (user.usesCampoShell) {
      context.go('/campo');
    } else {
      context.go('/admin');
    }
  }

  void _logout() {
    unawaited(ref.read(sessionControllerProvider.notifier).logout());
  }

  // ── Login con contraseña ──

  Future<void> _submitPassword() async {
    final username = _userController.text.trim();
    final password = _passController.text;
    if (username.isEmpty || password.isEmpty) {
      setState(() => _loginError = 'Ingresa usuario y contraseña');
      return;
    }
    setState(() {
      _loginSaving = true;
      _loginError = '';
    });
    try {
      final response = await ref
          .read(authApiProvider)
          .login(username: username, password: password);
      await _completeNewLogin(response);
    } on ApiException catch (error) {
      setState(() => _loginError = error.message);
    } finally {
      if (mounted) setState(() => _loginSaving = false);
    }
  }

  Future<void> _completeNewLogin(LoginResponse response) async {
    if (mounted) {
      setState(() => _completingLogin = true);
    }

    final sessionController = ref.read(sessionControllerProvider.notifier);
    await sessionController.save(response, activate: false);
    if (!mounted) return;

    await _offerBiometric(response.user);
    if (!mounted) return;

    await _requestAppPermissionsIfNeeded();
    if (!mounted) return;

    sessionController.activateSavedSession();
    _navigateToShellForUser(response.user);
  }

  Future<void> _offerBiometric(UserInfo user) async {
    final biometric = ref.read(biometricServiceProvider);
    final available = await biometric.isAvailable();
    final alreadyEnabled = await biometric.isEnabledFor(user.id);
    final alreadyOffered = await biometric.wasOfferedFor(user.id);
    if (!available || alreadyEnabled || alreadyOffered || !mounted) return;

    final label = await biometric.getBiometricLabel();
    if (!mounted) return;
    await biometric.markOfferedFor(user.id);
    if (!mounted) return;
    final accepted = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('¿Activar $label?'),
        content: Text(
          'La próxima vez que abras la app entrarás con $label, '
          'sin volver a escribir tu contraseña.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Ahora no'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Activar $label'),
          ),
        ],
      ),
    );
    if (accepted == true) {
      final activated = await biometric.enableFor(user.id);
      if (!activated && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'No se pudo activar $label. Confirma que esté configurado en el dispositivo.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _requestAppPermissionsIfNeeded() async {
    final permissions = ref.read(permissionsServiceProvider);
    if (await permissions.wasRequested()) return;
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Permisos de la app'),
        content: const Text(
          'R&R Campo necesita acceso a la cámara para capturar evidencia del '
          'vehículo y a las notificaciones para avisarte de tareas nuevas. '
          'Tu teléfono te los pedirá uno por uno a continuación.',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    await permissions.requestInitial();
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider).asData?.value;

    if (_completingLogin && session != null && session.isLocked) {
      return const _PreparingAccessView();
    }

    if (session == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (session.isLocked && session.user != null) {
      if (!_biometricAttempted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) unawaited(_tryBiometric());
        });
      }

      return LoginUnlockScreen(
        user: session.user!,
        biometricLoading: _biometricLoading,
        errorMessage: _unlockError,
        onUnlockWithBiometric: () => _tryBiometric(force: true),
        onLogout: _logout,
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              const LoginBrandHeader(),
              const SizedBox(height: 48),
              PasswordPanel(
                userController: _userController,
                passController: _passController,
                obscurePass: _obscurePass,
                onToggleObscure: () =>
                    setState(() => _obscurePass = !_obscurePass),
                error: _loginError,
                saving: _loginSaving,
                onSubmit: _submitPassword,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PreparingAccessView extends StatelessWidget {
  const _PreparingAccessView();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                'Preparando tu acceso...',
                style: TextStyle(
                  color: AppColors.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
