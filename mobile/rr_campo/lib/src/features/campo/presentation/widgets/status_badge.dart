import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';

/// Pastilla de estatus con color según el estado de la tarea.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.estatus});

  final String estatus;

  @override
  Widget build(BuildContext context) {
    final color = estatusColor(estatus);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        estatusLabel(estatus),
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w800,
          fontSize: 11,
        ),
      ),
    );
  }
}
