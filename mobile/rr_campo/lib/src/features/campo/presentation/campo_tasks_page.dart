import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/campo_api.dart';
import '../domain/tarea_campo.dart';
import 'widgets/filter_chips.dart';
import 'widgets/task_card.dart';

final campoTasksProvider = FutureProvider.autoDispose<List<TareaCampo>>((ref) {
  return ref.watch(campoApiProvider).getTareas();
});

/// Pestaña "Tareas": header de usuario, banner de pendientes, buscador,
/// chips de filtro y lista de unidades a capturar.
class CampoTasksPage extends ConsumerStatefulWidget {
  const CampoTasksPage({super.key});

  @override
  ConsumerState<CampoTasksPage> createState() => _CampoTasksPageState();
}

class _CampoTasksPageState extends ConsumerState<CampoTasksPage> {
  final _searchController = TextEditingController();
  String _search = '';
  TareaFilter _filter = TareaFilter.todas;
  DateTime? _lastUpdated;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(campoTasksProvider, (previous, next) {
      if (next.hasValue) {
        _lastUpdated = DateTime.now();
      }
    });

    final tasksAsync = ref.watch(campoTasksProvider);
    final user = ref.watch(sessionControllerProvider).asData?.value.user;

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          _UserHeader(
            nombre: user?.nombre ?? 'Usuario',
            apellidos: user?.apellidos,
            role: user?.role,
            onRefresh: () => ref.invalidate(campoTasksProvider),
            onLogout: () async {
              await ref.read(sessionControllerProvider.notifier).logout();
              if (context.mounted) context.go('/pin');
            },
          ),
          Expanded(
            child: tasksAsync.when(
              data: (items) => _buildList(items),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _ErrorState(
                message: error.toString(),
                onRetry: () => ref.invalidate(campoTasksProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(List<TareaCampo> items) {
    final pendientes = items.where((task) => !task.estaCerrada).length;
    final filtered = items.where((task) {
      if (!_filter.matches(task)) return false;
      if (_search.isEmpty) return true;
      final needle = _search.toLowerCase();
      return task.vehiculoResumen.toLowerCase().contains(needle) ||
          (task.vin ?? '').toLowerCase().contains(needle) ||
          (task.clienteNombre ?? '').toLowerCase().contains(needle) ||
          (task.folio).toLowerCase().contains(needle);
    }).toList();

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(campoTasksProvider),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          _PendingBanner(pendientes: pendientes, total: items.length),
          const SizedBox(height: 14),
          _SearchField(
            controller: _searchController,
            onChanged: (value) => setState(() => _search = value),
          ),
          const SizedBox(height: 12),
          FilterChips(
            selected: _filter,
            onSelected: (value) => setState(() => _filter = value),
          ),
          const SizedBox(height: 16),
          if (filtered.isEmpty)
            _EmptyTasks(
              hasFilter: _search.isNotEmpty || _filter != TareaFilter.todas,
            )
          else
            ...filtered.map(
              (task) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: TaskCard(
                  task: task,
                  onTap: () => context.push('/campo/${task.id}/captura'),
                ),
              ),
            ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Última actualización: ${_formatTime(_lastUpdated)}',
              style: const TextStyle(color: AppColors.ink3, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatTime(DateTime? time) {
  final value = time ?? DateTime.now();
  final isPm = value.hour >= 12;
  var hour = value.hour % 12;
  if (hour == 0) hour = 12;
  final minute = value.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${isPm ? 'PM' : 'AM'}';
}

class _UserHeader extends StatelessWidget {
  const _UserHeader({
    required this.nombre,
    required this.apellidos,
    required this.role,
    required this.onRefresh,
    required this.onLogout,
  });

  final String nombre;
  final String? apellidos;
  final String? role;
  final VoidCallback onRefresh;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final fullName =
        '$nombre${apellidos != null && apellidos!.isNotEmpty ? ' $apellidos' : ''}';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.red,
            foregroundColor: Colors.white,
            child: Text(
              nombre.characters.first.toUpperCase(),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  '${roleLabel(role)} en sesión',
                  style: const TextStyle(color: AppColors.ink2, fontSize: 13),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Actualizar',
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh, color: AppColors.ink2),
          ),
          IconButton(
            tooltip: 'Salir',
            onPressed: onLogout,
            icon: const Icon(Icons.logout, color: AppColors.ink2),
          ),
        ],
      ),
    );
  }
}

class _PendingBanner extends StatelessWidget {
  const _PendingBanner({required this.pendientes, required this.total});

  final int pendientes;
  final int total;

  @override
  Widget build(BuildContext context) {
    final clear = pendientes == 0;
    const bg = AppColors.successSoft;
    const fg = AppColors.success;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        children: [
          Icon(
            clear ? Icons.check_circle : Icons.assignment_outlined,
            color: fg,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  clear ? 'Todo al día' : '$pendientes pendientes',
                  style: TextStyle(
                    color: fg,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
                Text(
                  clear
                      ? 'No tienes unidades por capturar.'
                      : 'Toca una unidad para capturar',
                  style: TextStyle(
                    color: fg.withValues(alpha: 0.85),
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
          if (!clear) Icon(Icons.chevron_right, color: fg),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: 'Buscar unidad, VIN o cliente',
        hintStyle: const TextStyle(color: AppColors.ink3),
        prefixIcon: const Icon(Icons.search, color: AppColors.ink3),
        suffixIcon: controller.text.isEmpty
            ? null
            : IconButton(
                icon: const Icon(Icons.close, color: AppColors.ink3),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              ),
        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 14),
      ),
    );
  }
}

class _EmptyTasks extends StatelessWidget {
  const _EmptyTasks({required this.hasFilter});

  final bool hasFilter;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 60),
      child: Column(
        children: [
          Icon(
            hasFilter ? Icons.search_off : Icons.inbox_outlined,
            size: 48,
            color: AppColors.ink3,
          ),
          const SizedBox(height: 12),
          Text(
            hasFilter
                ? 'No hay unidades con ese filtro.'
                : 'No tienes tareas asignadas.',
            style: const TextStyle(color: AppColors.ink2),
          ),
        ],
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
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 44, color: AppColors.ink3),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}
