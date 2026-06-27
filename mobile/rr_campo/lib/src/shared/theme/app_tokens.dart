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

/// Etiqueta legible del estatus de un **trámite** (esquema semáforo del web).
String tramiteEstatusLabel(String estatus) {
  switch (estatus.toUpperCase()) {
    case 'PENDIENTE_TRAMITE':
    case 'PENDIENTE_DE_TRAMITE':
      return 'Pendiente de trámite';
    case 'FOTOS_SOLICITADAS':
      return 'Fotos solicitadas';
    case 'FOTOS_RECIBIDAS':
      return 'Fotos recibidas';
    case 'REQUISITOS_PENDIENTES':
      return 'Requisitos pendientes';
    case 'BAJA_EN_PROCESO':
      return 'Baja en proceso';
    case 'BAJA_COMPLETADA':
      return 'Baja completada';
    case 'LISTO_PARA_PEDIMENTO':
      return 'Listo para pedimento';
    case 'PEDIMENTO_DOCUMENTADO':
      return 'Pedimento documentado';
    case 'PAGO_PEDIMENTO_PENDIENTE':
      return 'Pago de pedimento pendiente';
    case 'MANDADO_A_CRUCE':
      return 'Mandado a cruce';
    case 'EN_PROCESO':
      return 'En proceso (cruce)';
    case 'ROJO_DESADUANADO':
      return 'Desaduanado';
    case 'VERDE_ENTREGADO':
      return 'Entregado (yarda)';
    case 'AMARILLO_PENDIENTE_PAGO':
      return 'Pendiente de pago';
    case 'COBRADO':
      return 'Cobrado';
    case 'ENTREGADO_AL_CLIENTE':
      return 'Entregado al cliente';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return estatus.replaceAll('_', ' ');
  }
}

/// Color del estatus de un trámite (mismos tonos que el web).
Color tramiteEstatusColor(String estatus) {
  switch (estatus.toUpperCase()) {
    case 'PENDIENTE_TRAMITE':
    case 'PENDIENTE_DE_TRAMITE':
    case 'REQUISITOS_PENDIENTES':
    case 'AMARILLO_PENDIENTE_PAGO':
    case 'PAGO_PEDIMENTO_PENDIENTE':
      return const Color(0xFFD97706); // ámbar
    case 'FOTOS_SOLICITADAS':
    case 'FOTOS_RECIBIDAS':
      return const Color(0xFFC61D26);
    case 'BAJA_EN_PROCESO':
    case 'BAJA_COMPLETADA':
      return const Color(0xFF7C3AED);
    case 'PEDIMENTO_DOCUMENTADO':
    case 'LISTO_PARA_PEDIMENTO':
      return const Color(0xFF2563EB);
    case 'MANDADO_A_CRUCE':
    case 'EN_PROCESO':
      return const Color(0xFF0F766E);
    case 'ROJO_DESADUANADO':
      return const Color(0xFFDC2626);
    case 'VERDE_ENTREGADO':
    case 'COBRADO':
    case 'ENTREGADO_AL_CLIENTE':
      return const Color(0xFF16A34A);
    case 'CANCELADO':
      return const Color(0xFF6B7280);
    default:
      return AppColors.ink2;
  }
}

/// Filtros de estatus para el listado de trámites (valor + etiqueta corta),
/// reflejando las pestañas del web.
const List<({String value, String label})> tramiteEstatusFiltros = [
  (value: 'PENDIENTE_TRAMITE', label: 'Pendientes'),
  (value: 'FOTOS_SOLICITADAS', label: 'Fotos'),
  (value: 'REQUISITOS_PENDIENTES', label: 'Requisitos'),
  (value: 'BAJA_EN_PROCESO', label: 'Baja'),
  (value: 'PEDIMENTO_DOCUMENTADO', label: 'Pedimento'),
  (value: 'MANDADO_A_CRUCE', label: 'Cruce'),
  (value: 'ROJO_DESADUANADO', label: 'Desaduanados'),
  (value: 'VERDE_ENTREGADO', label: 'Entregados'),
  (value: 'AMARILLO_PENDIENTE_PAGO', label: 'Pte. pago'),
  (value: 'COBRADO', label: 'Cobrados'),
  (value: 'CANCELADO', label: 'Cancelados'),
];

/// Todos los estatus válidos de un trámite, en orden de flujo (espejo de
/// `EstadoTramite.Todos` del backend). Se usa como respaldo del selector de
/// "Cambiar estado" si el endpoint de transiciones no responde.
const List<String> tramiteEstadosTodos = [
  'PENDIENTE_TRAMITE',
  'FOTOS_SOLICITADAS',
  'FOTOS_RECIBIDAS',
  'REQUISITOS_PENDIENTES',
  'BAJA_EN_PROCESO',
  'BAJA_COMPLETADA',
  'LISTO_PARA_PEDIMENTO',
  'PEDIMENTO_DOCUMENTADO',
  'PAGO_PEDIMENTO_PENDIENTE',
  'MANDADO_A_CRUCE',
  'EN_PROCESO',
  'ROJO_DESADUANADO',
  'VERDE_ENTREGADO',
  'ENTREGADO_AL_CLIENTE',
  'AMARILLO_PENDIENTE_PAGO',
  'COBRADO',
  'CANCELADO',
];

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
