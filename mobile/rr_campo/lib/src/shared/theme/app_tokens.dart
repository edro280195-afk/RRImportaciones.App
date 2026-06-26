import 'package:flutter/material.dart';

/// Paleta central y tokens de diseño de R&R Campo.
/// Un solo lugar para colores, radios, espaciados y sombras.
class AppColors {
  AppColors._();

  static const red = Color(0xFFC61D26);
  static const redDark = Color(0xFFA3151C);
  static const redSoft = Color(0xFFFDECEC);

  static const ink = Color(0xFF0D1017); // texto principal
  static const ink2 = Color(0xFF475467); // texto secundario
  static const ink3 = Color(0xFF98A2B3); // texto terciario / iconos apagados

  static const border = Color(0xFFE4E7EC);
  static const surface = Colors.white;
  static const background = Color(0xFFF4F5F7);

  static const success = Color(0xFF087443);
  static const successSoft = Color(0xFFE8F8EE);
  static const warning = Color(0xFFB45309);
  static const danger = Color(0xFFB42318);
  static const purple = Color(0xFF6941C6);
}

class AppRadius {
  AppRadius._();

  static const sm = 10.0;
  static const md = 14.0;
  static const lg = 18.0;
  static const xl = 24.0;
}

class AppSpacing {
  AppSpacing._();

  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
}

class AppShadows {
  AppShadows._();

  static const card = [
    BoxShadow(color: Color(0x0F101828), blurRadius: 16, offset: Offset(0, 6)),
  ];

  static const soft = [
    BoxShadow(color: Color(0x0A101828), blurRadius: 8, offset: Offset(0, 2)),
  ];

  static const keypad = [
    BoxShadow(color: Color(0x14101828), blurRadius: 10, offset: Offset(0, 3)),
  ];
}

/// Etiqueta legible del estatus (equivalente a `estadoLabel` de Angular).
String estatusLabel(String estatus) {
  switch (estatus) {
    case 'ABIERTA':
      return 'Abierta';
    case 'TOMADA':
      return 'Tomada';
    case 'EN_YARDA':
      return 'En yarda';
    case 'INCIDENCIA':
      return 'Incidencia';
    case 'COMPLETADA':
      return 'Completada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return estatus;
  }
}

/// Color principal asociado a cada estatus.
Color estatusColor(String estatus) {
  switch (estatus) {
    case 'COMPLETADA':
      return AppColors.success;
    case 'INCIDENCIA':
      return AppColors.danger;
    case 'EN_YARDA':
      return AppColors.warning;
    case 'TOMADA':
      return AppColors.purple;
    case 'CANCELADA':
      return AppColors.ink3;
    case 'ABIERTA':
    default:
      return AppColors.red;
  }
}

/// Nombre amigable del rol para el subtítulo `rol en sesión`.
String roleLabel(String? role) {
  if (role == null || role.isEmpty) return 'Campo';
  final upper = role.toUpperCase();
  if (upper.contains('YARD') || upper.contains('CAMPO')) return 'Yardero';
  if (upper == 'ADMIN') return 'Administrador';
  if (upper == 'DUEÑO' || upper == 'DUENO') return 'Dueño';
  final lower = role.toLowerCase();
  return lower[0].toUpperCase() + lower.substring(1);
}

/// Versión mostrada en Ajustes (sin dependencias externas).
const appVersion = '1.0.0';
