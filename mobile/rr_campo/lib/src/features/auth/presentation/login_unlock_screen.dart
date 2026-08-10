import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/biometric/biometric_service.dart';
import '../../../shared/theme/app_tokens.dart';
import '../domain/auth_models.dart';
import 'login_widgets.dart';

/// Pantalla de desbloqueo: la sesión ya existe en este dispositivo y solo
/// se confirma con biometría. Si no hay biometría disponible o habilitada,
/// la única salida es volver a iniciar sesión con contraseña (nunca se deja
/// al usuario sin una acción posible).
class LoginUnlockScreen extends ConsumerWidget {
  const LoginUnlockScreen({
    super.key,
    required this.user,
    required this.biometricLoading,
    required this.errorMessage,
    required this.onUnlockWithBiometric,
    required this.onLogout,
  });

  final UserInfo user;
  final bool biometricLoading;
  final String errorMessage;
  final VoidCallback onUnlockWithBiometric;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final label = ref.watch(biometricLabelProvider).value ?? 'Biometría';
    final hasBiometrics = ref.watch(biometricAvailableProvider).value ?? false;
    final isBiometricEnabled =
        ref.watch(biometricEnabledStateProvider).value ?? false;
    final canUseBiometric = hasBiometrics && isBiometricEnabled;

    final biometricIcon = label.toLowerCase().contains('face')
        ? Icons.face
        : Icons.fingerprint;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              const LoginBrandHeader(),
              const SizedBox(height: 70),

              LoginAvatar(initial: user.nombre, radius: 46),
              const SizedBox(height: 20),

              Text(
                '${user.nombre} ${user.apellidos ?? ''}'.trim(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.ink,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '@${user.username} · ${roleLabel(user.role)}',
                style: const TextStyle(
                  color: AppColors.ink2,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 70),

              if (canUseBiometric) ...[
                FilledButton.icon(
                  onPressed: biometricLoading ? null : onUnlockWithBiometric,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                    elevation: 2,
                    shadowColor: AppColors.red.withValues(alpha: 0.2),
                  ),
                  icon: biometricLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Icon(biometricIcon),
                  label: Text('Desbloquear con $label'),
                ),
                if (errorMessage.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    errorMessage,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.danger,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ] else ...[
                Text(
                  errorMessage.isNotEmpty
                      ? errorMessage
                      : 'Vuelve a iniciar sesión con tu contraseña.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.ink2,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: onLogout,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                  ),
                  icon: const Icon(Icons.password_rounded),
                  label: const Text('Iniciar sesión con contraseña'),
                ),
              ],

              const SizedBox(height: 40),
              TextButton(
                onPressed: biometricLoading ? null : onLogout,
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
        ),
      ),
    );
  }
}
