import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';

final tramiteDetailProvider = FutureProvider.autoDispose.family<TramiteDetailDto, String>((ref, id) {
  return ref.watch(adminApiProvider).getTramiteDetail(id);
});

// Extension to wrap getTramiteDetail on AdminApi
extension AdminApiTramiteDetail on AdminApi {
  Future<TramiteDetailDto> getTramiteDetail(String id) => getTramiteById(id);
}

class TramiteDetailPage extends ConsumerStatefulWidget {
  const TramiteDetailPage({super.key, required this.tramiteId});

  final String tramiteId;

  @override
  ConsumerState<TramiteDetailPage> createState() => _TramiteDetailPageState();
}

class _TramiteDetailPageState extends ConsumerState<TramiteDetailPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(tramiteDetailProvider(widget.tramiteId));
  }

  void _showAddNoteDialog() {
    final noteController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Agregar Nota de Oficina'),
        content: TextField(
          controller: noteController,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Escribe una nota importante sobre el trámite...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () async {
              final content = noteController.text.trim();
              if (content.isEmpty) return;

              try {
                await ref.read(adminApiProvider).agregarNotaTramite(widget.tramiteId, content);
                if (context.mounted) {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Nota agregada correctamente')),
                  );
                  _refresh();
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  void _showChangeStatusDialog(TramiteDetailDto tramite) {
    String selectedStatus = tramite.estatus;
    final List<String> statuses = [
      'REGISTRO',
      'RECEPCION',
      'FOTOS',
      'ADUANA',
      'PAGO',
      'ENTREGADO',
    ];
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Cambiar Estado del Trámite'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: selectedStatus,
                decoration: const InputDecoration(
                  labelText: 'Nuevo Estado',
                  border: OutlineInputBorder(),
                ),
                items: statuses.map((status) {
                  return DropdownMenuItem<String>(
                    value: status,
                    child: Text(status),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => selectedStatus = val);
                  }
                },
              ),
              const SizedBox(height: 16),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(
                  labelText: 'Notas / Bitácora',
                  hintText: 'Detalle del cambio...',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                try {
                  await ref.read(adminApiProvider).cambiarEstadoTramite(
                    widget.tramiteId,
                    nuevoEstado: selectedStatus,
                    notas: notesController.text.trim().isEmpty
                        ? null
                        : notesController.text.trim(),
                  );
                  if (context.mounted) {
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Estado actualizado correctamente')),
                    );
                    _refresh();
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error: $e')),
                    );
                  }
                }
              },
              child: const Text('Confirmar'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddPedimentoDialog() {
    final pedimentoController = TextEditingController();
    final typeController = TextEditingController(text: 'A1');
    final patenteController = TextEditingController(text: '3920'); // Patente por defecto
    final igiController = TextEditingController();
    final dtaController = TextEditingController();
    final ivaController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Registrar Pedimento'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: pedimentoController,
                decoration: const InputDecoration(
                  labelText: 'Número de Pedimento (15 dígitos)',
                  hintText: 'Ej. 2639206001234',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: typeController,
                      decoration: const InputDecoration(
                        labelText: 'Tipo',
                        hintText: 'A1, R1',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: patenteController,
                      decoration: const InputDecoration(
                        labelText: 'Patente',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: igiController,
                decoration: const InputDecoration(
                  labelText: 'IGI / Arancel (\$)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: dtaController,
                decoration: const InputDecoration(
                  labelText: 'DTA (\$)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: ivaController,
                decoration: const InputDecoration(
                  labelText: 'IVA (\$)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () async {
              final ped = pedimentoController.text.trim();
              if (ped.isEmpty) return;

              try {
                await ref.read(adminApiProvider).agregarPedimento(
                  widget.tramiteId,
                  numeroPedimento: ped,
                  tipo: typeController.text.trim(),
                  patente: patenteController.text.trim(),
                  igi: double.tryParse(igiController.text),
                  dta: double.tryParse(dtaController.text),
                  iva: double.tryParse(ivaController.text),
                );
                if (context.mounted) {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Pedimento registrado correctamente')),
                  );
                  _refresh();
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: const Text('Registrar'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'REGISTRO':
        return Colors.blue;
      case 'RECEPCION':
        return Colors.orange;
      case 'FOTOS':
        return Colors.purple;
      case 'ADUANA':
        return Colors.teal;
      case 'PAGO':
        return Colors.amber;
      case 'ENTREGADO':
        return Colors.green;
      default:
        return AppColors.ink3;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tramiteAsync = ref.watch(tramiteDetailProvider(widget.tramiteId));

    return tramiteAsync.when(
      data: (tramite) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: Text(
              'Trámite #${tramite.numeroConsecutivo}',
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            elevation: 0,
            backgroundColor: AppColors.surface,
            foregroundColor: AppColors.ink,
            actions: [
              IconButton(
                onPressed: _refresh,
                icon: const Icon(Icons.refresh),
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              labelColor: AppColors.red,
              unselectedLabelColor: AppColors.ink2,
              indicatorColor: AppColors.red,
              tabs: const [
                Tab(text: 'Resumen'),
                Tab(text: 'Timeline'),
                Tab(text: 'Documentación'),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildResumenTab(tramite),
              _buildTimelineTab(tramite),
              _buildDocsTab(tramite),
            ],
          ),
          bottomNavigationBar: Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.surface,
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _showChangeStatusDialog(tramite),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: const Text('Cambiar Estado'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _showAddNoteDialog,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.red,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: const Text('Agregar Nota'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
      loading: () => const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.red),
        ),
      ),
      error: (err, _) => Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
                const SizedBox(height: 16),
                Text(
                  'Error al cargar trámite: $err',
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

  Widget _buildResumenTab(TramiteDetailDto tramite) {
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Estado del Trámite',
                    style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.ink2),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(tramite.estatus).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      tramite.estatus.toUpperCase(),
                      style: TextStyle(
                        color: _getStatusColor(tramite.estatus),
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Días en este estado: ${tramite.diasEnEstado} días',
                style: const TextStyle(color: AppColors.ink3, fontSize: 13),
              ),
              if (tramite.fechaEstadoActual != null)
                Text(
                  'Último cambio: ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(tramite.fechaEstadoActual!))}',
                  style: const TextStyle(color: AppColors.ink3, fontSize: 13),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Vehicle info
        _buildSectionHeader('Datos del Vehículo'),
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
              _buildResumenItem('Vehículo', '${tramite.vehiculoMarca ?? ''} ${tramite.vehiculoModelo ?? ''} ${tramite.vehiculoAnno ?? ''}'),
              _buildResumenItem('VIN completo', tramite.vehiculoVin ?? 'N/A', isMonospace: true),
              _buildResumenItem('Régimen', tramite.tipoTramite),
              _buildResumenItem('Aduana', tramite.aduanaNombre ?? 'N/A'),
              _buildResumenItem('Tramitador', tramite.tramitadorNombre ?? 'N/A'),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Finances card
        _buildSectionHeader('Resumen Financiero'),
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
              _buildResumenItem('Cobro Total', currencyFormat.format(tramite.cobroTotal), isBoldVal: true),
              _buildResumenItem('Honorarios Aduana', currencyFormat.format(tramite.honorarios)),
              _buildResumenItem('Cargo Express', currencyFormat.format(tramite.cargoExpress)),
              const Divider(height: 20),
              _buildResumenItem('Total Pagado', currencyFormat.format(tramite.totalPagado), valColor: AppColors.success),
              _buildResumenItem(
                'Saldo Pendiente',
                currencyFormat.format(tramite.saldoPendiente),
                valColor: tramite.saldoPendiente > 0 ? AppColors.danger : AppColors.success,
                isBoldVal: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Pedimentos Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildSectionHeader('Pedimentos Aduanales'),
            TextButton.icon(
              onPressed: _showAddPedimentoDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Registrar', style: TextStyle(fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 4),
        if (tramite.pedimentos.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
            ),
            child: const Center(
              child: Text(
                'No hay pedimentos registrados para este trámite.',
                style: TextStyle(color: AppColors.ink3, fontSize: 13),
              ),
            ),
          )
        else
          ...tramite.pedimentos.map((p) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Pedimento: ${p.numeroPedimento}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.red.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              p.tipo,
                              style: const TextStyle(
                                color: AppColors.red,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Patente: ${p.patente ?? 'N/A'}', style: const TextStyle(fontSize: 12, color: AppColors.ink2)),
                          Text(
                            'Impuestos: ${currencyFormat.format(p.totalContribuciones ?? 0)}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              )),
      ],
    );
  }

  Widget _buildTimelineTab(TramiteDetailDto tramite) {
    if (tramite.eventos.isEmpty) {
      return const Center(
        child: Text('No hay eventos en la bitácora aún.', style: TextStyle(color: AppColors.ink3)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tramite.eventos.length,
      itemBuilder: (context, index) {
        final ev = tramite.eventos[index];
        final timeStr = DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(ev.fechaEvento));

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: const BoxDecoration(
                    color: AppColors.red,
                    shape: BoxShape.circle,
                  ),
                ),
                if (index < tramite.eventos.length - 1)
                  Container(
                    width: 2,
                    height: 80,
                    color: AppColors.border,
                  ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        ev.tipo.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.ink),
                      ),
                      Text(
                        timeStr,
                        style: const TextStyle(color: AppColors.ink3, fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ev.contenido,
                    style: const TextStyle(color: AppColors.ink2, fontSize: 13),
                  ),
                  if (ev.creadoPorNombre != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      'Por: ${ev.creadoPorNombre}',
                      style: const TextStyle(color: AppColors.ink3, fontSize: 11, fontStyle: FontStyle.italic),
                    ),
                  ],
                  if (ev.fotoUrl != null) ...[
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () => launchUrl(Uri.parse(ev.fotoUrl!)),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.image, size: 16, color: AppColors.red),
                            SizedBox(width: 6),
                            Text('Ver Evidencia Fotográfica', style: TextStyle(fontSize: 12, color: AppColors.red)),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildDocsTab(TramiteDetailDto tramite) {
    if (tramite.documentos.isEmpty) {
      return const Center(
        child: Text('No se requiere documentación.', style: TextStyle(color: AppColors.ink3)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tramite.documentos.length,
      itemBuilder: (context, index) {
        final doc = tramite.documentos[index];
        final isUploaded = doc.archivoUrl != null && doc.archivoUrl!.isNotEmpty;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            side: const BorderSide(color: AppColors.border),
          ),
          child: ListTile(
            title: Text(
              doc.nombre,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: doc.estadoLogistico == 'VALIDADO'
                        ? AppColors.successSoft
                        : doc.estadoLogistico == 'RECIBIDO'
                            ? Colors.amber.shade50
                            : AppColors.border,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    doc.estadoLogistico,
                    style: TextStyle(
                      color: doc.estadoLogistico == 'VALIDADO'
                          ? AppColors.success
                          : doc.estadoLogistico == 'RECIBIDO'
                              ? Colors.amber.shade900
                              : AppColors.ink2,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (doc.esRequerido) ...[
                  const SizedBox(width: 8),
                  const Text('* Requerido', style: TextStyle(color: AppColors.danger, fontSize: 11)),
                ]
              ],
            ),
            trailing: isUploaded
                ? IconButton(
                    icon: const Icon(Icons.download_for_offline, color: AppColors.red),
                    onPressed: () => launchUrl(Uri.parse(doc.archivoUrl!)),
                    tooltip: 'Descargar Documento',
                  )
                : const Icon(Icons.cloud_upload_outlined, color: AppColors.ink3),
          ),
        );
      },
    );
  }

  Widget _buildSectionHeader(String title) {
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

  Widget _buildResumenItem(String label, String value, {bool isMonospace = false, Color? valColor, bool isBoldVal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.ink2, fontSize: 13)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontFamily: isMonospace ? 'monospace' : null,
                fontWeight: isBoldVal ? FontWeight.w900 : FontWeight.w600,
                color: valColor ?? AppColors.ink,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
