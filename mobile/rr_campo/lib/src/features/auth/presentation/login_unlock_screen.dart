import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/biometric/biometric_service.dart';
import '../../../shared/theme/app_tokens.dart';
import '../domain/auth_models.dart';
import 'login_widgets.dart';

class LoginUnlockScreen extends ConsumerStatefulWidget {
  const LoginUnlockScreen({
    super.key,
    required this.user,
    required this.biometricLoading,
    required this.biometricReady,
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
  final bool biometricReady; // Indica si ocurrió un fallo biométrico y se debe mostrar el PIN
  final String pin;
  final String pinError;
  final bool pinSaving;
  final VoidCallback onUnlockWithBiometric;
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onUseAnotherAccount;

  @override
  ConsumerState<LoginUnlockScreen> createState() => _LoginUnlockScreenState();
}

class _LoginUnlockScreenState extends ConsumerState<LoginUnlockScreen> {
  bool _showPinPadLocal = false;

  @override
  Widget build(BuildContext context) {
    final label = ref.watch(biometricLabelProvider).value ?? 'Biometría';
    final hasBiometrics = ref.watch(biometricAvailableProvider).value ?? false;
    final isBiometricEnabled = ref.watch(biometricEnabledStateProvider).value ?? false;

    // Se muestra el teclado si el usuario lo activó localmente
    // o si el padre nos dice que falló la biometría (widget.biometricReady)
    final showKeypad = _showPinPadLocal || widget.biometricReady;

    IconData? biometricIcon;
    if (hasBiometrics && isBiometricEnabled) {
      biometricIcon = label.toLowerCase().contains('face')
          ? Icons.face
          : label.toLowerCase().contains('huella')
              ? Icons.fingerprint
              : Icons.fingerprint_outlined;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          transitionBuilder: (child, animation) {
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.05),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            );
          },
          child: showKeypad
              ? _buildKeypadView(biometricIcon, label)
              : _buildUnlockButtonView(biometricIcon, label),
        ),
      ),
    );
  }

  /// Vista limpia: Avatar, nombre y botón de "Iniciar sesión"
  Widget _buildUnlockButtonView(IconData? biometricIcon, String label) {
    return SingleChildScrollView(
      key: const ValueKey('unlock_button_view'),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: 20),
          const LoginBrandHeader(),
          const SizedBox(height: 70),
          
          // Avatar grande
          LoginAvatar(initial: widget.user.nombre, radius: 46),
          const SizedBox(height: 20),
          
          // Nombre y rol del usuario
          Text(
            '${widget.user.nombre} ${widget.user.apellidos ?? ''}'.trim(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.ink,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '@${widget.user.username} · ${roleLabel(widget.user.role)}',
            style: const TextStyle(
              color: AppColors.ink2,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 70),
          
          // Botón Iniciar Sesión
          FilledButton.icon(
            onPressed: () {
              if (biometricIcon != null) {
                widget.onUnlockWithBiometric();
              } else {
                setState(() => _showPinPadLocal = true);
              }
            },
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(56),
              elevation: 2,
              shadowColor: AppColors.red.withValues(alpha: 0.2),
            ),
            icon: Icon(biometricIcon ?? Icons.lock_open_rounded),
            label: Text(
              biometricIcon != null ? 'Iniciar sesión con $label' : 'Iniciar sesión',
            ),
          ),
          const SizedBox(height: 14),
          
          // Link secundario para poner PIN manualmente si biometría está disponible
          if (biometricIcon != null)
            TextButton.icon(
              onPressed: () => setState(() => _showPinPadLocal = true),
              icon: const Icon(Icons.pin_outlined, size: 16),
              label: const Text('Ingresar usando mi PIN'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.ink2,
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
            
          const SizedBox(height: 40),
          TextButton(
            onPressed: widget.onUseAnotherAccount,
            child: const Text(
              'Usar otra cuenta',
              style: TextStyle(
                color: AppColors.red,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Vista de PIN: Con teclado en pantalla y dots
  Widget _buildKeypadView(IconData? biometricIcon, String label) {
    return SingleChildScrollView(
      key: const ValueKey('keypad_view'),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
                onPressed: () {
                  setState(() {
                    _showPinPadLocal = false;
                  });
                },
                color: AppColors.ink,
              ),
              const Expanded(
                child: Text(
                  'Volver',
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Perfil resumido
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                LoginAvatar(initial: widget.user.nombre, radius: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.user.nombre} ${widget.user.apellidos ?? ''}'.trim(),
                        style: const TextStyle(
                          color: AppColors.ink,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        '@${widget.user.username} · ${roleLabel(widget.user.role)}',
                        style: const TextStyle(
                          color: AppColors.ink2,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
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
            'Confirma tu código de 6 dígitos para continuar.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.ink2,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 20),
          
          PinDots(length: widget.pin.length),
          const SizedBox(height: 12),
          
          SizedBox(
            height: 24,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 150),
              child: widget.pinError.isNotEmpty
                  ? Text(
                      widget.pinError,
                      key: ValueKey(widget.pinError),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.danger,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ),
          const SizedBox(height: 12),
          
          PinKeypad(
            disabled: widget.pinSaving || widget.biometricLoading,
            onDigit: widget.onDigit,
            onBackspace: widget.onBackspace,
            biometricIcon: biometricIcon,
            onBiometricTap: widget.onUnlockWithBiometric,
          ),
          const SizedBox(height: 16),
          
          if (biometricIcon != null && widget.biometricLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.red,
                  ),
                ),
              ),
            ),
            
          TextButton(
            onPressed: widget.pinSaving || widget.biometricLoading ? null : widget.onUseAnotherAccount,
            child: const Text(
              'Usar otra cuenta',
              style: TextStyle(
                color: AppColors.red,
                fontWeight: FontWeight.w800,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
