import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/auth/presentation/pin_page.dart';
import 'features/campo/presentation/campo_capture_page.dart';
import 'features/campo/presentation/campo_shell_page.dart';
import 'shared/session/session_controller.dart';
import 'shared/theme/app_theme.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionControllerProvider);
  final isAuthenticated = session.asData?.value.isAuthenticated ?? false;

  return GoRouter(
    initialLocation: isAuthenticated ? '/campo' : '/pin',
    redirect: (context, state) {
      final location = state.uri.path;
      if (!isAuthenticated && location != '/pin') {
        return '/pin';
      }
      if (isAuthenticated && location == '/pin') {
        return '/campo';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/pin', builder: (context, state) => const PinPage()),
      GoRoute(
        path: '/campo',
        builder: (context, state) => const CampoShellPage(),
      ),
      GoRoute(
        path: '/campo/:id/captura',
        builder: (context, state) =>
            CampoCapturePage(taskId: state.pathParameters['id']!),
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
      title: 'R&R Campo',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
