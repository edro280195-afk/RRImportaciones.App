import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/api/api_client.dart';
import '../../../shared/biometric/biometric_service.dart';
import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/auth_api.dart';
import '../domain/auth_models.dart';

final campoUsersProvider = FutureProvider.autoDispose<List<CampoUser>>((ref) {
  return ref.watch(authApiProvider).getCampoUsers();
});

enum PinMode { selectUser, enterPin, blocked }

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  // â”€â”€ PIN state (campo) â”€â”€
  CampoUser? _selectedUser;
  PinMode _mode = PinMode.selectUser;
  String _pin = '';
  String _pinError = '';
  bool _pinSaving = false;
  bool _resetRequested = false;

  // â”€â”€ Password state (admin) â”€â”€
  final _userController = TextEditingController();
  final _passController = TextEditingController();
  bool _obscurePass = true;
  String _adminError = '';
  bool _adminSaving = false;

  // â”€â”€ Biometric â”€â”€
  bool _biometricAttempted = false;
  bool _biometricLoading = false;
  bool _showLockedPin = false;
  String _lockedPin = '';
  String _lockedPinError = '';
  bool _lockedPinSaving = false;

  @override
  void initState() {
    super.initState();
    // Si hay sesiÃ³n bloqueada, intentar biometrÃ­a automÃ¡ticamente
    WidgetsBinding.instance.addPostFrameCallback((_) => _tryBiometric());
  }

  @override
  void dispose() {
    _userController.dispose();
    _passController.dispose();
    super.dispose();
  }

  Future<void> _tryBiometric({bool force = false}) async {
    if (_biometricAttempted && !force) return;
    _biometricAttempted = true;

    final session = ref.read(sessionControllerProvider).asData?.value;
    if (session == null || !session.isLocked) return;

    final biometric = ref.read(biometricServiceProvider);
    final available = await biometric.isAvailable();
    final enabled = await biometric.isEnabled();

    if (!mounted) return;
    if (!available || !enabled) {
      setState(() {
        _showLockedPin = true;
        _lockedPinError = enabled
            ? 'La biometrÃ­a no estÃ¡ disponible en este dispositivo.'
            : 'La biometrÃ­a no estÃ¡ activada para esta cuenta.';
      });
      return;
    }

    setState(() {
      _biometricLoading = true;
      _lockedPinError = '';
    });
    final success = await biometric.authenticate();
    if (!mounted) return;
    setState(() => _biometricLoading = false);
    if (success) {
      ref.read(sessionControllerProvider.notifier).unlock();
      _navigateToShell(session);
    } else {
      setState(() {
        _showLockedPin = true;
        _lockedPin = '';
        _lockedPinError = 'No se pudo confirmar con biometrÃ­a. Usa tu PIN.';
      });
    }
  }

  void _navigateToShell(SessionState session) {
    if (session.isAdmin) {
      context.go('/admin');
    } else {
      context.go('/campo');
    }
  }

  void _navigateToShellForUser(UserInfo user) {
    final role = user.role.toUpperCase();
    if (role == 'ADMIN' || role == 'DUEÃ‘O' || role == 'DUENO') {
      context.go('/admin');
    } else {
      context.go('/campo');
    }
  }

  void _pressLockedDigit(String digit) {
    if (_lockedPinSaving || _lockedPin.length >= 6) return;
    HapticFeedback.selectionClick();
    setState(() {
      _lockedPin += digit;
      _lockedPinError = '';
    });
    if (_lockedPin.length == 6) {
      Future<void>.delayed(const Duration(milliseconds: 80), _submitLockedPin);
    }
  }

  void _backspaceLockedPin() {
    if (_lockedPinSaving || _lockedPin.isEmpty) return;
    setState(() {
      _lockedPin = _lockedPin.substring(0, _lockedPin.length - 1);
      _lockedPinError = '';
    });
  }

  Future<void> _submitLockedPin() async {
    final session = ref.read(sessionControllerProvider).asData?.value;
    final user = session?.user;
    if (user == null || _lockedPin.length != 6 || _lockedPinSaving) return;

    setState(() => _lockedPinSaving = true);
    try {
      final response = await ref
          .read(authApiProvider)
          .pinLogin(username: user.username, pin: _lockedPin);
      await ref.read(sessionControllerProvider.notifier).save(response);
      if (!mounted) return;
      _navigateToShellForUser(response.user);
    } on ApiException catch (error) {
      HapticFeedback.heavyImpact();
      setState(() {
        _lockedPin = '';
        _lockedPinError = error.message;
      });
    } finally {
      if (mounted) setState(() => _lockedPinSaving = false);
    }
  }

  // â”€â”€ PIN login logic â”€â”€

  void _selectUser(CampoUser user) {
    HapticFeedback.selectionClick();
    setState(() {
      _selectedUser = user;
      _mode = user.tienePin ? PinMode.enterPin : PinMode.blocked;
      _pin = '';
      _pinError = '';
      _resetRequested = false;
    });
  }

  void _backToUsers() {
    setState(() {
      _selectedUser = null;
      _mode = PinMode.selectUser;
      _pin = '';
      _pinError = '';
      _resetRequested = false;
    });
  }

  void _pressDigit(String digit) {
    if (_pinSaving || _pin.length >= 6) return;
    HapticFeedback.selectionClick();
    setState(() {
      _pin += digit;
      _pinError = '';
    });
    if (_pin.length == 6) {
      Future<void>.delayed(const Duration(milliseconds: 80), _submitPin);
    }
  }

  void _backspace() {
    if (_pinSaving || _pin.isEmpty) return;
    setState(() {
      _pin = _pin.substring(0, _pin.length - 1);
      _pinError = '';
    });
  }

  Future<void> _submitPin() async {
    final user = _selectedUser;
    if (user == null || _pin.length != 6 || _pinSaving) return;
    setState(() => _pinSaving = true);
    try {
      final response = await ref
          .read(authApiProvider)
          .pinLogin(username: user.username, pin: _pin);
      await ref.read(sessionControllerProvider.notifier).save(response);
      if (!mounted) return;
      await _offerBiometric();
      if (!mounted) return;
      context.go('/campo');
    } on ApiException catch (error) {
      HapticFeedback.heavyImpact();
      setState(() {
        _pin = '';
        _pinError = error.message;
      });
    } finally {
      if (mounted) setState(() => _pinSaving = false);
    }
  }

  Future<void> _requestPinReset() async {
    final user = _selectedUser;
    if (user == null || _pinSaving) return;
    setState(() => _pinSaving = true);
    try {
      await ref.read(authApiProvider).requestPinReset(user.username);
      if (!mounted) return;
      setState(() {
        _resetRequested = true;
        _pinError = '';
      });
    } on ApiException catch (error) {
      setState(() => _pinError = error.message);
    } finally {
      if (mounted) setState(() => _pinSaving = false);
    }
  }

  // â”€â”€ Admin login logic â”€â”€

  Future<void> _submitAdmin() async {
    final username = _userController.text.trim();
    final password = _passController.text;
    if (username.isEmpty || password.isEmpty) {
      setState(() => _adminError = 'Ingresa usuario y contraseÃ±a');
      return;
    }
    setState(() {
      _adminSaving = true;
      _adminError = '';
    });
    try {
      final response = await ref
          .read(authApiProvider)
          .login(username: username, password: password);
      await ref.read(sessionControllerProvider.notifier).save(response);
      if (!mounted) return;
      await _offerBiometric();
      if (!mounted) return;
      context.go('/admin');
    } on ApiException catch (error) {
      setState(() => _adminError = error.message);
    } finally {
      if (mounted) setState(() => _adminSaving = false);
    }
  }

  // â”€â”€ Biometric offer after first login â”€â”€

  Future<void> _offerBiometric() async {
    final biometric = ref.read(biometricServiceProvider);
    final available = await biometric.isAvailable();
    final alreadyEnabled = await biometric.isEnabled();
    if (!available || alreadyEnabled || !mounted) return;

    final label = await biometric.getBiometricLabel();
    if (!mounted) return;
    final accepted = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Â¿Activar $label?'),
        content: Text(
          'La prÃ³xima vez que abras la app podrÃ¡s '
          'entrar con $label en vez de escribir tu PIN o contraseÃ±a.',
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
      await biometric.setEnabled(true);
    }
  }

  // â”€â”€ Build â”€â”€

  @override
  Widget build(BuildContext context) {
    // Si la sesiÃ³n estÃ¡ bloqueada, mostrar pantalla de desbloqueo
    final session = ref.watch(sessionControllerProvider).asData?.value;
    if (session != null && session.isLocked) {
      return _IdentityUnlockScreen(
        user: session.user!,
        biometricLoading: _biometricLoading,
        showPin: _showLockedPin,
        pin: _lockedPin,
        pinError: _lockedPinError,
        pinSaving: _lockedPinSaving,
        onUnlockWithBiometric: () => _tryBiometric(force: true),
        onDigit: _pressLockedDigit,
        onBackspace: _backspaceLockedPin,
        onUseAnotherAccount: () {
          ref.read(sessionControllerProvider.notifier).logout();
        },
      );
    }

    return Scaffold(
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: _buildUnifiedLogin(),
        ),
      ),
    );
  }

  Widget _buildUnifiedLogin() {
    final users = ref.watch(campoUsersProvider);

    return switch (_mode) {
      PinMode.selectUser => _UnifiedLoginStart(
        users: users,
        onSelect: _selectUser,
        onRefresh: () => ref.invalidate(campoUsersProvider),
        userController: _userController,
        passController: _passController,
        obscurePass: _obscurePass,
        onToggleObscure: () => setState(() => _obscurePass = !_obscurePass),
        passwordError: _adminError,
        passwordSaving: _adminSaving,
        onPasswordSubmit: _submitAdmin,
      ),
      PinMode.enterPin => _PinEntry(
        user: _selectedUser!,
        pin: _pin,
        error: _pinError,
        saving: _pinSaving,
        resetRequested: _resetRequested,
        onBack: _backToUsers,
        onDigit: _pressDigit,
        onBackspace: _backspace,
        onResetPin: _requestPinReset,
      ),
      PinMode.blocked => _BlockedUser(
        user: _selectedUser!,
        onBack: _backToUsers,
      ),
    };
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// WIDGETS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/// Pantalla cuando existe una sesiÃ³n guardada y hay que confirmar identidad.
class _IdentityUnlockScreen extends ConsumerWidget {
  const _IdentityUnlockScreen({
    required this.user,
    required this.biometricLoading,
    required this.showPin,
    required this.pin,
    required this.pinError,
    required this.pinSaving,
    required this.onUnlockWithBiometric,
    required this.onDigit,
    required this.onBackspace,
    required this.onUseAnotherAccount,
  });

  final UserInfo user;
  final bool biometricLoading;
  final bool showPin;
  final String pin;
  final String pinError;
  final bool pinSaving;
  final VoidCallback onUnlockWithBiometric;
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onUseAnotherAccount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final label = ref.watch(biometricLabelProvider).value ?? 'BiometrÃ­a';
    final iconData = label.toLowerCase().contains('face')
        ? Icons.face
        : label.toLowerCase().contains('huella')
        ? Icons.fingerprint
        : Icons.fingerprint_outlined;

    return Scaffold(
      backgroundColor: AppColors.ink,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            children: [
              const _DarkBrandHeader(),
              const SizedBox(height: 28),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF171B24),
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                  border: Border.all(color: const Color(0xFF2A303B)),
                ),
                child: Column(
                  children: [
                    _Avatar(initial: user.nombre, radius: 38),
                    const SizedBox(height: 14),
                    Text(
                      '${user.nombre} ${user.apellidos ?? ''}'.trim(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '@${user.username} Â· ${roleLabel(user.role)}',
                      style: const TextStyle(
                        color: Color(0xFFA7AFBF),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: biometricLoading
                            ? null
                            : onUnlockWithBiometric,
                        icon: biometricLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Icon(iconData),
                        label: Text(
                          biometricLoading
                              ? 'Confirmando...'
                              : 'Entrar con $label',
                        ),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(54),
                          backgroundColor: AppColors.red,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Si no se confirma, usa tu PIN de 6 dÃ­gitos.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFFA7AFBF),
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              AnimatedCrossFade(
                crossFadeState: showPin
                    ? CrossFadeState.showSecond
                    : CrossFadeState.showFirst,
                duration: const Duration(milliseconds: 220),
                firstChild: Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: TextButton(
                    onPressed: onUseAnotherAccount,
                    child: const Text(
                      'Usar otra cuenta',
                      style: TextStyle(color: Color(0xFFA7AFBF)),
                    ),
                  ),
                ),
                secondChild: Padding(
                  padding: const EdgeInsets.only(top: 22),
                  child: Column(
                    children: [
                      const Text(
                        'Ingresa tu PIN',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 18),
                      _PinDots(length: pin.length),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 24,
                        child: Text(
                          pinError,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Color(0xFFFFB4AB),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      _Keypad(
                        disabled: pinSaving,
                        onDigit: onDigit,
                        onBackspace: onBackspace,
                      ),
                      TextButton(
                        onPressed: pinSaving ? null : onUseAnotherAccount,
                        child: const Text(
                          'Usar otra cuenta',
                          style: TextStyle(color: Color(0xFFA7AFBF)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DarkBrandHeader extends StatelessWidget {
  const _DarkBrandHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: AppColors.red,
            borderRadius: BorderRadius.circular(9),
          ),
          child: const Icon(Icons.verified_user, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 10),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'R&R IMPORTACIONES',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  height: 1,
                ),
              ),
              SizedBox(height: 3),
              Text(
                'ACCESO SEGURO',
                style: TextStyle(
                  color: Color(0xFFA7AFBF),
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  height: 1,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Encabezado de marca.
class _BrandHeader extends StatelessWidget {
  const _BrandHeader({this.leading, this.trailing});

  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Row(
            children: [
              SizedBox(width: 44, child: leading),
              const Spacer(),
              SizedBox(
                width: 44,
                child: Align(alignment: Alignment.centerRight, child: trailing),
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: AppColors.red,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.verified_user,
                  color: Colors.white,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              const Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'R&R IMPORTACIONES',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.4,
                      height: 1,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'CAMPO & SUPERVISIÃ“N',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors.red,
                      letterSpacing: 1.4,
                      height: 1,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Pantalla inicial unificada: primer acceso, otra cuenta y usuarios con PIN.
class _UnifiedLoginStart extends StatelessWidget {
  const _UnifiedLoginStart({
    required this.users,
    required this.onSelect,
    required this.onRefresh,
    required this.userController,
    required this.passController,
    required this.obscurePass,
    required this.onToggleObscure,
    required this.passwordError,
    required this.passwordSaving,
    required this.onPasswordSubmit,
  });

  final AsyncValue<List<CampoUser>> users;
  final ValueChanged<CampoUser> onSelect;
  final VoidCallback onRefresh;
  final TextEditingController userController;
  final TextEditingController passController;
  final bool obscurePass;
  final VoidCallback onToggleObscure;
  final String passwordError;
  final bool passwordSaving;
  final VoidCallback onPasswordSubmit;

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: const ValueKey('unified-login'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _BrandHeader(
            trailing: IconButton(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh, color: AppColors.ink2),
              tooltip: 'Actualizar',
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Confirmar acceso',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            'Usa tu sesiÃ³n guardada, PIN o contraseÃ±a inicial.',
            style: TextStyle(color: AppColors.ink2, fontSize: 14),
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
              boxShadow: AppShadows.soft,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Primer acceso u otra cuenta',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: userController,
                  enabled: !passwordSaving,
                  textInputAction: TextInputAction.next,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    hintText: 'Usuario',
                    prefixIcon: Icon(
                      Icons.person_outline,
                      color: AppColors.ink3,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passController,
                  enabled: !passwordSaving,
                  obscureText: obscurePass,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => onPasswordSubmit(),
                  decoration: InputDecoration(
                    hintText: 'ContraseÃ±a',
                    prefixIcon: const Icon(
                      Icons.lock_outline,
                      color: AppColors.ink3,
                    ),
                    suffixIcon: IconButton(
                      icon: Icon(
                        obscurePass
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: AppColors.ink3,
                      ),
                      onPressed: passwordSaving ? null : onToggleObscure,
                    ),
                  ),
                ),
                if (passwordError.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _InlineError(message: passwordError),
                ],
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: passwordSaving ? null : onPasswordSubmit,
                  child: passwordSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Entrar'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Usuarios con PIN',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              color: AppColors.ink2,
            ),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: users.when(
              data: (items) {
                if (items.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.person_off_outlined,
                            size: 48,
                            color: AppColors.ink3,
                          ),
                          SizedBox(height: 12),
                          Text(
                            'No hay usuarios con PIN activo.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.ink2),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Configura un PIN desde el panel web para usar acceso rÃ¡pido.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.ink3,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => onRefresh(),
                  child: ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final user = items[index];
                      return _UserTile(user: user, onTap: () => onSelect(user));
                    },
                  ),
                );
              },
              error: (error, _) =>
                  _ErrorState(message: error.toString(), onRetry: onRefresh),
              loading: () => const _UserListSkeleton(),
            ),
          ),
        ],
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  const _UserTile({required this.user, required this.onTap});

  final CampoUser user;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                _Avatar(initial: user.nombre, radius: 24),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.displayName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Row(
                        children: [
                          Icon(
                            Icons.lock_outline,
                            size: 14,
                            color: AppColors.ink3,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'PIN configurado',
                            style: TextStyle(
                              color: AppColors.ink2,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.ink3),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.redSoft,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.danger, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AppColors.danger,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UserListSkeleton extends StatelessWidget {
  const _UserListSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 3,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        return Container(
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: AppColors.background,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 150,
                      height: 12,
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: 96,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Pantalla de bloqueo: usuario sin PIN no puede acceder.
class _BlockedUser extends StatelessWidget {
  const _BlockedUser({required this.user, required this.onBack});

  final CampoUser user;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        children: [
          _BrandHeader(
            leading: IconButton(
              onPressed: onBack,
              icon: const Icon(Icons.arrow_back, color: AppColors.ink2),
            ),
          ),
          const Spacer(),
          const Icon(Icons.lock_outline, size: 56, color: AppColors.ink3),
          const SizedBox(height: 16),
          Text(
            user.displayName,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Tu PIN aÃºn no ha sido configurado.\n\n'
              'Pide a tu administrador que lo active desde el panel web.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.ink2,
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back),
            label: const Text('Volver'),
          ),
          const Spacer(),
        ],
      ),
    );
  }
}

/// Ingreso de PIN con teclado numÃ©rico.
class _PinEntry extends StatelessWidget {
  const _PinEntry({
    required this.user,
    required this.pin,
    required this.error,
    required this.saving,
    required this.resetRequested,
    required this.onBack,
    required this.onDigit,
    required this.onBackspace,
    required this.onResetPin,
  });

  final CampoUser user;
  final String pin;
  final String error;
  final bool saving;
  final bool resetRequested;
  final VoidCallback onBack;
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onResetPin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      child: SingleChildScrollView(
        child: Column(
          children: [
            _BrandHeader(
              leading: IconButton(
                onPressed: saving ? null : onBack,
                icon: const Icon(Icons.arrow_back, color: AppColors.ink2),
              ),
              trailing: const Icon(Icons.lock_outline, color: AppColors.ink3),
            ),
            const SizedBox(height: 18),
            _Avatar(initial: user.nombre, radius: 36),
            const SizedBox(height: 12),
            Text(
              user.displayName,
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 2),
            Text(
              '@${user.username}',
              style: const TextStyle(color: AppColors.ink2, fontSize: 14),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.successSoft,
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                'Campo',
                style: TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 26),
            const Text(
              'Ingresa tu PIN',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 18),
            _PinDots(length: pin.length),
            const SizedBox(height: 12),
            SizedBox(
              height: 22,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 150),
                child: Text(
                  resetRequested
                      ? 'Solicitud enviada al administrador.'
                      : error,
                  key: ValueKey(resetRequested ? 'reset' : error),
                  style: TextStyle(
                    color: resetRequested
                        ? AppColors.success
                        : AppColors.danger,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),
            _Keypad(
              disabled: saving,
              onDigit: onDigit,
              onBackspace: onBackspace,
            ),
            const SizedBox(height: 6),
            TextButton.icon(
              onPressed: saving || resetRequested ? null : onResetPin,
              icon: const Icon(Icons.lock_reset, size: 18),
              label: const Text('OlvidÃ© mi PIN'),
            ),
            SizedBox(
              height: 4,
              child: saving ? const LinearProgressIndicator() : null,
            ),
          ],
        ),
      ),
    );
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SHARED WIDGETS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class _Avatar extends StatelessWidget {
  const _Avatar({required this.initial, required this.radius});

  final String initial;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.red,
      foregroundColor: Colors.white,
      child: Text(
        initial.isEmpty ? '?' : initial.characters.first.toUpperCase(),
        style: TextStyle(fontSize: radius * 0.8, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _PinDots extends StatelessWidget {
  const _PinDots({required this.length});

  final int length;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(6, (index) {
        final filled = length > index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          margin: const EdgeInsets.symmetric(horizontal: 7),
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: filled ? AppColors.red : Colors.transparent,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.red, width: 1.6),
          ),
        );
      }),
    );
  }
}

class _Keypad extends StatelessWidget {
  const _Keypad({
    required this.disabled,
    required this.onDigit,
    required this.onBackspace,
  });

  final bool disabled;
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;

  @override
  Widget build(BuildContext context) {
    final keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        childAspectRatio: 1.3,
      ),
      itemCount: keys.length,
      itemBuilder: (context, index) {
        final key = keys[index];
        if (key.isEmpty) return const SizedBox.shrink();
        final isBack = key == 'back';
        return _KeypadButton(
          disabled: disabled,
          onTap: isBack ? onBackspace : () => onDigit(key),
          child: isBack
              ? const Icon(Icons.backspace_outlined, color: AppColors.ink2)
              : Text(
                  key,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
                ),
        );
      },
    );
  }
}

class _KeypadButton extends StatelessWidget {
  const _KeypadButton({
    required this.disabled,
    required this.onTap,
    required this.child,
  });

  final bool disabled;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 74,
        height: 74,
        child: Material(
          color: AppColors.surface,
          shape: const CircleBorder(side: BorderSide(color: AppColors.border)),
          elevation: 0,
          shadowColor: Colors.black12,
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: disabled ? null : onTap,
            child: Center(child: child),
          ),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, size: 40, color: AppColors.ink3),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}
