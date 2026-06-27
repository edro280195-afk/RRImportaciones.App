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
  // ── PIN state (campo) ──
  CampoUser? _selectedUser;
  PinMode _mode = PinMode.selectUser;
  String _pin = '';
  String _pinError = '';
  bool _pinSaving = false;
  bool _resetRequested = false;

  // ── Password state (admin) ──
  final _userController = TextEditingController();
  final _passController = TextEditingController();
  bool _obscurePass = true;
  String _adminError = '';
  bool _adminSaving = false;
  bool _showPasswordLogin = false;
  String _userSearch = '';

  // ── Biometric ──
  bool _biometricAttempted = false;
  bool _biometricAttemptScheduled = false;
  bool _biometricLoading = false;
  bool _biometricReady = true;
  bool _showLockedPin = false;
  String _lockedPin = '';
  String _lockedPinError = '';
  bool _lockedPinNotice = false;
  bool _lockedPinSaving = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _userController.dispose();
    _passController.dispose();
    super.dispose();
  }

  Future<void> _tryBiometric({bool force = false}) async {
    final session = ref.read(sessionControllerProvider).asData?.value;
    if (session == null || !session.isLocked) return;
    if (_biometricAttempted && !force) return;
    _biometricAttempted = true;

    final biometric = ref.read(biometricServiceProvider);
    final available = await biometric.isAvailable();
    final enabled = await biometric.isEnabled();

    if (!mounted) return;
    if (!available || !enabled) {
      setState(() {
        _biometricReady = false;
        _showLockedPin = true;
        _lockedPinNotice = true;
        _lockedPinError = enabled
            ? 'Usa tu PIN. La biometría no está disponible en este dispositivo.'
            : 'Usa tu PIN esta vez. Después podrás activar biometría.';
      });
      return;
    }

    setState(() {
      _biometricReady = true;
      _biometricLoading = true;
      _lockedPinNotice = false;
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
        _lockedPinNotice = false;
        _lockedPinError = 'No se pudo confirmar con biometría. Usa tu PIN.';
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
    if (role == 'ADMIN' || role == 'DUEÑO' || role == 'DUENO') {
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
      _lockedPinNotice = false;
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
      _lockedPinNotice = false;
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
      await _offerBiometric();
      if (!mounted) return;
      _navigateToShellForUser(response.user);
    } on ApiException catch (error) {
      HapticFeedback.heavyImpact();
      setState(() {
        _lockedPin = '';
        _lockedPinNotice = false;
        _lockedPinError = error.message;
      });
    } finally {
      if (mounted) setState(() => _lockedPinSaving = false);
    }
  }

  // ── PIN login logic ──

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
      _navigateToShellForUser(response.user);
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

  // ── Admin login logic ──

  Future<void> _submitAdmin() async {
    final username = _userController.text.trim();
    final password = _passController.text;
    if (username.isEmpty || password.isEmpty) {
      setState(() => _adminError = 'Ingresa usuario y contraseña');
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

  // ── Biometric offer after first login ──

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
        title: Text('¿Activar $label?'),
        content: Text(
          'La próxima vez que abras la app podrás '
          'entrar con $label en vez de escribir tu PIN o contraseña.',
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
      final activated = await biometric.enable();
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

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    // Si la sesión está bloqueada, mostrar pantalla de desbloqueo
    final session = ref.watch(sessionControllerProvider).asData?.value;
    if (session != null && session.isLocked) {
      if (!_biometricAttempted && !_biometricAttemptScheduled) {
        _biometricAttemptScheduled = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _tryBiometric();
        });
      }
      return _IdentityUnlockScreen(
        user: session.user!,
        biometricLoading: _biometricLoading,
        biometricReady: _biometricReady,
        showPin: _showLockedPin,
        pin: _lockedPin,
        pinError: _lockedPinError,
        pinNotice: _lockedPinNotice,
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
      backgroundColor: AppColors.ink,
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
        showPasswordLogin: _showPasswordLogin,
        onTogglePasswordLogin: () {
          setState(() {
            _showPasswordLogin = !_showPasswordLogin;
            _adminError = '';
          });
        },
        userSearch: _userSearch,
        onSearchChanged: (value) => setState(() => _userSearch = value),
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

// -----------------------------------------------------------------------------
// WIDGETS
// -----------------------------------------------------------------------------

/// Pantalla cuando existe una sesión guardada y hay que confirmar identidad.
class _IdentityUnlockScreen extends ConsumerWidget {
  const _IdentityUnlockScreen({
    required this.user,
    required this.biometricLoading,
    required this.biometricReady,
    required this.showPin,
    required this.pin,
    required this.pinError,
    required this.pinNotice,
    required this.pinSaving,
    required this.onUnlockWithBiometric,
    required this.onDigit,
    required this.onBackspace,
    required this.onUseAnotherAccount,
  });

  final UserInfo user;
  final bool biometricLoading;
  final bool biometricReady;
  final bool showPin;
  final String pin;
  final String pinError;
  final bool pinNotice;
  final bool pinSaving;
  final VoidCallback onUnlockWithBiometric;
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onUseAnotherAccount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final label = ref.watch(biometricLabelProvider).value ?? 'Biometría';
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
                      '@${user.username} · ${roleLabel(user.role)}',
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
                        onPressed: biometricLoading || !biometricReady
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
                              : !biometricReady
                              ? 'Biometría no activada'
                              : 'Entrar con $label',
                        ),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(54),
                          backgroundColor: biometricReady
                              ? AppColors.red
                              : const Color(0xFF303643),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Si no se confirma, usa tu PIN de 6 dígitos.',
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
                          style: TextStyle(
                            color: pinNotice
                                ? const Color(0xFFA7AFBF)
                                : const Color(0xFFFFB4AB),
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
  const _DarkBrandHeader({this.trailing});

  final Widget? trailing;

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
        trailing ?? const SizedBox.shrink(),
      ],
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
    required this.showPasswordLogin,
    required this.onTogglePasswordLogin,
    required this.userSearch,
    required this.onSearchChanged,
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
  final bool showPasswordLogin;
  final VoidCallback onTogglePasswordLogin;
  final String userSearch;
  final ValueChanged<String> onSearchChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      key: const ValueKey('unified-login'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        _DarkBrandHeader(
          trailing: IconButton(
            onPressed: onRefresh,
            tooltip: 'Actualizar usuarios',
            icon: const Icon(Icons.refresh, color: Color(0xFFA7AFBF)),
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'Acceso seguro',
          style: TextStyle(
            color: Colors.white,
            fontSize: 29,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Selecciona tu usuario para entrar con PIN. La próxima vez podrás usar biometría.',
          style: TextStyle(color: Color(0xFFA7AFBF), fontSize: 14, height: 1.4),
        ),
        const SizedBox(height: 22),
        TextField(
          onChanged: onSearchChanged,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
          cursorColor: AppColors.red,
          decoration: InputDecoration(
            hintText: 'Buscar usuario',
            hintStyle: const TextStyle(color: Color(0xFF7E8798)),
            prefixIcon: const Icon(Icons.search, color: Color(0xFFA7AFBF)),
            filled: true,
            fillColor: const Color(0xFF171B24),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: Color(0xFF2A303B)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.red, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 22),
        const Text(
          'SELECCIONA TU USUARIO',
          style: TextStyle(
            color: Color(0xFFA7AFBF),
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 10),
        users.when(
          data: (items) {
            final query = userSearch.trim().toLowerCase();
            final visibleItems = query.isEmpty
                ? items
                : items.where((user) {
                    return user.displayName.toLowerCase().contains(query) ||
                        user.username.toLowerCase().contains(query);
                  }).toList();

            if (visibleItems.isEmpty) {
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 28,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF171B24),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: const Color(0xFF2A303B)),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.person_search_outlined,
                      size: 38,
                      color: Color(0xFF7E8798),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      query.isEmpty
                          ? 'No hay usuarios con PIN configurado.'
                          : 'No encontramos usuarios para “$userSearch”.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFFA7AFBF),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              );
            }

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: visibleItems.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.45,
              ),
              itemBuilder: (context, index) {
                final user = visibleItems[index];
                return _UserTile(user: user, onTap: () => onSelect(user));
              },
            );
          },
          error: (error, _) =>
              _DarkErrorState(message: error.toString(), onRetry: onRefresh),
          loading: () => const _UserListSkeleton(),
        ),
        const SizedBox(height: 18),
        Center(
          child: TextButton.icon(
            onPressed: onTogglePasswordLogin,
            icon: Icon(
              showPasswordLogin
                  ? Icons.keyboard_arrow_up
                  : Icons.person_add_alt_1_outlined,
              color: const Color(0xFFA7AFBF),
            ),
            label: Text(
              showPasswordLogin
                  ? 'Ocultar acceso alternativo'
                  : 'Primer acceso o usar otra cuenta',
              style: const TextStyle(color: Color(0xFFA7AFBF)),
            ),
          ),
        ),
        AnimatedCrossFade(
          duration: const Duration(milliseconds: 200),
          crossFadeState: showPasswordLogin
              ? CrossFadeState.showSecond
              : CrossFadeState.showFirst,
          firstChild: const SizedBox(width: double.infinity),
          secondChild: _DarkPasswordPanel(
            userController: userController,
            passController: passController,
            obscurePass: obscurePass,
            onToggleObscure: onToggleObscure,
            error: passwordError,
            saving: passwordSaving,
            onSubmit: onPasswordSubmit,
          ),
        ),
      ],
    );
  }
}

class _DarkPasswordPanel extends StatelessWidget {
  const _DarkPasswordPanel({
    required this.userController,
    required this.passController,
    required this.obscurePass,
    required this.onToggleObscure,
    required this.error,
    required this.saving,
    required this.onSubmit,
  });

  final TextEditingController userController;
  final TextEditingController passController;
  final bool obscurePass;
  final VoidCallback onToggleObscure;
  final String error;
  final bool saving;
  final VoidCallback onSubmit;

  InputDecoration _decoration({
    required String hint,
    required IconData icon,
    Widget? suffix,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF7E8798)),
      prefixIcon: Icon(icon, color: const Color(0xFFA7AFBF)),
      suffixIcon: suffix,
      filled: true,
      fillColor: const Color(0xFF11151C),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: Color(0xFF2A303B)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.red, width: 1.5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF171B24),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF2A303B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Acceso con contraseña',
            style: TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Úsalo en el primer acceso o para cambiar de cuenta.',
            style: TextStyle(color: Color(0xFF8D96A8), fontSize: 12),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: userController,
            enabled: !saving,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            style: const TextStyle(color: Colors.white),
            decoration: _decoration(
              hint: 'Usuario',
              icon: Icons.person_outline,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: passController,
            enabled: !saving,
            obscureText: obscurePass,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => onSubmit(),
            style: const TextStyle(color: Colors.white),
            decoration: _decoration(
              hint: 'Contraseña',
              icon: Icons.lock_outline,
              suffix: IconButton(
                onPressed: saving ? null : onToggleObscure,
                icon: Icon(
                  obscurePass
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: const Color(0xFFA7AFBF),
                ),
              ),
            ),
          ),
          if (error.isNotEmpty) ...[
            const SizedBox(height: 12),
            _DarkInlineError(message: error),
          ],
          const SizedBox(height: 14),
          FilledButton(
            onPressed: saving ? null : onSubmit,
            child: saving
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
    );
  }
}

class _DarkInlineError extends StatelessWidget {
  const _DarkInlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: AppColors.red.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: AppColors.red.withValues(alpha: 0.35)),
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: Color(0xFFFFB4AB),
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _DarkErrorState extends StatelessWidget {
  const _DarkErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF171B24),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF2A303B)),
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_off, color: Color(0xFF8D96A8), size: 34),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFFA7AFBF)),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, color: Colors.white),
            label: const Text(
              'Reintentar',
              style: TextStyle(color: Colors.white),
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
      color: const Color(0xFF171B24),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: const Color(0xFF2A303B)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _Avatar(initial: user.nombre, radius: 21),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF222833),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text(
                        'PIN',
                        style: TextStyle(
                          color: Color(0xFFA7AFBF),
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  user.nombre,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '@${user.username}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF8D96A8),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UserListSkeleton extends StatelessWidget {
  const _UserListSkeleton();

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 4,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.45,
      ),
      itemBuilder: (context, index) {
        return Container(
          decoration: BoxDecoration(
            color: const Color(0xFF171B24),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: const Color(0xFF2A303B)),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: const BoxDecoration(
                  color: Color(0xFF252B36),
                  shape: BoxShape.circle,
                ),
              ),
              const Spacer(),
              Container(
                width: 88,
                height: 11,
                decoration: BoxDecoration(
                  color: const Color(0xFF252B36),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(height: 7),
              Container(
                width: 60,
                height: 9,
                decoration: BoxDecoration(
                  color: const Color(0xFF222833),
                  borderRadius: BorderRadius.circular(999),
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
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      children: [
        _DarkBrandHeader(
          trailing: IconButton(
            onPressed: onBack,
            tooltip: 'Volver',
            icon: const Icon(Icons.close, color: Color(0xFFA7AFBF)),
          ),
        ),
        const SizedBox(height: 70),
        const Icon(Icons.lock_outline, size: 56, color: Color(0xFF8D96A8)),
        const SizedBox(height: 16),
        Text(
          user.displayName,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 21,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 12),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 28),
          child: Text(
            'Tu PIN aún no ha sido configurado.\n\n'
            'Pide a tu administrador que lo active desde el panel web.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFFA7AFBF),
              fontSize: 14,
              height: 1.5,
            ),
          ),
        ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: onBack,
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.white,
            side: const BorderSide(color: Color(0xFF343B48)),
          ),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Volver'),
        ),
      ],
    );
  }
}

/// Ingreso de PIN con teclado numérico.
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
    return ListView(
      key: ValueKey('pin-entry-${user.id}'),
      primary: false,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      children: [
        _DarkBrandHeader(
          trailing: IconButton(
            onPressed: saving ? null : onBack,
            tooltip: 'Cambiar usuario',
            icon: const Icon(Icons.close, color: Color(0xFFA7AFBF)),
          ),
        ),
        const SizedBox(height: 28),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF171B24),
            borderRadius: BorderRadius.circular(AppRadius.xl),
            border: Border.all(color: const Color(0xFF2A303B)),
          ),
          child: Row(
            children: [
              _Avatar(initial: user.nombre, radius: 31),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '@${user.username}',
                      style: const TextStyle(
                        color: Color(0xFFA7AFBF),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.lock_outline, color: Color(0xFF8D96A8)),
            ],
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'Ingresa tu PIN',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Seis dígitos para confirmar que eres tú.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Color(0xFFA7AFBF), fontSize: 13),
        ),
        const SizedBox(height: 20),
        _PinDots(length: pin.length),
        const SizedBox(height: 10),
        SizedBox(
          height: 24,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 150),
            child: Text(
              resetRequested ? 'Solicitud enviada al administrador.' : error,
              key: ValueKey(resetRequested ? 'reset' : error),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: resetRequested
                    ? const Color(0xFF7EE2A8)
                    : const Color(0xFFFFB4AB),
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        _Keypad(disabled: saving, onDigit: onDigit, onBackspace: onBackspace),
        const SizedBox(height: 4),
        TextButton.icon(
          onPressed: saving || resetRequested ? null : onResetPin,
          icon: const Icon(
            Icons.lock_reset,
            size: 18,
            color: Color(0xFFA7AFBF),
          ),
          label: const Text(
            'Olvidé mi PIN',
            style: TextStyle(color: Color(0xFFA7AFBF)),
          ),
        ),
        SizedBox(
          height: 4,
          child: saving
              ? const LinearProgressIndicator(color: AppColors.red)
              : null,
        ),
      ],
    );
  }
}

// -----------------------------------------------------------------------------
// SHARED WIDGETS
// -----------------------------------------------------------------------------

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
              ? const Icon(Icons.backspace_outlined, color: Color(0xFFA7AFBF))
              : Text(
                  key,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
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
          color: const Color(0xFF171B24),
          shape: const CircleBorder(side: BorderSide(color: Color(0xFF343B48))),
          elevation: 0,
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
