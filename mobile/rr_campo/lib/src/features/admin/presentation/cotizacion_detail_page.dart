import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';
import 'tramite_detail_page.dart';

final cotizacionDetailProvider = FutureProvider.autoDispose
    .family<CotizacionOutput, String>((ref, id) {
      return ref.watch(adminApiProvider).getCotizacionById(id);
    });

final aduanasProvider = FutureProvider.autoDispose<List<AduanaDto>>((ref) {
  return ref.watch(adminApiProvider).getAduanas();
});

final tramitadoresProvider = FutureProvider.autoDispose<List<TramitadorDto>>((
  ref,
) {
  return ref.watch(adminApiProvider).getTramitadores();
});

class CotizacionDetailPage extends ConsumerWidget {
  const CotizacionDetailPage({super.key, required this.cotizacionId});

  final String cotizacionId;

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(cotizacionDetailProvider(cotizacionId));
  }

  void _shareQuotePdf(BuildContext context, CotizacionOutput cot) {
    final pdfUrl =
        '${refApiUrl(context)}/api/cotizaciones/$cotizacionId/pdf/download';
    final shareMsg =
        'R&R Importaciones - Cotización Oficial ${cot.folio ?? ''}\n'
        'Vehículo: ${cot.marca ?? ''} ${cot.modelo ?? ''} ${cot.anno ?? ''}\n'
        'Total estimado de importación: \$${NumberFormat('#,##0.00').format(cot.total)} MXN\n'
        'Puedes descargar el PDF oficial aquí: $pdfUrl';

    Share.share(shareMsg);
  }

  void _sendWhatsApp(BuildContext context, WidgetRef ref) async {
    try {
      final response = await ref
          .read(adminApiProvider)
          .getWhatsAppLink(cotizacionId);
      final url = Uri.parse(response.whatsappUrl);
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No se pudo abrir WhatsApp. Compartiendo texto...'),
            ),
          );
          Share.share(response.mensaje);
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error al generar enlace: $e')));
      }
    }
  }

  void _showConvertToTramiteDialog(
    BuildContext context,
    WidgetRef ref,
    CotizacionOutput cot,
  ) {
    String? selectedAduanaId;
    String? selectedTramitadorId;
    String selectedTipo = cot.regimenFiscal;
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final aduanasAsync = ref.watch(aduanasProvider);
          final tramitadoresAsync = ref.watch(tramitadoresProvider);

          return aduanasAsync.when(
            data: (aduanas) => tramitadoresAsync.when(
              data: (tramitadores) {
                // Pre-seleccionar aduana si coincide con la cotización
                if (selectedAduanaId == null && aduanas.isNotEmpty) {
                  selectedAduanaId = aduanas.first.id;
                }
                if (selectedTramitadorId == null && tramitadores.isNotEmpty) {
                  selectedTramitadorId = tramitadores.first.id;
                }

                return AlertDialog(
                  title: const Text('Convertir a Trámite'),
                  content: StatefulBuilder(
                    builder: (context, setState) => SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'Esta cotización será archivada y se abrirá un nuevo trámite de importación activo.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.ink2,
                            ),
                          ),
                          const SizedBox(height: 16),
                          DropdownButtonFormField<String>(
                            initialValue: selectedAduanaId,
                            decoration: const InputDecoration(
                              labelText: 'Aduana de Cruce',
                              border: OutlineInputBorder(),
                            ),
                            items: aduanas.map((ad) {
                              return DropdownMenuItem<String>(
                                value: ad.id,
                                child: Text('${ad.claveAduana} - ${ad.nombre}'),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setState(() => selectedAduanaId = val);
                            },
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: selectedTramitadorId,
                            decoration: const InputDecoration(
                              labelText: 'Tramitador Responsable',
                              border: OutlineInputBorder(),
                            ),
                            items: tramitadores.map((tr) {
                              return DropdownMenuItem<String>(
                                value: tr.id,
                                child: Text(tr.nombreCompleto),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setState(() => selectedTramitadorId = val);
                            },
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: selectedTipo,
                            decoration: const InputDecoration(
                              labelText: 'Régimen / Tipo',
                              border: OutlineInputBorder(),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'REGULAR',
                                child: Text('REGULAR (Importación)'),
                              ),
                              DropdownMenuItem(
                                value: 'AMPARO',
                                child: Text('AMPARO'),
                              ),
                              DropdownMenuItem(
                                value: 'FRANJA',
                                child: Text('FRANJA FRONTERIZA'),
                              ),
                            ],
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => selectedTipo = val);
                              }
                            },
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: notesController,
                            decoration: const InputDecoration(
                              labelText: 'Notas adicionales',
                              border: OutlineInputBorder(),
                            ),
                            maxLines: 2,
                          ),
                        ],
                      ),
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancelar'),
                    ),
                    FilledButton(
                      onPressed: () async {
                        if (selectedAduanaId == null ||
                            selectedTramitadorId == null) {
                          return;
                        }

                        // Buscar código aduana seleccionado
                        final aduana = aduanas.firstWhere(
                          (element) => element.id == selectedAduanaId,
                        );

                        try {
                          final result = await ref
                              .read(adminApiProvider)
                              .convertirATramite(
                                cotizacionId,
                                ConvertirCotizacionRequest(
                                  aduanaCodigo: aduana.claveAduana,
                                  tramitadorId: selectedTramitadorId!,
                                  tipoTramite: selectedTipo,
                                  notasAdicionales:
                                      notesController.text.trim().isEmpty
                                      ? null
                                      : notesController.text.trim(),
                                ),
                              );

                          if (context.mounted) {
                            Navigator.of(context).pop(); // Cierra dialog
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Convertida a trámite con éxito'),
                              ),
                            );
                            // Ir al detalle del trámite creado
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) =>
                                    TramiteDetailPage(tramiteId: result.id),
                              ),
                            );
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e')),
                            );
                          }
                        }
                      },
                      child: const Text('Convertir'),
                    ),
                  ],
                );
              },
              loading: () => const _LoadingDialogContent(),
              error: (err, _) => _ErrorDialogContent(message: err.toString()),
            ),
            loading: () => const _LoadingDialogContent(),
            error: (err, _) => _ErrorDialogContent(message: err.toString()),
          );
        },
      ),
    );
  }

  String refApiUrl(BuildContext context) {
    // Retornar url base del API client
    return 'c:\\Codigos\\RRImportaciones'; // Local fallback o URL dinámica de config
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'BORRADOR':
        return Colors.grey;
      case 'ENVIADA':
        return Colors.blue;
      case 'ACEPTADA':
        return Colors.green;
      case 'RECHAZADA':
        return Colors.red;
      case 'EXPIRADA':
        return Colors.orange;
      default:
        return AppColors.ink3;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotizacionAsync = ref.watch(cotizacionDetailProvider(cotizacionId));
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Desglose Fiscal',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        actions: [
          IconButton(
            onPressed: () => _refresh(ref),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: cotizacionAsync.when(
        data: (cot) {
          final statusColor = _getStatusColor(cot.estado);
          final showConvertBtn =
              cot.estado.toUpperCase() == 'ACEPTADA' && cot.tramiteId == null;

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Folio and Status Header
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                cot.folio ?? 'BORRADOR SIN FOLIO',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  cot.estado.toUpperCase(),
                                  style: TextStyle(
                                    color: statusColor,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 24),
                          _buildDetailRow(
                            'Vehículo',
                            '${cot.marca ?? ''} ${cot.modelo ?? ''} ${cot.anno ?? ''}',
                            isBoldVal: true,
                          ),
                          _buildDetailRow(
                            'VIN',
                            cot.vin ?? 'N/A',
                            isMonospace: true,
                          ),
                          _buildDetailRow(
                            'Cliente',
                            cot.clienteNombre ?? 'N/A',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Cost calculations
                    _buildSectionTitle('Desglose de Impuestos'),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          _buildDetailRow(
                            'Valor Estimado Aduana (USD)',
                            '\$${NumberFormat('#,##0.00').format(cot.valorAduanaUsd ?? 0)} USD',
                          ),
                          _buildDetailRow(
                            'Tipo de Cambio Aplicado',
                            '\$${NumberFormat('#,##0.0000').format(cot.tipoCambioAplicado ?? 0)} MXN',
                          ),
                          _buildDetailRow(
                            'Valor en Pesos Mexicanos',
                            currencyFormat.format(cot.valorPesos),
                          ),
                          const Divider(height: 20),
                          _buildDetailRow(
                            'IGI / Arancel (${cot.igiPorcentaje}%)',
                            currencyFormat.format(cot.igi),
                          ),
                          _buildDetailRow(
                            'DTA (Derecho Trámite Aduanero)',
                            currencyFormat.format(cot.dta),
                          ),
                          _buildDetailRow(
                            'IVA',
                            currencyFormat.format(cot.iva),
                          ),
                          _buildDetailRow(
                            'PREV (Prevalidación)',
                            currencyFormat.format(cot.prev),
                          ),
                          _buildDetailRow(
                            'PRV (Procesamiento)',
                            currencyFormat.format(cot.prv),
                          ),
                          const Divider(height: 20),
                          _buildDetailRow(
                            'Subtotal Impuestos',
                            currencyFormat.format(cot.impuestosTotal),
                            isBoldVal: true,
                          ),
                          _buildDetailRow(
                            'Honorarios Agencia',
                            currencyFormat.format(cot.honorarios),
                          ),
                          _buildDetailRow(
                            'Cargo Express',
                            currencyFormat.format(cot.cargoExpress),
                          ),
                          const Divider(height: 20),
                          _buildDetailRow(
                            'Total General',
                            currencyFormat.format(cot.total),
                            isBoldVal: true,
                            valColor: AppColors.red,
                            fontSize: 16,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (cot.notas != null && cot.notas!.isNotEmpty) ...[
                      _buildSectionTitle('Notas'),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Text(
                          cot.notas ?? '',
                          style: const TextStyle(
                            color: AppColors.ink2,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ],
                ),
              ),
              // Buttons panel
              Container(
                padding: const EdgeInsets.all(16),
                color: AppColors.surface,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _shareQuotePdf(context, cot),
                            icon: const Icon(Icons.share, size: 18),
                            label: const Text('Compartir PDF'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(48),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => _sendWhatsApp(context, ref),
                            icon: const Icon(Icons.send, size: 18),
                            label: const Text('WhatsApp'),
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(
                                0xFF25D366,
                              ), // WhatsApp color
                              minimumSize: const Size.fromHeight(48),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (showConvertBtn) ...[
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () =>
                            _showConvertToTramiteDialog(context, ref, cot),
                        icon: const Icon(Icons.swap_calls),
                        label: const Text('Convertir en Trámite Activo'),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.red,
                          minimumSize: const Size.fromHeight(50),
                        ),
                      ),
                    ] else if (cot.tramiteId != null) ...[
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  TramiteDetailPage(tramiteId: cot.tramiteId!),
                            ),
                          );
                        },
                        icon: const Icon(Icons.assignment),
                        label: const Text('Ver Trámite Asociado'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.success,
                          side: const BorderSide(color: AppColors.success),
                          minimumSize: const Size.fromHeight(48),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.red),
        ),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 48,
                  color: AppColors.danger,
                ),
                const SizedBox(height: 16),
                Text(
                  'Error: $err',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w800,
        color: AppColors.ink2,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildDetailRow(
    String label,
    String value, {
    bool isMonospace = false,
    bool isBoldVal = false,
    Color? valColor,
    double fontSize = 13,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.ink2, fontSize: 13),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontFamily: isMonospace ? 'monospace' : null,
                fontWeight: isBoldVal ? FontWeight.w900 : FontWeight.w600,
                color: valColor ?? AppColors.ink,
                fontSize: fontSize,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingDialogContent extends StatelessWidget {
  const _LoadingDialogContent();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 150,
      child: Center(child: CircularProgressIndicator(color: AppColors.red)),
    );
  }
}

class _ErrorDialogContent extends StatelessWidget {
  const _ErrorDialogContent({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 150,
      child: Center(
        child: Text(
          'Error: $message',
          style: const TextStyle(color: AppColors.danger),
        ),
      ),
    );
  }
}
