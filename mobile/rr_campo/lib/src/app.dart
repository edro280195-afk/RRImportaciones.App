import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/admin/presentation/admin_shell_page.dart';
import 'features/auth/presentation/pin_page.dart';
import 'features/campo/presentation/campo_capture_page.dart';
import 'features/campo/presentation/campo_shell_page.dart';
import 'shared/session/session_controller.dart';
import 'shared/theme/app_theme.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionControllerProvider);
  final status =
      session.asData?.value.status ?? SessionStatus.unauthenticated;
  final isAdmin = session.asData?.value.isAdmin ?? false;

  return GoRouter(
    initialLocation: switch (status) {
      SessionStatus.unauthenticated => '/login',
      SessionStatus.locked => '/login', // Login page handles locked state
      SessionStatus.authenticated => isAdmin ? '/admin' : '/campo',
    },
    redirect: (context, state) {
      final location = state.uri.path;

      if (status == SessionStatus.unauthenticated ||
          status == SessionStatus.locked) {
        // Solo permitir acceder a /login si no está autenticado
        if (location != '/login') return '/login';
        return null;
      }

      // Autenticado — redirigir de /login al shell correcto
      if (location == '/login') {
        return isAdmin ? '/admin' : '/campo';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),

      // ── Shell Campo (yarderos, choferes) ──
      GoRoute(
        path: '/campo',
        builder: (context, state) => const CampoShellPage(),
      ),
      GoRoute(
        path: '/campo/:id/captura',
        builder: (context, state) =>
            CampoCapturePage(taskId: state.pathParameters['id']!),
      ),

      // ── Shell Admin (supervisores, admin, dueño) ──
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminShellPage(),
      ),
    ],
  );
});

class RrCampoApp extends ConsumerWidget {
  const RrCampoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'R&R Importaciones',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
