import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/api/api_client.dart';
import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/auth_api.dart';
import '../domain/auth_models.dart';

final campoUsersProvider = FutureProvider.autoDispose<List<CampoUser>>((ref) {
  return ref.watch(authApiProvider).getCampoUsers();
});

enum PinMode { selectUser, enterPin, setPin, confirmPin }

class PinPage extends ConsumerStatefulWidget {
  const PinPage({super.key});

  @override
  ConsumerState<PinPage> createState() => _PinPageState();
}

class _PinPageState extends ConsumerState<PinPage> {
  CampoUser? _selectedUser;
  PinMode _mode = PinMode.selectUser;
  String _pin = '';
  String _firstPin = '';
  String _error = '';
  bool _saving = false;
  bool _resetRequested = false;

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(campoUsersProvider);

    return Scaffold(
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: switch (_mode) {
            PinMode.selectUser => _UserPicker(
              users: users,
              onSelect: _selectUser,
              onRefresh: () => ref.invalidate(campoUsersProvider),
            ),
            PinMode.enterPin ||
            PinMode.setPin ||
            PinMode.confirmPin => _PinEntry(
              key: ValueKey(_mode),
              mode: _mode,
              user: _selectedUser!,
              pin: _pin,
              error: _error,
              saving: _saving,
              resetRequested: _resetRequested,
              onBack: _backToUsers,
              onDigit: _pressDigit,
              onBackspace: _backspace,
              onResetPin: _requestPinReset,
            ),
          },
        ),
      ),
    );
  }

  void _selectUser(CampoUser user) {
    HapticFeedback.selectionClick();
    setState(() {
      _selectedUser = user;
      _mode = user.tienePin ? PinMode.enterPin : PinMode.setPin;
      _pin = '';
      _firstPin = '';
      _error = '';
      _resetRequested = false;
    });
  }

  void _backToUsers() {
    setState(() {
      _selectedUser = null;
      _mode = PinMode.selectUser;
      _pin = '';
      _firstPin = '';
      _error = '';
      _resetRequested = false;
    });
  }

  void _pressDigit(String digit) {
    if (_saving || _pin.length >= 6) return;
    HapticFeedback.selectionClick();
    setState(() {
      _pin += digit;
      _error = '';
    });
    if (_pin.length == 6) {
      Future<void>.delayed(const Duration(milliseconds: 80), _submitPin);
    }
  }

  void _backspace() {
    if (_saving || _pin.isEmpty) return;
    setState(() {
      _pin = _pin.substring(0, _pin.length - 1);
      _error = '';
    });
  }

  Future<void> _submitPin() async {
    final user = _selectedUser;
    if (user == null || _pin.length != 6 || _saving) return;

    if (_mode == PinMode.setPin) {
      setState(() {
        _firstPin = _pin;
        _pin = '';
        _mode = PinMode.confirmPin;
      });
      return;
    }

    if (_mode == PinMode.confirmPin) {
      if (_pin != _firstPin) {
        HapticFeedback.heavyImpact();
        setState(() {
          _pin = '';
          _firstPin = '';
          _mode = PinMode.setPin;
          _error = 'Los PIN no coinciden.';
        });
        return;
      }
      await _setInitialPin(user, _pin);
      return;
    }

    await _login(user, _pin);
  }

  Future<void> _login(CampoUser user, String pin) async {
    setState(() => _saving = true);
    try {
      final response = await ref
          .read(authApiProvider)
          .pinLogin(username: user.username, pin: pin);
      await ref.read(sessionControllerProvider.notifier).save(response);
      if (!mounted) return;
      context.go('/campo');
    } on ApiException catch (error) {
      HapticFeedback.heavyImpact();
      setState(() {
        _pin = '';
        _error = error.message;
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _setInitialPin(CampoUser user, String pin) async {
    setState(() => _saving = true);
    try {
      final response = await ref
          .read(authApiProvider)
          .setInitialCampoPin(username: user.username, newPin: pin);
      await ref.read(sessionControllerProvider.notifier).save(response);
      if (!mounted) return;
      context.go('/campo');
    } on ApiException catch (error) {
      HapticFeedback.heavyImpact();
      setState(() {
        _pin = '';
        _firstPin = '';
        _mode = PinMode.setPin;
        _error = error.message;
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _requestPinReset() async {
    final user = _selectedUser;
    if (user == null || _saving) return;

    setState(() => _saving = true);
    try {
      await ref.read(authApiProvider).requestPinReset(user.username);
      if (!mounted) return;
      setState(() {
        _resetRequested = true;
        _error = '';
      });
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

/// Encabezado de marca: escudo + "R&R IMPORTACIONES / CAMPO".
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
                    'CAMPO',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors.red,
                      letterSpacing: 2,
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

/// Pastilla verde de rol ("Campo").
class _RoleBadge extends StatelessWidget {
  const _RoleBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
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
    );
  }
}

class _UserPicker extends StatelessWidget {
  const _UserPicker({
    required this.users,
    required this.onSelect,
    required this.onRefresh,
  });

  final AsyncValue<List<CampoUser>> users;
  final ValueChanged<CampoUser> onSelect;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: const ValueKey('users'),
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
          const SizedBox(height: 22),
          const Text(
            'Selecciona tu usuario',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            'Entra con tu PIN para empezar a capturar.',
            style: TextStyle(color: AppColors.ink2, fontSize: 14),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: users.when(
              data: (items) {
                if (items.isEmpty) {
                  return const Center(
                    child: Text('No hay usuarios de campo configurados.'),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => onRefresh(),
                  child: ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final user = items[index];
                      return _UserTile(user: user, onTap: () => onSelect(user));
                    },
                  ),
                );
              },
              error: (error, _) =>
                  _ErrorState(message: error.toString(), onRetry: onRefresh),
              loading: () => const Center(child: CircularProgressIndicator()),
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
                      Row(
                        children: [
                          Icon(
                            user.tienePin
                                ? Icons.lock_outline
                                : Icons.lock_open_outlined,
                            size: 14,
                            color: AppColors.ink3,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            user.tienePin
                                ? 'PIN configurado'
                                : 'Configurar PIN',
                            style: const TextStyle(
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

class _PinEntry extends StatelessWidget {
  const _PinEntry({
    super.key,
    required this.mode,
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

  final PinMode mode;
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
    final title = switch (mode) {
      PinMode.enterPin => 'Ingresa tu PIN',
      PinMode.setPin => 'Crea tu PIN',
      PinMode.confirmPin => 'Confirma tu PIN',
      PinMode.selectUser => '',
    };

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
            const _RoleBadge(),
            const SizedBox(height: 26),
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
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
            if (mode == PinMode.enterPin)
              TextButton.icon(
                onPressed: saving || resetRequested ? null : onResetPin,
                icon: const Icon(Icons.lock_reset, size: 18),
                label: const Text('Olvidé mi PIN'),
              )
            else
              const SizedBox(height: 36),
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
