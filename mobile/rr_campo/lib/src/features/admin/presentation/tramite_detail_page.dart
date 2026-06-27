import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';

final tramiteDetailProvider = FutureProvider.autoDispose
    .family<TramiteDetailDto, String>((ref, id) {
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

class _TramiteDetailPageState extends ConsumerState<TramiteDetailPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<TipoGastoDto>? _tiposGasto;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
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
                await ref
                    .read(adminApiProvider)
                    .agregarNotaTramite(widget.tramiteId, content);
                if (context.mounted) {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Nota agregada correctamente'),
                    ),
                  );
                  _refresh();
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              }
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  Future<void> _showChangeStatusDialog(TramiteDetailDto tramite) async {
    // El flujo de estados lo decide el backend; solo ofrecemos las
    // transiciones válidas desde el estado actual (igual que el web).
    List<String> estados;
    try {
      estados = await ref
          .read(adminApiProvider)
          .getTransicionesEstado(tramite.estatus);
    } catch (_) {
      // Respaldo: si el endpoint de transiciones no responde, ofrecemos todos
      // los estados válidos (menos el actual). El backend valida al confirmar.
      estados = tramiteEstadosTodos
          .where((e) => e != tramite.estatus.toUpperCase())
          .toList();
    }
    if (!mounted) return;
    if (estados.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Este trámite está en un estado final; no hay cambios disponibles.',
          ),
        ),
      );
      return;
    }

    String? selectedStatus;
    final notesController = TextEditingController();

    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setLocalState) => AlertDialog(
          title: const Text('Cambiar estado del trámite'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Estado actual: ',
                    style: TextStyle(color: AppColors.ink2, fontSize: 13),
                  ),
                  Expanded(
                    child: Text(
                      tramiteEstatusLabel(tramite.estatus),
                      style: TextStyle(
                        color: tramiteEstatusColor(tramite.estatus),
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: selectedStatus,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Nuevo estado',
                  border: OutlineInputBorder(),
                ),
                hint: const Text('Selecciona el nuevo estado'),
                items: estados.map((status) {
                  return DropdownMenuItem<String>(
                    value: status,
                    child: Text(tramiteEstatusLabel(status)),
                  );
                }).toList(),
                onChanged: (val) => setLocalState(() => selectedStatus = val),
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
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: selectedStatus == null
                  ? null
                  : () async {
                      try {
                        await ref
                            .read(adminApiProvider)
                            .cambiarEstadoTramite(
                              widget.tramiteId,
                              nuevoEstado: selectedStatus!,
                              notas: notesController.text.trim().isEmpty
                                  ? null
                                  : notesController.text.trim(),
                            );
                        if (dialogContext.mounted) {
                          Navigator.of(dialogContext).pop();
                        }
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Estado actualizado correctamente'),
                            ),
                          );
                          _refresh();
                        }
                      } catch (e) {
                        if (dialogContext.mounted) {
                          ScaffoldMessenger.of(
                            dialogContext,
                          ).showSnackBar(SnackBar(content: Text('Error: $e')));
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
    final patenteController = TextEditingController(
      text: '3920',
    ); // Patente por defecto
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
                await ref
                    .read(adminApiProvider)
                    .agregarPedimento(
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
                    const SnackBar(
                      content: Text('Pedimento registrado correctamente'),
                    ),
                  );
                  _refresh();
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              }
            },
            child: const Text('Registrar'),
          ),
        ],
      ),
    );
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
              IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
            ],
            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelColor: AppColors.red,
              unselectedLabelColor: AppColors.ink2,
              indicatorColor: AppColors.red,
              tabs: const [
                Tab(text: 'Resumen'),
                Tab(text: 'Pagos'),
                Tab(text: 'Gastos'),
                Tab(text: 'Timeline'),
                Tab(text: 'Documentos'),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildResumenTab(tramite),
              _buildPagosTab(tramite),
              _buildGastosTab(tramite),
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
        body: Center(child: CircularProgressIndicator(color: AppColors.red)),
      ),
      error: (err, _) => Scaffold(
        appBar: AppBar(),
        body: Center(
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
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.ink2,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: tramiteEstatusColor(
                        tramite.estatus,
                      ).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      tramiteEstatusLabel(tramite.estatus),
                      style: TextStyle(
                        color: tramiteEstatusColor(tramite.estatus),
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
              _buildResumenItem(
                'Vehículo',
                '${tramite.vehiculoMarca ?? ''} ${tramite.vehiculoModelo ?? ''} ${tramite.vehiculoAnno ?? ''}',
              ),
              _buildResumenItem(
                'VIN completo',
                tramite.vehiculoVin ?? 'N/A',
                isMonospace: true,
              ),
              _buildResumenItem('Régimen', tramite.tipoTramite),
              _buildResumenItem('Aduana', tramite.aduanaNombre ?? 'N/A'),
              _buildResumenItem(
                'Tramitador',
                tramite.tramitadorNombre ?? 'N/A',
              ),
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
              _buildResumenItem(
                'Cobro Total',
                currencyFormat.format(tramite.cobroTotal),
                isBoldVal: true,
              ),
              _buildResumenItem(
                'Honorarios Aduana',
                currencyFormat.format(tramite.honorarios),
              ),
              _buildResumenItem(
                'Cargo Express',
                currencyFormat.format(tramite.cargoExpress),
              ),
              const Divider(height: 20),
              _buildResumenItem(
                'Total Pagado',
                currencyFormat.format(tramite.totalPagado),
                valColor: AppColors.success,
              ),
              _buildResumenItem(
                'Saldo Pendiente',
                currencyFormat.format(tramite.saldoPendiente),
                valColor: tramite.saldoPendiente > 0
                    ? AppColors.danger
                    : AppColors.success,
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
          ...tramite.pedimentos.map(
            (p) => Card(
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
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
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
                        Text(
                          'Patente: ${p.patente ?? 'N/A'}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.ink2,
                          ),
                        ),
                        Text(
                          'Impuestos: ${currencyFormat.format(p.totalContribuciones ?? 0)}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildTimelineTab(TramiteDetailDto tramite) {
    if (tramite.eventos.isEmpty) {
      return const Center(
        child: Text(
          'No hay eventos en la bitácora aún.',
          style: TextStyle(color: AppColors.ink3),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tramite.eventos.length,
      itemBuilder: (context, index) {
        final ev = tramite.eventos[index];
        final timeStr = DateFormat(
          'dd MMM yyyy, HH:mm',
        ).format(DateTime.parse(ev.fechaEvento));

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
                  Container(width: 2, height: 80, color: AppColors.border),
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
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.ink,
                        ),
                      ),
                      Text(
                        timeStr,
                        style: const TextStyle(
                          color: AppColors.ink3,
                          fontSize: 11,
                        ),
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
                      style: const TextStyle(
                        color: AppColors.ink3,
                        fontSize: 11,
                        fontStyle: FontStyle.italic,
                      ),
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
                            Text(
                              'Ver Evidencia Fotográfica',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.red,
                              ),
                            ),
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
        child: Text(
          'No se requiere documentación.',
          style: TextStyle(color: AppColors.ink3),
        ),
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
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
                  const Text(
                    '* Requerido',
                    style: TextStyle(color: AppColors.danger, fontSize: 11),
                  ),
                ],
              ],
            ),
            trailing: isUploaded
                ? IconButton(
                    icon: const Icon(
                      Icons.download_for_offline,
                      color: AppColors.red,
                    ),
                    onPressed: () => launchUrl(Uri.parse(doc.archivoUrl!)),
                    tooltip: 'Descargar Documento',
                  )
                : const Icon(
                    Icons.cloud_upload_outlined,
                    color: AppColors.ink3,
                  ),
          ),
        );
      },
    );
  }

  // ── Pagos ──────────────────────────────────────────────────────────────

  Widget _buildPagosTab(TramiteDetailDto tramite) {
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Saldo pendiente',
                      style: TextStyle(
                        color: AppColors.ink3,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currencyFormat.format(tramite.saldoPendiente),
                      style: TextStyle(
                        color: tramite.saldoPendiente > 0
                            ? AppColors.danger
                            : AppColors.success,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'Pagado',
                    style: TextStyle(
                      color: AppColors.ink3,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    currencyFormat.format(tramite.totalPagado),
                    style: const TextStyle(
                      color: AppColors.ink,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: () => _showRegistrarPagoDialog(tramite),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.red,
              minimumSize: const Size.fromHeight(48),
            ),
            icon: const Icon(Icons.add),
            label: const Text('Registrar pago'),
          ),
        ),
        const SizedBox(height: 16),
        if (tramite.pagos.isEmpty)
          _emptyState(
            'Sin pagos registrados',
            'Aún no hay pagos para este trámite.',
          )
        else
          ...tramite.pagos.map((p) => _buildPagoCard(p, currencyFormat)),
      ],
    );
  }

  Widget _buildPagoCard(TramitePagoDto p, NumberFormat currencyFormat) {
    final montoLabel = p.moneda == 'USD'
        ? '\$${NumberFormat('#,##0.00').format(p.monto)} USD'
        : currencyFormat.format(p.monto);
    return Card(
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
              children: [
                Expanded(
                  child: Text(
                    montoLabel,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                  ),
                ),
                _miniBadge(
                  p.verificado ? 'Verificado' : 'Pendiente',
                  p.verificado ? AppColors.success : AppColors.warning,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              p.banco != null && p.banco!.isNotEmpty
                  ? '${_metodoLabel(p.metodo)} · ${p.banco}'
                  : _metodoLabel(p.metodo),
              style: const TextStyle(color: AppColors.ink2, fontSize: 12),
            ),
            if (p.referencia != null && p.referencia!.isNotEmpty)
              Text(
                'Ref: ${p.referencia}',
                style: const TextStyle(color: AppColors.ink3, fontSize: 12),
              ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  _formatFecha(p.fechaPago),
                  style: const TextStyle(color: AppColors.ink3, fontSize: 12),
                ),
                const Spacer(),
                if (p.reciboPagoUrl != null && p.reciboPagoUrl!.isNotEmpty)
                  TextButton.icon(
                    onPressed: () => launchUrl(Uri.parse(p.reciboPagoUrl!)),
                    icon: const Icon(Icons.receipt_long, size: 16),
                    label: const Text('Recibo', style: TextStyle(fontSize: 12)),
                  ),
                IconButton(
                  onPressed: () => _confirmDeletePago(p),
                  icon: const Icon(
                    Icons.delete_outline,
                    color: AppColors.danger,
                    size: 20,
                  ),
                  tooltip: 'Borrar pago',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── Gastos hormiga ─────────────────────────────────────────────────────

  Widget _buildGastosTab(TramiteDetailDto tramite) {
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: () => _showRegistrarGastoDialog(tramite),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.red,
              minimumSize: const Size.fromHeight(48),
            ),
            icon: const Icon(Icons.add),
            label: const Text('Registrar gasto'),
          ),
        ),
        const SizedBox(height: 16),
        if (tramite.gastosHormiga.isEmpty)
          _emptyState(
            'Sin gastos registrados',
            'Aún no hay gastos hormiga para este trámite.',
          )
        else
          ...tramite.gastosHormiga.map(
            (g) => _buildGastoCard(g, currencyFormat),
          ),
      ],
    );
  }

  Widget _buildGastoCard(TramiteGastoDto g, NumberFormat currencyFormat) {
    final montoLabel = g.moneda == 'USD'
        ? '\$${NumberFormat('#,##0.00').format(g.monto)} USD'
        : currencyFormat.format(g.monto);
    return Card(
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
              children: [
                Expanded(
                  child: Text(
                    g.concepto.isEmpty ? g.tipoGasto : g.concepto,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                    ),
                  ),
                ),
                Text(
                  montoLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (g.tipoGasto.isNotEmpty)
                  _miniBadge(g.tipoGasto, AppColors.ink2),
                if (g.seCargaAlCliente) _miniBadge('Al cliente', AppColors.red),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  _formatFecha(g.fechaGasto),
                  style: const TextStyle(color: AppColors.ink3, fontSize: 12),
                ),
                const Spacer(),
                if (g.comprobanteUrl != null && g.comprobanteUrl!.isNotEmpty)
                  TextButton.icon(
                    onPressed: () => launchUrl(Uri.parse(g.comprobanteUrl!)),
                    icon: const Icon(Icons.attach_file, size: 16),
                    label: const Text(
                      'Comprobante',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                IconButton(
                  onPressed: () => _confirmDeleteGasto(g),
                  icon: const Icon(
                    Icons.delete_outline,
                    color: AppColors.danger,
                    size: 20,
                  ),
                  tooltip: 'Borrar gasto',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── Diálogos de registro ───────────────────────────────────────────────

  Future<void> _showRegistrarPagoDialog(TramiteDetailDto tramite) async {
    final montoController = TextEditingController();
    final bancoController = TextEditingController();
    final referenciaController = TextEditingController();
    final tcController = TextEditingController();
    final notasController = TextEditingController();
    String moneda = 'MXN';
    String metodo = 'TRANSFERENCIA';
    DateTime fecha = DateTime.now();
    bool saving = false;

    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setLocalState) {
          Future<void> pickFecha() async {
            final picked = await showDatePicker(
              context: dialogContext,
              initialDate: fecha,
              firstDate: DateTime(2020),
              lastDate: DateTime.now().add(const Duration(days: 1)),
            );
            if (picked != null) setLocalState(() => fecha = picked);
          }

          Future<void> fetchTc() async {
            try {
              final tc = await ref.read(adminApiProvider).getTipoCambio();
              setLocalState(
                () => tcController.text = tc.tipoCambio.toStringAsFixed(4),
              );
            } catch (_) {
              // Si falla, el usuario captura el TC a mano.
            }
          }

          return AlertDialog(
            title: const Text('Registrar pago'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: montoController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Monto',
                      prefixText: '\$ ',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: moneda,
                          decoration: const InputDecoration(
                            labelText: 'Moneda',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'MXN', child: Text('MXN')),
                            DropdownMenuItem(value: 'USD', child: Text('USD')),
                          ],
                          onChanged: (v) {
                            if (v == null) return;
                            setLocalState(() => moneda = v);
                            if (v == 'USD' && tcController.text.isEmpty) {
                              fetchTc();
                            }
                          },
                        ),
                      ),
                      if (moneda == 'USD') ...[
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: tcController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Tipo de cambio',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: metodo,
                    decoration: const InputDecoration(
                      labelText: 'Método',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'TRANSFERENCIA',
                        child: Text('Transferencia'),
                      ),
                      DropdownMenuItem(
                        value: 'EFECTIVO',
                        child: Text('Efectivo'),
                      ),
                      DropdownMenuItem(
                        value: 'DEPOSITO',
                        child: Text('Depósito'),
                      ),
                      DropdownMenuItem(value: 'CHEQUE', child: Text('Cheque')),
                    ],
                    onChanged: (v) => setLocalState(() => metodo = v ?? metodo),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: bancoController,
                    decoration: const InputDecoration(
                      labelText: 'Banco (opcional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: referenciaController,
                    decoration: const InputDecoration(
                      labelText: 'Referencia (opcional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: pickFecha,
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Fecha de pago',
                        border: OutlineInputBorder(),
                      ),
                      child: Text(DateFormat('dd/MM/yyyy').format(fecha)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: notasController,
                    decoration: const InputDecoration(
                      labelText: 'Notas (opcional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: saving
                    ? null
                    : () async {
                        final monto =
                            double.tryParse(montoController.text.trim()) ?? 0;
                        if (monto <= 0) {
                          ScaffoldMessenger.of(dialogContext).showSnackBar(
                            const SnackBar(
                              content: Text('Ingresa un monto válido.'),
                            ),
                          );
                          return;
                        }
                        final tc = double.tryParse(tcController.text.trim());
                        if (moneda == 'USD' && (tc == null || tc <= 0)) {
                          ScaffoldMessenger.of(dialogContext).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Captura el tipo de cambio para USD.',
                              ),
                            ),
                          );
                          return;
                        }
                        setLocalState(() => saving = true);
                        try {
                          await ref
                              .read(adminApiProvider)
                              .registrarPago(
                                tramiteId: tramite.id,
                                monto: monto,
                                moneda: moneda,
                                metodo: metodo,
                                fechaPago: DateFormat(
                                  'yyyy-MM-dd',
                                ).format(fecha),
                                tipoCambio: moneda == 'USD' ? tc : null,
                                banco: bancoController.text.trim().isEmpty
                                    ? null
                                    : bancoController.text.trim(),
                                referencia:
                                    referenciaController.text.trim().isEmpty
                                    ? null
                                    : referenciaController.text.trim(),
                                notas: notasController.text.trim().isEmpty
                                    ? null
                                    : notasController.text.trim(),
                              );
                          if (dialogContext.mounted) {
                            Navigator.of(dialogContext).pop();
                          }
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Pago registrado correctamente'),
                              ),
                            );
                            _refresh();
                          }
                        } catch (e) {
                          setLocalState(() => saving = false);
                          if (dialogContext.mounted) {
                            ScaffoldMessenger.of(dialogContext).showSnackBar(
                              SnackBar(content: Text('Error: $e')),
                            );
                          }
                        }
                      },
                child: const Text('Registrar'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showRegistrarGastoDialog(TramiteDetailDto tramite) async {
    var tipos = _tiposGasto ?? const <TipoGastoDto>[];
    if (tipos.isEmpty) {
      try {
        tipos = await ref.read(adminApiProvider).getTiposGasto();
        _tiposGasto = tipos;
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('No se pudieron cargar los tipos de gasto: $e'),
          ),
        );
        return;
      }
    }
    if (!mounted) return;
    if (tipos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay tipos de gasto configurados.')),
      );
      return;
    }

    final conceptoController = TextEditingController();
    final montoController = TextEditingController();
    String? tipoGastoId = tipos.first.id;
    String moneda = 'MXN';
    bool seCargaAlCliente = false;
    DateTime fecha = DateTime.now();
    bool saving = false;

    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setLocalState) {
          Future<void> pickFecha() async {
            final picked = await showDatePicker(
              context: dialogContext,
              initialDate: fecha,
              firstDate: DateTime(2020),
              lastDate: DateTime.now().add(const Duration(days: 1)),
            );
            if (picked != null) setLocalState(() => fecha = picked);
          }

          return AlertDialog(
            title: const Text('Registrar gasto'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: tipoGastoId,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Tipo de gasto',
                      border: OutlineInputBorder(),
                    ),
                    items: tipos
                        .map(
                          (t) => DropdownMenuItem(
                            value: t.id,
                            child: Text(
                              '${t.categoria} · ${t.nombre}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setLocalState(() => tipoGastoId = v),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: conceptoController,
                    decoration: const InputDecoration(
                      labelText: 'Concepto',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: montoController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Monto',
                            prefixText: '\$ ',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: moneda,
                          decoration: const InputDecoration(
                            labelText: 'Moneda',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'MXN', child: Text('MXN')),
                            DropdownMenuItem(value: 'USD', child: Text('USD')),
                          ],
                          onChanged: (v) =>
                              setLocalState(() => moneda = v ?? moneda),
                        ),
                      ),
                    ],
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Se cobra al cliente',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: seCargaAlCliente,
                    onChanged: (v) => setLocalState(() => seCargaAlCliente = v),
                  ),
                  InkWell(
                    onTap: pickFecha,
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Fecha del gasto',
                        border: OutlineInputBorder(),
                      ),
                      child: Text(DateFormat('dd/MM/yyyy').format(fecha)),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: saving
                    ? null
                    : () async {
                        final monto =
                            double.tryParse(montoController.text.trim()) ?? 0;
                        final concepto = conceptoController.text.trim();
                        if (tipoGastoId == null ||
                            concepto.isEmpty ||
                            monto <= 0) {
                          ScaffoldMessenger.of(dialogContext).showSnackBar(
                            const SnackBar(
                              content: Text('Completa tipo, concepto y monto.'),
                            ),
                          );
                          return;
                        }
                        setLocalState(() => saving = true);
                        try {
                          await ref
                              .read(adminApiProvider)
                              .registrarGasto(
                                tipoGastoId: tipoGastoId!,
                                concepto: concepto,
                                monto: monto,
                                moneda: moneda,
                                seCargaAlCliente: seCargaAlCliente,
                                fechaGasto: DateFormat(
                                  'yyyy-MM-dd',
                                ).format(fecha),
                                tramiteId: tramite.id,
                                clienteId: tramite.clienteId,
                                vehiculoId: tramite.vehiculoId,
                              );
                          if (dialogContext.mounted) {
                            Navigator.of(dialogContext).pop();
                          }
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Gasto registrado correctamente'),
                              ),
                            );
                            _refresh();
                          }
                        } catch (e) {
                          setLocalState(() => saving = false);
                          if (dialogContext.mounted) {
                            ScaffoldMessenger.of(dialogContext).showSnackBar(
                              SnackBar(content: Text('Error: $e')),
                            );
                          }
                        }
                      },
                child: const Text('Registrar'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _confirmDeletePago(TramitePagoDto p) async {
    final ok = await _confirmAction(
      title: 'Borrar pago',
      message:
          'Se ocultará del trámite y de los saldos. La bitácora conserva el movimiento.',
    );
    if (!ok) return;
    try {
      await ref.read(adminApiProvider).eliminarPago(p.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pago borrado correctamente')),
        );
        _refresh();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _confirmDeleteGasto(TramiteGastoDto g) async {
    final ok = await _confirmAction(
      title: 'Borrar gasto',
      message: '¿Eliminar este gasto del trámite?',
    );
    if (!ok) return;
    try {
      await ref.read(adminApiProvider).eliminarGasto(g.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gasto borrado correctamente')),
        );
        _refresh();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<bool> _confirmAction({
    required String title,
    required String message,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Borrar'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  Widget _emptyState(String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              color: AppColors.ink2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.ink3, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _miniBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  String _metodoLabel(String metodo) {
    switch (metodo.toUpperCase()) {
      case 'TRANSFERENCIA':
        return 'Transferencia';
      case 'EFECTIVO':
        return 'Efectivo';
      case 'DEPOSITO':
        return 'Depósito';
      case 'CHEQUE':
        return 'Cheque';
      default:
        return metodo;
    }
  }

  String _formatFecha(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('dd/MM/yyyy').format(dt);
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

  Widget _buildResumenItem(
    String label,
    String value, {
    bool isMonospace = false,
    Color? valColor,
    bool isBoldVal = false,
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
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
