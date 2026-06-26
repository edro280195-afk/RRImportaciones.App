import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/app_tokens.dart';
import 'campo_tasks_page.dart';
import 'widgets/task_card.dart';

/// Pestaña "Incidencias": tareas con estatus INCIDENCIA.
class IncidenciasPage extends ConsumerWidget {
  const IncidenciasPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(campoTasksProvider);

    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Text(
              'Incidencias',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            ),
          ),
          Expanded(
            child: tasksAsync.when(
              data: (items) {
                final incidencias = items
                    .where((task) => task.estatus == 'INCIDENCIA')
                    .toList();
                if (incidencias.isEmpty) {
                  return _Empty();
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(campoTasksProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    itemCount: incidencias.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final task = incidencias[index];
                      return TaskCard(
                        task: task,
                        onTap: () => context.push('/campo/${task.id}/captura'),
                      );
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(error.toString(), textAlign: TextAlign.center),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_outlined, size: 48, color: AppColors.success),
          SizedBox(height: 12),
          Text(
            'Sin incidencias abiertas.',
            style: TextStyle(color: AppColors.ink2),
          ),
        ],
      ),
    );
  }
}
