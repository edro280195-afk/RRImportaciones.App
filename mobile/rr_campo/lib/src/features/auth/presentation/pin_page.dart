import 'dart:async';
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
import 'login_unlock_screen.dart';
import 'login_widgets.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  // ── Perfiles locales ──
  List<CampoUser> _localProfiles = [];
  bool _loadingProfiles = true;
  String _userSearch = '';

  // ── PIN state ──
  CampoUser? _selectedUser;
  PinMode _mode = PinMode.selectUser;
  String _pin = '';
  String _pinError = '';
  bool _pinSaving = false;
  bool _resetRequested = false;

  // ── Password state ──
  final _userController = TextEditingController();
  final _passController = TextEditingController();
  bool _obscurePass = true;
  String _adminError = '';
  bool _adminSaving = false;

  // ── Biometric (Desbloqueo) ──
  bool _biometricAttempted = false;
  bool _biometricLoading = false;
  bool _showLockedPin = false;
  String _lockedPin = '';
  String _lockedPinError = '';
  bool _lockedPinSaving = false;

  StreamSubscription? _sessionExpiredSub;

  @override
  void initState() {
    super.initState();
    _loadLocalProfiles();

    // Escuchar si el token refresh falla y expira sesión definitivamente
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

  Future<void> _loadLocalProfiles() async {
    setState(() => _loadingProfiles = true);
    final profiles = await ref
        .read(sessionControllerProvider.notifier)
        .getSavedProfiles();
    if (mounted) {
      setState(() {
        _localProfiles = profiles;
        _loadingProfiles = false;
      });
    }
  }

  Future<void> _removeProfile(CampoUser profile) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar cuenta'),
        content: Text(
          '¿Deseas quitar a ${profile.displayName} de la lista rápida en este dispositivo?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Quitar'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref
          .read(sessionControllerProvider.notifier)
          .removeProfile(profile.username);
      await _loadLocalProfiles();
      if (_selectedUser?.username == profile.username) {
        _backToUsers();
      }
    }
  }

  // ── Biometric Unlock ──

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
        _showLockedPin = true;
        _lockedPinError = enabled
            ? 'Usa tu PIN. La biometría no está disponible en este dispositivo.'
            : 'Usa tu PIN esta vez. Después podrás activar biometría.';
      });
      return;
    }

    setState(() {
      _biometricLoading = true;
      _lockedPinError = '';
    });
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
          _showLockedPin = true;
          _lockedPin = '';
          _lockedPinError =
              'No se pudo renovar tu sesión. Ingresa tu PIN para continuar.';
        });
      }
    } else {
      setState(() => _biometricLoading = false);
      setState(() {
        _showLockedPin = true;
        _lockedPin = '';
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
      await _offerBiometric();
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

  // ── PIN Login ──

  void _selectUser(CampoUser user) {
    HapticFeedback.selectionClick();
    setState(() {
      _selectedUser = user;
      _mode = PinMode.enterPin;
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
    _loadLocalProfiles();
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

  // ── Password Login ──

  Future<void> _submitPassword() async {
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
      _navigateToShellForUser(response.user);
    } on ApiException catch (error) {
      setState(() => _adminError = error.message);
    } finally {
      if (mounted) setState(() => _adminSaving = false);
    }
  }

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
          'entrar con $label en vez de escribir tu PIN.',
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
      return LoginUnlockScreen(
        user: session.user!,
        biometricLoading: _biometricLoading,
        biometricReady: _showLockedPin,
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

    if (_mode == PinMode.enterPin && _selectedUser != null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(child: _buildPinEntry()),
      );
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: NestedScrollView(
            headerSliverBuilder: (context, innerBoxIsScrolled) => [
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: LoginBrandHeader(),
                ),
              ),
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(20, 24, 20, 16),
                  child: TabBar(
                    indicatorColor: AppColors.red,
                    labelColor: AppColors.red,
                    unselectedLabelColor: AppColors.ink2,
                    indicatorSize: TabBarIndicatorSize.tab,
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                    unselectedLabelStyle: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                    tabs: [
                      Tab(text: 'PIN Rápido'),
                      Tab(text: 'Contraseña'),
                    ],
                  ),
                ),
              ),
            ],
            body: TabBarView(children: [_buildPinTab(), _buildPasswordTab()]),
          ),
        ),
      ),
    );
  }

  Widget _buildPinTab() {
    if (_loadingProfiles) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: UserListSkeleton(),
      );
    }

    final query = _userSearch.trim().toLowerCase();
    final visibleProfiles = query.isEmpty
        ? _localProfiles
        : _localProfiles.where((p) {
            return p.displayName.toLowerCase().contains(query) ||
                p.username.toLowerCase().contains(query);
          }).toList();

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        if (_localProfiles.isNotEmpty) ...[
          TextField(
            onChanged: (val) => setState(() => _userSearch = val),
            style: const TextStyle(fontWeight: FontWeight.w700),
            cursorColor: AppColors.red,
            decoration: const InputDecoration(
              hintText: 'Buscar usuario...',
              prefixIcon: Icon(Icons.search, color: AppColors.ink2),
            ),
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: visibleProfiles.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.3,
            ),
            itemBuilder: (context, index) {
              final profile = visibleProfiles[index];
              return UserTile(
                user: profile,
                onTap: () => _selectUser(profile),
                onRemove: () => _removeProfile(profile),
              );
            },
          ),
        ] else ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
            ),
            child: const Column(
              children: [
                Icon(Icons.people_outline, size: 48, color: AppColors.ink3),
                SizedBox(height: 12),
                Text(
                  'No hay perfiles locales guardados',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'Inicia sesión con tu contraseña en la pestaña de al lado para registrar tu cuenta en este dispositivo.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.ink2,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildPasswordTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: PasswordPanel(
        userController: _userController,
        passController: _passController,
        obscurePass: _obscurePass,
        onToggleObscure: () => setState(() => _obscurePass = !_obscurePass),
        error: _adminError,
        saving: _adminSaving,
        onSubmit: _submitPassword,
      ),
    );
  }

  Widget _buildPinEntry() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
              onPressed: _pinSaving ? null : _backToUsers,
              color: AppColors.ink,
            ),
            const Expanded(
              child: Text(
                'Volver',
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              LoginAvatar(initial: _selectedUser!.nombre, radius: 24),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _selectedUser!.displayName,
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      '@${_selectedUser!.username}',
                      style: const TextStyle(
                        color: AppColors.ink2,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        const Text(
          'Ingresa tu PIN',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.ink,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Seis dígitos para confirmar tu acceso.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.ink2, fontSize: 13),
        ),
        const SizedBox(height: 20),
        PinDots(length: _pin.length),
        const SizedBox(height: 12),
        SizedBox(
          height: 24,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 150),
            child: Text(
              _resetRequested ? 'Solicitud de reinicio enviada.' : _pinError,
              key: ValueKey(_resetRequested ? 'reset' : _pinError),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _resetRequested
                    ? const Color(0xFF10B981)
                    : AppColors.danger,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        PinKeypad(
          disabled: _pinSaving,
          onDigit: _pressDigit,
          onBackspace: _backspace,
        ),
        const SizedBox(height: 16),
        TextButton.icon(
          onPressed: _pinSaving || _resetRequested ? null : _requestPinReset,
          icon: const Icon(Icons.lock_reset, size: 18, color: AppColors.ink3),
          label: const Text(
            'Olvidé mi PIN',
            style: TextStyle(
              color: AppColors.ink2,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

enum PinMode { selectUser, enterPin, blocked }
