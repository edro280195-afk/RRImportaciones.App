import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/biometric/biometric_service.dart';
import 'admin_dashboard_page.dart';
import 'tramite_list_page.dart';
import 'cotizacion_list_page.dart';

/// Shell de administración con NavigationBar inferior.
/// Contendrá Dashboard, Trámites, Cotizaciones y Más.
class AdminShellPage extends ConsumerStatefulWidget {
  const AdminShellPage({super.key});

  @override
  ConsumerState<AdminShellPage> createState() => _AdminShellPageState();
}

class _AdminShellPageState extends ConsumerState<AdminShellPage> {
  int _index = 0;

  static const _tabs = [
    AdminDashboardPage(),
    TramiteListPage(),
    CotizacionListPage(),
    _AdminMorePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Trámites',
          ),
          NavigationDestination(
            icon: Icon(Icons.calculate_outlined),
            selectedIcon: Icon(Icons.calculate),
            label: 'Cotizar',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz),
            selectedIcon: Icon(Icons.more_horiz),
            label: 'Más',
          ),
        ],
      ),
    );
  }
}

/// Pestaña "Más" con acceso a módulos secundarios y cierre de sesión.
class _AdminMorePage extends ConsumerWidget {
  const _AdminMorePage();

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
            'Más',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 16),
          // Profile card
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
                      if (user != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          '@${user.username} · ${user.role}',
                          style: const TextStyle(
                            color: AppColors.ink2,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Coming soon modules
          _MoreTile(
            icon: Icons.people_outline,
            label: 'Clientes',
            onTap: () {},
          ),
          _MoreTile(
            icon: Icons.payments_outlined,
            label: 'Pagos',
            onTap: () {},
          ),
          _MoreTile(
            icon: Icons.inventory_2_outlined,
            label: 'Inventario',
            onTap: () {},
          ),
          _MoreTile(
            icon: Icons.local_shipping_outlined,
            label: 'Entregas',
            onTap: () {},
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 8),
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
              'R&R Importaciones · v$appVersion',
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

class _MoreTile extends StatelessWidget {
  const _MoreTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: ListTile(
        leading: Icon(icon, color: AppColors.ink2),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.ink3),
        onTap: onTap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
      ),
    );
  }
}
