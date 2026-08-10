import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../config/app_config.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';
import 'cotizacion_nueva_page.dart';

class InventarioPage extends ConsumerStatefulWidget {
  const InventarioPage({super.key});

  @override
  ConsumerState<InventarioPage> createState() => _InventarioPageState();
}

class _InventarioPageState extends ConsumerState<InventarioPage> {
  List<VehiculoListDto> _vehiculos = [];
  bool _loading = true;
  String? _errorMessage;

  int get _sinClienteCount =>
      _vehiculos.where((v) => (v.clienteApodo ?? '').trim().isEmpty).length;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });
    try {
      final vehiculos = await ref.read(adminApiProvider).getInventario();
      if (mounted) setState(() => _vehiculos = vehiculos);
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'No se pudo cargar el inventario: $e');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fileUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${AppConfig.apiBaseUrl}$url';
  }

  void _cotizar(VehiculoListDto vehiculo) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CotizacionNuevaPage(initialVin: vehiculo.vin),
      ),
    );
  }

  void _showFotos(VehiculoListDto vehiculo) {
    if (vehiculo.fotosUrls.isEmpty) return;
    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        insetPadding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480, maxHeight: 560),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'FOTOS DEL VEHÍCULO',
                  style: TextStyle(
                    color: AppColors.ink3,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  vehiculo.marcaModeloLabel,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  vehiculo.vin,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: AppColors.ink3,
                  ),
                ),
                const SizedBox(height: 14),
                Flexible(
                  child: GridView.builder(
                    shrinkWrap: true,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          childAspectRatio: 1,
                        ),
                    itemCount: vehiculo.fotosUrls.length,
                    itemBuilder: (context, index) {
                      final url = _fileUrl(vehiculo.fotosUrls[index]);
                      return InkWell(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        onTap: () => _openFullscreen(context, url),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                          child: CachedNetworkImage(
                            imageUrl: url,
                            fit: BoxFit.cover,
                            errorWidget: (context, url, error) => const Icon(
                              Icons.broken_image_outlined,
                              color: AppColors.ink3,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    child: const Text('Cerrar'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openFullscreen(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          body: Center(
            child: InteractiveViewer(
              minScale: 0.8,
              maxScale: 4,
              child: CachedNetworkImage(imageUrl: url, fit: BoxFit.contain),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Inventario',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.red))
          : _errorMessage != null
          ? _buildError()
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.red,
              child: _vehiculos.isEmpty
                  ? _buildEmpty()
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${_vehiculos.length} vehículos en patio',
                              style: const TextStyle(
                                color: AppColors.ink2,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (_sinClienteCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.redSoft,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: AppColors.danger.withValues(
                                      alpha: 0.25,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  '$_sinClienteCount sin cliente',
                                  style: const TextStyle(
                                    color: AppColors.danger,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ..._vehiculos.map(_buildVehiculoCard),
                      ],
                    ),
            ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, color: AppColors.ink3, size: 40),
            const SizedBox(height: 12),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.ink2),
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh, color: AppColors.red),
              label: const Text(
                'Reintentar',
                style: TextStyle(
                  color: AppColors.red,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.inventory_2_outlined,
                      size: 48,
                      color: AppColors.ink3,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Sin vehículos en patio',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'No hay vehículos sin trámite activo.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.ink2),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildVehiculoCard(VehiculoListDto vehiculo) {
    final hasFotos = vehiculo.fotosUrls.isNotEmpty;
    final sinCliente = (vehiculo.clienteApodo ?? '').trim().isEmpty;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: BorderSide(
          color: sinCliente
              ? AppColors.danger.withValues(alpha: 0.25)
              : AppColors.border,
        ),
      ),
      color: sinCliente ? const Color(0xFFFFFBFB) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vehiculo.marcaModeloLabel,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        vehiculo.vinCorto ?? vehiculo.vin,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: AppColors.ink3,
                        ),
                      ),
                    ],
                  ),
                ),
                if (sinCliente)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.redSoft,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: AppColors.danger.withValues(alpha: 0.25),
                      ),
                    ),
                    child: const Text(
                      'Sin cliente',
                      style: TextStyle(
                        color: AppColors.danger,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  )
                else
                  Text(
                    vehiculo.clienteApodo!,
                    style: const TextStyle(
                      color: AppColors.ink2,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
              ],
            ),
            const Divider(height: 22),
            Row(
              children: [
                Expanded(
                  child: _buildInfoChip(
                    Icons.event_outlined,
                    'Ingreso',
                    _formatDate(vehiculo.fechaIngresoPatio),
                  ),
                ),
                Expanded(
                  child: _buildInfoChip(
                    Icons.location_on_outlined,
                    'Ubicación',
                    vehiculo.ubicacionActual ?? '—',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildCheckpointDot(
                  vehiculo.tieneTramiteActivo,
                  Colors.amber.shade700,
                  'Trámite activo',
                ),
                const SizedBox(width: 8),
                _buildCheckpointDot(
                  vehiculo.cumplioRequisitos,
                  AppColors.success,
                  'Cumplió requisitos',
                ),
                const SizedBox(width: 8),
                _buildCheckpointDot(
                  vehiculo.tieneSelloAduanal,
                  Colors.blue.shade700,
                  'Sello aduanal',
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: hasFotos ? () => _showFotos(vehiculo) : null,
                    icon: const Icon(Icons.photo_library_outlined, size: 16),
                    label: Text(
                      hasFotos ? 'Fotos (${vehiculo.fotosUrls.length})' : 'Sin fotos',
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: hasFotos ? AppColors.red : AppColors.ink3,
                      side: BorderSide(
                        color: hasFotos ? AppColors.red : AppColors.border,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => _cotizar(vehiculo),
                    child: const Text('Cotizar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.ink3),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.ink3,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.ink2, fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCheckpointDot(bool active, Color activeColor, String label) {
    return Tooltip(
      message: label,
      child: Container(
        width: 12,
        height: 12,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: active ? activeColor : AppColors.border,
        ),
      ),
    );
  }

  String _formatDate(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return '—';
    return DateFormat('dd/MM/yyyy').format(parsed);
  }
}
