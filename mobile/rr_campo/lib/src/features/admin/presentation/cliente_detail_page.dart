import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/api/api_client.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';
import 'cliente_form_sheet.dart';
import 'tramite_detail_page.dart';

class ClienteDetailPage extends ConsumerStatefulWidget {
  const ClienteDetailPage({super.key, required this.clienteId});

  final String clienteId;

  @override
  ConsumerState<ClienteDetailPage> createState() => _ClienteDetailPageState();
}

class _ClienteDetailPageState extends ConsumerState<ClienteDetailPage> {
  ClienteDetailDto? _cliente;
  bool _loading = true;
  String? _errorMessage;
  bool _deleting = false;

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
      final cliente = await ref
          .read(adminApiProvider)
          .getClienteById(widget.clienteId);
      if (mounted) setState(() => _cliente = cliente);
    } catch (e) {
      if (mounted) setState(() => _errorMessage = 'Error al cargar cliente: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit() async {
    final cliente = _cliente;
    if (cliente == null) return;
    final updated = await showClienteFormSheet(context, existing: cliente);
    if (updated != null && mounted) setState(() => _cliente = updated);
  }

  Future<void> _delete() async {
    final cliente = _cliente;
    if (cliente == null || _deleting) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('¿Eliminar cliente?'),
        content: Text(
          'Se eliminará a ${cliente.apodo} de forma permanente. '
          'Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _deleting = true);
    try {
      await ref.read(adminApiProvider).eliminarCliente(cliente.id);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _deleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo eliminar: ${error.message}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cliente = _cliente;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          cliente?.apodo ?? 'Cliente',
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        actions: cliente == null
            ? null
            : [
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  tooltip: 'Editar',
                  onPressed: _edit,
                ),
                IconButton(
                  icon: _deleting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.delete_outline, color: AppColors.danger),
                  tooltip: 'Eliminar',
                  onPressed: _deleting ? null : _delete,
                ),
              ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.red))
          : _errorMessage != null
          ? _buildError()
          : cliente == null
          ? const SizedBox()
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.red,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildHeaderCard(cliente),
                  const SizedBox(height: 16),
                  _buildKpiRow(cliente),
                  if ((cliente.notas ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildNotasCard(cliente.notas!),
                  ],
                  const SizedBox(height: 24),
                  _buildSectionTitle(
                    'Vehículos (${cliente.vehiculos.length})',
                  ),
                  const SizedBox(height: 10),
                  if (cliente.vehiculos.isEmpty)
                    _buildEmptyHint('Sin vehículos registrados.')
                  else
                    ...cliente.vehiculos.map(_buildVehiculoTile),
                  const SizedBox(height: 24),
                  _buildSectionTitle(
                    'Últimos trámites (${cliente.ultimosTramites.length})',
                  ),
                  const SizedBox(height: 10),
                  if (cliente.ultimosTramites.isEmpty)
                    _buildEmptyHint('Sin trámites registrados.')
                  else
                    ...cliente.ultimosTramites.map(_buildTramiteTile),
                  const SizedBox(height: 24),
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
                style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard(ClienteDetailDto cliente) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
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
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: AppColors.redSoft,
                foregroundColor: AppColors.red,
                child: Text(
                  cliente.apodo.isEmpty ? '?' : cliente.apodo[0].toUpperCase(),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cliente.apodo,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                    ),
                    if ((cliente.nombreCompleto ?? '').trim().isNotEmpty)
                      Text(
                        cliente.nombreCompleto!,
                        style: const TextStyle(color: AppColors.ink2, fontSize: 13),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 28),
          _buildInfoRow(Icons.phone_outlined, 'Teléfono', cliente.telefono),
          _buildInfoRow(Icons.email_outlined, 'Email', cliente.email),
          _buildInfoRow(Icons.assignment_ind_outlined, 'RFC', cliente.rfc),
          _buildInfoRow(Icons.flag_outlined, 'Procedencia', cliente.procedencia),
          _buildInfoRow(Icons.location_on_outlined, 'Dirección', cliente.direccion),
          _buildInfoRow(
            Icons.event_outlined,
            'Cliente desde',
            _formatDate(cliente.fechaRegistro),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String? value) {
    if (value == null || value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.ink3),
          const SizedBox(width: 10),
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.ink3, fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: AppColors.ink, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiRow(ClienteDetailDto cliente) {
    final currency = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    return Row(
      children: [
        Expanded(
          child: _KpiTile(
            label: 'Total facturado',
            value: currency.format(cliente.totalFacturado),
            color: AppColors.ink,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _KpiTile(
            label: 'Saldo pendiente',
            value: currency.format(cliente.saldoPendiente),
            color: cliente.saldoPendiente > 0 ? AppColors.danger : AppColors.success,
          ),
        ),
      ],
    );
  }

  Widget _buildNotasCard(String notas) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'NOTAS',
            style: TextStyle(color: AppColors.ink3, fontSize: 11, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(notas, style: const TextStyle(color: AppColors.ink2, fontSize: 13, height: 1.4)),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        color: AppColors.ink2,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildEmptyHint(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(message, style: const TextStyle(color: AppColors.ink3, fontSize: 12)),
    );
  }

  Widget _buildVehiculoTile(VehiculoSimpleDto vehiculo) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: AppColors.redSoft,
          foregroundColor: AppColors.red,
          child: Icon(Icons.directions_car_filled_outlined, size: 20),
        ),
        title: Text(
          vehiculo.marcaModeloLabel,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
        ),
        subtitle: Text(
          vehiculo.vin,
          style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: AppColors.ink3),
        ),
      ),
    );
  }

  Widget _buildTramiteTile(TramiteSimpleDto tramite) {
    final color = tramiteEstatusColor(tramite.estadoLogistico);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => TramiteDetailPage(tramiteId: tramite.id),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Trámite #${tramite.numeroConsecutivo}',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDate(tramite.fechaCreacion),
                      style: const TextStyle(color: AppColors.ink3, fontSize: 11),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  tramiteEstatusLabel(tramite.estadoLogistico),
                  style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, color: AppColors.ink3, size: 18),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return 'N/A';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return 'N/A';
    return DateFormat('dd/MM/yyyy').format(parsed);
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.ink3, fontSize: 10, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(color: color, fontSize: 17, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }
}
