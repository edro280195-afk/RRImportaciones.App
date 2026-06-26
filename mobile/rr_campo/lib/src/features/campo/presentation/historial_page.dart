import 'package:flutter/material.dart';

import '../../../shared/theme/app_tokens.dart';

/// Pestaña "Historial": placeholder hasta tener el endpoint de completadas.
class HistorialPage extends StatelessWidget {
  const HistorialPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Text(
              'Historial',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            ),
          ),
          const Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.history, size: 48, color: AppColors.ink3),
                  SizedBox(height: 12),
                  Text(
                    'Próximamente',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  SizedBox(height: 4),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 40),
                    child: Text(
                      'Aquí verás las unidades que ya capturaste.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.ink2),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
