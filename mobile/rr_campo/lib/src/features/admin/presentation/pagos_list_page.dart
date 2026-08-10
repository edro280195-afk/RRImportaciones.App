import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../config/app_config.dart';
import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';

/// Libro mayor global de pagos ("Más > Pagos"): filtros + cola de
/// verificación bancaria. El registro de pagos nuevos sigue viviendo en el
/// tab "Pagos" de cada trámite; esta pantalla es de supervisión cruzada.
class PagosListPage extends ConsumerStatefulWidget {
  const PagosListPage({super.key});

  @override
  ConsumerState<PagosListPage> createState() => _PagosListPageState();
}

class _PagosListPageState extends ConsumerState<PagosListPage> {
  static const _pageSize = 20;

  final PagingController<int, PagoListDto> _pagingController =
      PagingController(firstPageKey: 1);

  DateTime? _fechaDesde;
  DateTime? _fechaHasta;
  bool? _verificadoFiltro;

  final Set<String> _selectedIds = {};
  final Set<String> _verifyingIds = {};
  final Set<String> _downloadingReciboIds = {};
  bool _verifyingBulk = false;

  bool get _canVerify {
    final role = ref.read(sessionControllerProvider).asData?.value.user?.role;
    return role == 'ADMIN' || role == 'GERENTE';
  }

  @override
  void initState() {
    super.initState();
    _pagingController.addPageRequestListener(_fetchPage);
  }

  @override
  void dispose() {
    _pagingController.dispose();
    super.dispose();
  }

  Future<void> _fetchPage(int pageKey) async {
    try {
      final api = ref.read(adminApiProvider);
      final result = await api.getPagos(
        fechaDesde: _fechaDesde == null
            ? null
            : DateFormat('yyyy-MM-dd').format(_fechaDesde!),
        fechaHasta: _fechaHasta == null
            ? null
            : DateFormat('yyyy-MM-dd').format(_fechaHasta!),
        verificado: _verificadoFiltro,
        page: pageKey,
        pageSize: _pageSize,
      );

      final isLastPage =
          result.items.length < _pageSize || pageKey >= result.totalPages;
      if (isLastPage) {
        _pagingController.appendLastPage(result.items);
      } else {
        _pagingController.appendPage(result.items, pageKey + 1);
      }
    } catch (error) {
      _pagingController.error = error;
    }
  }

  void _refresh() {
    _selectedIds.clear();
    _pagingController.refresh();
  }

  int get _pendientesEnPagina =>
      (_pagingController.itemList ?? const <PagoListDto>[])
          .where((p) => !p.verificado)
          .length;

  Future<void> _pickFecha({required bool desde}) async {
    final initial = (desde ? _fechaDesde : _fechaHasta) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2015),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked == null) return;
    setState(() {
      if (desde) {
        _fechaDesde = picked;
      } else {
        _fechaHasta = picked;
      }
    });
    _refresh();
  }

  void _clearFecha({required bool desde}) {
    setState(() {
      if (desde) {
        _fechaDesde = null;
      } else {
        _fechaHasta = null;
      }
    });
    _refresh();
  }

  void _toggleSelected(String id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
      } else {
        _selectedIds.add(id);
      }
    });
  }

  Future<void> _verifyOne(PagoListDto pago) async {
    setState(() => _verifyingIds.add(pago.id));
    try {
      final result = await ref.read(adminApiProvider).verificarPago(pago.id);
      if (!mounted) return;
      _refresh();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.mensaje ?? 'Pago verificado correctamente.'),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error al verificar: $e')));
      }
    } finally {
      if (mounted) setState(() => _verifyingIds.remove(pago.id));
    }
  }

  Future<void> _verifySelected() async {
    if (_selectedIds.isEmpty) return;
    setState(() => _verifyingBulk = true);
    try {
      await ref
          .read(adminApiProvider)
          .verificarPagosBulk(_selectedIds.toList());
      if (!mounted) return;
      _refresh();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pagos verificados correctamente.')),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error al verificar: $e')));
      }
    } finally {
      if (mounted) setState(() => _verifyingBulk = false);
    }
  }

  Future<void> _regenerarRecibo(PagoListDto pago) async {
    try {
      await ref.read(adminApiProvider).regenerarRecibo(pago.id);
      if (!mounted) return;
      _refresh();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Recibo regenerado correctamente.')),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo regenerar el recibo: $e')),
        );
      }
    }
  }

  String _fileUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${AppConfig.apiBaseUrl}$url';
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No se pudo abrir el archivo.')));
    }
  }

  Future<void> _openRecibo(PagoListDto pago) async {
    final publicUrl = pago.reciboPagoUrl;
    if (publicUrl != null && publicUrl.isNotEmpty) {
      await _openUrl(_fileUrl(publicUrl));
      return;
    }

    // Aún no hay un recibo generado como archivo público: se descarga con
    // el token de la sesión y se comparte, porque el enlace directo del
    // controller requiere autenticación que un navegador externo no manda.
    setState(() => _downloadingReciboIds.add(pago.id));
    try {
      final bytes = await ref.read(adminApiProvider).getPagoRecibo(pago.id);
      if (!mounted) return;
      final file = XFile.fromData(
        Uint8List.fromList(bytes),
        mimeType: 'application/pdf',
        name: '${pago.folioRecibo ?? pago.numeroConsecutivo}.pdf',
      );
      await Share.shareXFiles([file]);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('No se pudo obtener el recibo: $e')));
      }
    } finally {
      if (mounted) setState(() => _downloadingReciboIds.remove(pago.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final canVerify = _canVerify;
    final dateFormat = DateFormat('dd/MM/yyyy');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Pagos',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.redSoft,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PENDIENTES',
                            style: TextStyle(
                              color: AppColors.ink3,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            '$_pendientesEnPagina',
                            style: const TextStyle(
                              color: AppColors.red,
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildFechaButton(
                            label: _fechaDesde == null
                                ? 'Desde'
                                : dateFormat.format(_fechaDesde!),
                            active: _fechaDesde != null,
                            onTap: () => _pickFecha(desde: true),
                            onClear: _fechaDesde == null
                                ? null
                                : () => _clearFecha(desde: true),
                          ),
                          const SizedBox(height: 6),
                          _buildFechaButton(
                            label: _fechaHasta == null
                                ? 'Hasta'
                                : dateFormat.format(_fechaHasta!),
                            active: _fechaHasta != null,
                            onTap: () => _pickFecha(desde: false),
                            onClear: _fechaHasta == null
                                ? null
                                : () => _clearFecha(desde: false),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _buildVerificadoChip('Todos', null),
                      _buildVerificadoChip('Pendientes', false),
                      _buildVerificadoChip('Verificados', true),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (canVerify && _selectedIds.isNotEmpty)
            Container(
              width: double.infinity,
              color: AppColors.surface,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: FilledButton.icon(
                onPressed: _verifyingBulk ? null : _verifySelected,
                icon: _verifyingBulk
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.verified_outlined, size: 18),
                label: Text(
                  'Verificar ${_selectedIds.length} seleccionado${_selectedIds.length == 1 ? '' : 's'}',
                ),
              ),
            ),
          Expanded(
            child: PagedListView<int, PagoListDto>(
              pagingController: _pagingController,
              padding: const EdgeInsets.all(16),
              builderDelegate: PagedChildBuilderDelegate<PagoListDto>(
                itemBuilder: (context, pago, index) =>
                    _buildPagoCard(pago, canVerify),
                firstPageProgressIndicatorBuilder: (_) => const Center(
                  child: CircularProgressIndicator(color: AppColors.red),
                ),
                newPageProgressIndicatorBuilder: (_) => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(color: AppColors.red),
                  ),
                ),
                noItemsFoundIndicatorBuilder: (_) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.payments_outlined,
                          size: 48,
                          color: AppColors.ink3,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No hay pagos con estos filtros',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFechaButton({
    required String label,
    required bool active,
    required VoidCallback onTap,
    VoidCallback? onClear,
  }) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        side: BorderSide(color: active ? AppColors.red : AppColors.border),
        alignment: Alignment.centerLeft,
      ),
      child: Row(
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 14,
            color: active ? AppColors.red : AppColors.ink3,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: active ? AppColors.red : AppColors.ink2,
              ),
            ),
          ),
          if (onClear != null)
            InkWell(
              onTap: onClear,
              child: const Icon(Icons.close, size: 14, color: AppColors.ink3),
            ),
        ],
      ),
    );
  }

  Widget _buildVerificadoChip(String label, bool? value) {
    final isSelected = _verificadoFiltro == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : AppColors.ink,
          ),
        ),
        selected: isSelected,
        selectedColor: AppColors.red,
        backgroundColor: AppColors.background,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
          side: BorderSide(
            color: isSelected ? Colors.transparent : AppColors.border,
          ),
        ),
        showCheckmark: false,
        onSelected: (_) {
          setState(() => _verificadoFiltro = value);
          _refresh();
        },
      ),
    );
  }

  Widget _buildPagoCard(PagoListDto pago, bool canVerify) {
    final currencySymbol = pago.moneda == 'USD' ? 'US\$' : '\$';
    final montoFormat = NumberFormat.currency(
      locale: 'es_MX',
      symbol: currencySymbol,
    );
    final fecha = DateTime.tryParse(pago.fechaPago);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (canVerify && !pago.verificado) ...[
                  Checkbox(
                    value: _selectedIds.contains(pago.id),
                    onChanged: (_) => _toggleSelected(pago.id),
                    activeColor: AppColors.red,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  const SizedBox(width: 4),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Trámite #${pago.numeroConsecutivo}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        pago.clienteNombre ?? 'Sin cliente',
                        style: const TextStyle(
                          color: AppColors.ink2,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  montoFormat.format(pago.monto),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
            const Divider(height: 22),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pagoTipoMovimientoLabel(pago.tipoMovimiento),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        (pago.pagadoPor == 'RR'
                                ? 'Cubierto por R&R'
                                : 'Cliente') +
                            (pago.seCobraAlCliente ? ' · cobrable' : ''),
                        style: const TextStyle(
                          color: AppColors.ink3,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pagoMetodoLabel(pago.metodo),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        fecha == null
                            ? '—'
                            : DateFormat('dd/MM/yyyy').format(fecha),
                        style: const TextStyle(
                          color: AppColors.ink3,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: pago.verificado
                        ? AppColors.successSoft
                        : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    pago.verificado ? 'Verificado' : 'Pendiente',
                    style: TextStyle(
                      color: pago.verificado
                          ? AppColors.success
                          : const Color(0xFF92400E),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 14,
              runSpacing: 4,
              children: [
                if ((pago.comprobanteUrl ?? '').isNotEmpty)
                  _buildActionLink(
                    'Comprobante',
                    () => _openUrl(_fileUrl(pago.comprobanteUrl!)),
                  ),
                _buildActionLink(
                  _downloadingReciboIds.contains(pago.id)
                      ? 'Abriendo recibo...'
                      : 'Recibo',
                  _downloadingReciboIds.contains(pago.id)
                      ? null
                      : () => _openRecibo(pago),
                ),
                if (canVerify)
                  _buildActionLink(
                    'Regenerar recibo',
                    () => _regenerarRecibo(pago),
                    color: AppColors.ink2,
                  ),
                if (canVerify && !pago.verificado)
                  _buildActionLink(
                    _verifyingIds.contains(pago.id)
                        ? 'Verificando...'
                        : 'Verificar',
                    _verifyingIds.contains(pago.id)
                        ? null
                        : () => _verifyOne(pago),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionLink(
    String label,
    VoidCallback? onTap, {
    Color color = AppColors.red,
  }) {
    return InkWell(
      onTap: onTap,
      child: Text(
        label,
        style: TextStyle(
          color: onTap == null ? AppColors.ink3 : color,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
