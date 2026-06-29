import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/biometric/biometric_service.dart';

/// Pestaña "Ajustes": perfil del usuario, cerrar sesión y versión.
class AjustesPage extends ConsumerWidget {
  const AjustesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionControllerProvider).asData?.value.user;
    final fullName = user == null
        ? 'Usuario'
        : '${user.nombre}${user.apellidos != null && user.apellidos!.isNotEmpty ? ' ${user.apellidos}' : ''}';

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          const Text(
            'Ajustes',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
              boxShadow: AppShadows.soft,
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.red,
                  foregroundColor: Colors.white,
                  child: Text(
                    fullName.characters.first.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (user != null)
                        Text(
                          '@${user.username}',
                          style: const TextStyle(
                            color: AppColors.ink2,
                            fontSize: 13,
                          ),
                        ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.successSoft,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          roleLabel(user?.role),
                          style: const TextStyle(
                            color: AppColors.success,
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (ref.watch(biometricAvailableProvider).value ?? false) ...[
            const Text(
              'Ajustes de Seguridad',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.ink2,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            SwitchListTile.adaptive(
              title: Text(
                'Usar ${ref.watch(biometricLabelProvider).value ?? 'Biometría'}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              subtitle: const Text(
                'Desbloquea la sesión de forma rápida y segura.',
                style: TextStyle(fontSize: 12),
              ),
              contentPadding: EdgeInsets.zero,
              value:
                  ref.watch(biometricEnabledStateProvider).asData?.value ??
                  false,
              onChanged: ref.watch(biometricEnabledStateProvider).isLoading
                  ? null
                  : (value) => _toggleBiometric(context, ref, value),
              activeTrackColor: AppColors.red,
            ),
            const SizedBox(height: 8),
            const Divider(),
            const SizedBox(height: 20),
          ],
          FilledButton.icon(
            onPressed: () => _logout(context, ref),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.red,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
            ),
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: const Text('Cerrar sesión'),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              'R&R Campo · v$appVersion',
              style: const TextStyle(color: AppColors.ink3, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleBiometric(
    BuildContext context,
    WidgetRef ref,
    bool enabled,
  ) async {
    final updated = await ref
        .read(biometricEnabledStateProvider.notifier)
        .toggle(enabled);
    if (!context.mounted || updated || !enabled) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'No se pudo activar la biometría. Confirma tu huella o rostro e inténtalo de nuevo.',
        ),
      ),
    );
  }

  void _logout(BuildContext context, WidgetRef ref) {
    ref.read(sessionControllerProvider.notifier).lock();
    context.go('/login');
  }
}
