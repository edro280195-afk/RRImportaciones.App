import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';
import 'cotizacion_nueva_page.dart';

final tramitesDashboardProvider = FutureProvider.autoDispose<TramiteDashboardDto>((ref) {
  return ref.watch(adminApiProvider).getTramitesDashboard();
});

final cotizacionesDashboardProvider = FutureProvider.autoDispose<CotizacionDashboardDto>((ref) {
  return ref.watch(adminApiProvider).getCotizacionesDashboard();
});

class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(tramitesDashboardProvider);
    ref.invalidate(cotizacionesDashboardProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tramitesAsync = ref.watch(tramitesDashboardProvider);
    final cotizacionesAsync = ref.watch(cotizacionesDashboardProvider);

    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => _refresh(ref),
        color: AppColors.red,
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'R&R Importaciones',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Panel de Supervisión',
                        style: TextStyle(color: AppColors.ink2, fontSize: 13),
                      ),
                    ],
                  ),
                  IconButton.filledTonal(
                    onPressed: () => _refresh(ref),
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Actualizar Datos',
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Quick Actions
              const Text(
                'Acciones Rápidas',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.ink),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.calculate_outlined,
                      label: 'Nueva Cotización',
                      color: AppColors.purple,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const CotizacionNuevaPage(),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.qr_code_scanner,
                      label: 'Escanear VIN',
                      color: AppColors.red,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const CotizacionNuevaPage(startWithScan: true),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Resumen Operativo (Trámites)
              const Text(
                'Resumen Operativo (Trámites)',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.ink),
              ),
              const SizedBox(height: 12),
              tramitesAsync.when(
                data: (data) => Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _KpiCard(
                            title: 'Trámites Activos',
                            value: data.activos.toString(),
                            subtitle: '${data.vehiculosEnPatio} en patio',
                            icon: Icons.local_shipping_outlined,
                            color: AppColors.red,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _KpiCard(
                            title: 'Verdes del Mes',
                            value: data.verdesEsteMes.toString(),
                            subtitle: 'Listos/Entregados',
                            icon: Icons.check_circle_outline,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _KpiCard(
                            title: 'Cobrado este Mes',
                            value: currencyFormat.format(data.cobradoMes),
                            subtitle: 'Ingresos reales',
                            icon: Icons.payments_outlined,
                            color: AppColors.success,
                            isCompact: true,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _KpiCard(
                            title: 'Por Cobrar',
                            value: currencyFormat.format(data.porCobrar),
                            subtitle: '${data.amarillosPendientePago} pendientes de pago',
                            icon: Icons.warning_amber_rounded,
                            color: AppColors.warning,
                            isCompact: true,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                loading: () => const _KpiLoading(),
                error: (err, _) => _ErrorCard(message: err.toString()),
              ),
              const SizedBox(height: 24),

              // Resumen Cotizaciones
              const Text(
                'Cotizaciones',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.ink),
              ),
              const SizedBox(height: 12),
              cotizacionesAsync.when(
                data: (data) => Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _KpiCard(
                            title: 'Pendientes',
                            value: data.pendientesRespuesta.toString(),
                            subtitle: 'Esperando respuesta',
                            icon: Icons.chat_bubble_outline,
                            color: AppColors.purple,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _KpiCard(
                            title: 'Por Expirar',
                            value: data.porExpirar.toString(),
                            subtitle: 'Requieren atención',
                            icon: Icons.timer_outlined,
                            color: AppColors.danger,
                          ),
                        ),
                      ],
                    ),
                    if (data.aceptadasListas.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Aceptadas Listas (${data.aceptadasListas.length})',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppColors.success,
                            ),
                          ),
                          const Icon(Icons.arrow_forward, size: 16, color: AppColors.success),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: data.aceptadasListas.length,
                        itemBuilder: (context, index) {
                          final item = data.aceptadasListas[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              side: BorderSide(color: AppColors.success.withValues(alpha: 0.3)),
                            ),
                            child: ListTile(
                              title: Text(
                                item.vehiculo ?? 'Vehículo sin especificar',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Text(
                                'Cliente: ${item.clienteNombre ?? 'N/A'}\nFolio: ${item.folio ?? 'Sin folio'}',
                                style: const TextStyle(fontSize: 12),
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    currencyFormat.format(item.total),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: AppColors.ink,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.successSoft,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Aceptada',
                                      style: TextStyle(
                                        color: AppColors.success,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ],
                ),
                loading: () => const _KpiLoading(),
                error: (err, _) => _ErrorCard(message: err.toString()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.isCompact = false,
  });

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool isCompact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.soft,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.ink2,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Icon(icon, color: color.withValues(alpha: 0.7), size: 18),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: isCompact ? 16 : 22,
              fontWeight: FontWeight.w900,
              color: AppColors.ink,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.ink3, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _KpiLoading extends StatelessWidget {
  const _KpiLoading();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: const Center(
        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.red),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.redSoft,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
      ),
      child: Text(
        'Error al cargar: $message',
        style: const TextStyle(color: AppColors.danger, fontSize: 12),
      ),
    );
  }
}
