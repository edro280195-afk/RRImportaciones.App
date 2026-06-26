import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../domain/tarea_campo.dart';

/// Filtros disponibles en la lista de tareas (igual que los chips del mockup).
enum TareaFilter { todas, abiertas, enYarda, incidencia }

extension TareaFilterX on TareaFilter {
  String get label => switch (this) {
    TareaFilter.todas => 'Todas',
    TareaFilter.abiertas => 'Abiertas',
    TareaFilter.enYarda => 'En yarda',
    TareaFilter.incidencia => 'Incidencia',
  };

  bool matches(TareaCampo tarea) => switch (this) {
    TareaFilter.todas => true,
    TareaFilter.abiertas =>
      tarea.estatus == 'ABIERTA' || tarea.estatus == 'TOMADA',
    TareaFilter.enYarda => tarea.estatus == 'EN_YARDA',
    TareaFilter.incidencia => tarea.estatus == 'INCIDENCIA',
  };
}

class FilterChips extends StatelessWidget {
  const FilterChips({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final TareaFilter selected;
  final ValueChanged<TareaFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: TareaFilter.values.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final filter = TareaFilter.values[index];
          final isActive = filter == selected;
          return GestureDetector(
            onTap: () => onSelected(filter),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isActive ? AppColors.red : AppColors.surface,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: isActive ? AppColors.red : AppColors.border,
                ),
              ),
              child: Text(
                filter.label,
                style: TextStyle(
                  color: isActive ? Colors.white : AppColors.ink2,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
