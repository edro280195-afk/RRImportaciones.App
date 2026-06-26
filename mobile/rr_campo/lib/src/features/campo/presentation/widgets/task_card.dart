import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../domain/campo_constants.dart';
import '../../domain/tarea_campo.dart';
import 'status_badge.dart';

/// Tarjeta de tarea para la lista de campo (estilo mockup pantalla 2).
class TaskCard extends StatelessWidget {
  const TaskCard({super.key, required this.task, required this.onTap});

  final TareaCampo task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fotos = task.fotosUrls.length;
    final color = estatusColor(task.estatus);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.soft,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              task.vehiculoResumen,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(estatus: task.estatus),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        task.vin ?? task.folio,
                        style: const TextStyle(
                          color: AppColors.ink2,
                          fontSize: 13,
                          fontFamily: 'monospace',
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _MetaItem(
                            icon: Icons.photo_camera_outlined,
                            label: '$fotos/$kMinPhotos fotos',
                            highlight: fotos >= kMinPhotos,
                          ),
                          const SizedBox(width: 16),
                          if (task.ubicacion != null &&
                              task.ubicacion!.isNotEmpty)
                            Flexible(
                              child: _MetaItem(
                                icon: Icons.location_on_outlined,
                                label: task.ubicacion!,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.chevron_right, color: color),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MetaItem extends StatelessWidget {
  const _MetaItem({
    required this.icon,
    required this.label,
    this.highlight = false,
  });

  final IconData icon;
  final String label;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final color = highlight ? AppColors.success : AppColors.ink2;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: color),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color,
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
