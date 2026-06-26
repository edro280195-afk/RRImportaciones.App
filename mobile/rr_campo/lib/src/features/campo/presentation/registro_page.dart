import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_client.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/campo_api.dart';
import '../data/catalog_api.dart';
import '../domain/catalog_models.dart';
import '../domain/vin_parser.dart';
import 'campo_tasks_page.dart';
import 'mlkit_vin_scanner_page.dart';

enum _VinLookup { idle, loading, loaded, empty, error }

/// Alta de unidad nueva en yarda (pre-inspección).
/// Equivale al modal "Registrar Vehículo" de Angular, rediseñado a pantalla completa.
class RegistroPage extends ConsumerStatefulWidget {
  const RegistroPage({super.key});

  @override
  ConsumerState<RegistroPage> createState() => _RegistroPageState();
}

class _RegistroPageState extends ConsumerState<RegistroPage> {
  final _vinController = TextEditingController();
  final _modeloController = TextEditingController();
  final _annoController = TextEditingController();
  final _ubicacionController = TextEditingController();
  final _descripcionController = TextEditingController();

  String? _marcaId;
  ClienteListItem? _cliente;
  bool _saving = false;
  _VinLookup _vinState = _VinLookup.idle;
  int _decodeVersion = 0;

  @override
  void dispose() {
    _vinController.dispose();
    _modeloController.dispose();
    _annoController.dispose();
    _ubicacionController.dispose();
    _descripcionController.dispose();
    super.dispose();
  }

  // ── VIN ─────────────────────────────────────────────────────────────────
  void _onVinChanged(String value) {
    final normalized = normalizeVinInput(value);
    if (value != normalized) {
      _vinController.value = TextEditingValue(
        text: normalized,
        selection: TextSelection.collapsed(offset: normalized.length),
      );
    }
    if (normalized.length == 17) {
      _decodeVin(normalized);
    } else {
      setState(() => _vinState = _VinLookup.idle);
    }
  }

  Future<void> _decodeVin(String vin) async {
    final version = ++_decodeVersion;
    setState(() => _vinState = _VinLookup.loading);
    try {
      final decoded = await ref.read(catalogApiProvider).decodeVin(vin);
      if (!mounted || version != _decodeVersion) return;

      var loaded = false;
      if (decoded.make != null && decoded.make!.isNotEmpty) {
        final marcas = ref.read(marcasProvider).asData?.value ?? const [];
        for (final marca in marcas) {
          if (marca.matches(decoded.make!)) {
            _marcaId = marca.id;
            loaded = true;
            break;
          }
        }
      }
      if (decoded.model != null && decoded.model!.isNotEmpty) {
        _modeloController.text = decoded.model!;
        loaded = true;
      }
      if (decoded.modelYear != null) {
        _annoController.text = decoded.modelYear.toString();
        loaded = true;
      }
      setState(() => _vinState = loaded ? _VinLookup.loaded : _VinLookup.empty);
    } catch (_) {
      if (!mounted || version != _decodeVersion) return;
      setState(() => _vinState = _VinLookup.error);
    }
  }

  Future<void> _scanVin() async {
    final vin = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const MlkitVinScannerPage()),
    );
    if (!mounted || vin == null) return;
    final normalized = normalizeVinInput(vin);
    _vinController.text = normalized;
    if (normalized.length == 17) {
      _decodeVin(normalized);
    }
    _showMessage('VIN detectado: $normalized');
  }

  // ── Marca / Cliente ───────────────────────────────────────────────────
  Future<void> _pickMarca() async {
    final marcas = ref.read(marcasProvider).asData?.value;
    if (marcas == null || marcas.isEmpty) {
      ref.invalidate(marcasProvider);
      _showMessage('Cargando marcas…');
      return;
    }
    final picked = await showModalBottomSheet<Marca>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _MarcaPicker(marcas: marcas, selectedId: _marcaId),
    );
    if (picked != null) setState(() => _marcaId = picked.id);
  }

  Future<void> _pickCliente() async {
    final picked = await Navigator.of(context).push<ClienteListItem>(
      MaterialPageRoute(builder: (_) => const ClientePickerPage()),
    );
    if (picked != null) setState(() => _cliente = picked);
  }

  // ── Guardar ─────────────────────────────────────────────────────────────
  Future<void> _submit() async {
    final vin = _vinController.text.trim();
    if (vin.isEmpty) {
      _showMessage('El VIN es obligatorio');
      return;
    }
    if (vin.length != 17) {
      _showMessage('El VIN debe tener 17 caracteres');
      return;
    }
    if (_cliente == null) {
      final confirmed = await _confirmSinCliente();
      if (confirmed != true) return;
    }

    setState(() => _saving = true);
    try {
      final anno = int.tryParse(_annoController.text.trim());
      await ref
          .read(campoApiProvider)
          .crearPreInspeccion(
            vin: vin,
            marcaId: _marcaId,
            modelo: _clean(_modeloController.text),
            anno: anno,
            ubicacion: _clean(_ubicacionController.text),
            clienteId: _cliente?.id,
            clienteNombreLibre: _cliente?.label,
            descripcionVehiculo: _clean(_descripcionController.text),
          );

      ref.invalidate(campoTasksProvider);
      HapticFeedback.mediumImpact();
      if (!mounted) return;
      _showMessage('Vehículo registrado');
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      _showMessage(error.message);
    } catch (_) {
      if (!mounted) return;
      _showMessage('Error al registrar vehículo');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<bool?> _confirmSinCliente() {
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Registrar sin cliente'),
        content: const Text(
          'No asignaste un cliente del catálogo. El vehículo se guardará, pero '
          'quedará pendiente de asociar a un cliente.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Volver'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Registrar sin cliente'),
          ),
        ],
      ),
    );
  }

  String? _clean(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  // ── UI ────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final marcasAsync = ref.watch(marcasProvider);
    final marcaNombre = _marcaNombre(marcasAsync.asData?.value);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Registrar unidad',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
            ),
            Text(
              'Alta de vehículo en yarda',
              style: TextStyle(color: AppColors.ink3, fontSize: 11),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          _VinCard(
            controller: _vinController,
            state: _vinState,
            onChanged: _onVinChanged,
            onScan: _scanVin,
            modelo: _modeloController.text,
            anno: _annoController.text,
            marcaNombre: marcaNombre,
          ),
          const SizedBox(height: 14),
          _VehiculoCard(
            autofilled: _vinState == _VinLookup.loaded,
            marcaNombre: marcaNombre,
            marcasLoading: marcasAsync.isLoading,
            onPickMarca: _pickMarca,
            modeloController: _modeloController,
            annoController: _annoController,
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _ubicacionController,
            decoration: const InputDecoration(
              labelText: 'Ubicación en yarda',
              hintText: 'Ej: Fila 3',
              prefixIcon: Icon(Icons.location_on_outlined),
            ),
          ),
          const SizedBox(height: 14),
          _ClienteRow(
            cliente: _cliente,
            onTap: _pickCliente,
            onClear: () => setState(() => _cliente = null),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _descripcionController,
            minLines: 2,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Notas (opcional)',
              hintText: 'Detalles adicionales de la unidad',
              prefixIcon: Icon(Icons.sticky_note_2_outlined),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton.icon(
            onPressed: _saving ? null : _submit,
            icon: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.add_circle_outline),
            label: Text(_saving ? 'Registrando…' : 'Registrar unidad'),
          ),
        ),
      ),
    );
  }

  String? _marcaNombre(List<Marca>? marcas) {
    if (_marcaId == null || marcas == null) return null;
    for (final marca in marcas) {
      if (marca.id == _marcaId) return marca.nombre;
    }
    return null;
  }
}

class _VinCard extends StatelessWidget {
  const _VinCard({
    required this.controller,
    required this.state,
    required this.onChanged,
    required this.onScan,
    required this.modelo,
    required this.anno,
    required this.marcaNombre,
  });

  final TextEditingController controller;
  final _VinLookup state;
  final ValueChanged<String> onChanged;
  final VoidCallback onScan;
  final String modelo;
  final String anno;
  final String? marcaNombre;

  @override
  Widget build(BuildContext context) {
    final length = controller.text.length;
    return Container(
      padding: const EdgeInsets.all(14),
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
              const Text.rich(
                TextSpan(
                  text: 'VIN ',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink2,
                    fontSize: 13,
                  ),
                  children: [
                    TextSpan(
                      text: '*',
                      style: TextStyle(color: AppColors.red),
                    ),
                  ],
                ),
              ),
              Text(
                '$length / 17',
                style: const TextStyle(color: AppColors.ink3, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  onChanged: onChanged,
                  textCapitalization: TextCapitalization.characters,
                  maxLength: 17,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    letterSpacing: 1.5,
                    fontWeight: FontWeight.w700,
                  ),
                  decoration: const InputDecoration(
                    hintText: '17 caracteres',
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: onScan,
                icon: const Icon(Icons.document_scanner_outlined, size: 18),
                label: const Text('Escanear'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 52),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
              ),
            ],
          ),
          if (state != _VinLookup.idle) ...[
            const SizedBox(height: 8),
            _VinLookupChip(
              state: state,
              marcaNombre: marcaNombre,
              modelo: modelo,
              anno: anno,
            ),
          ],
        ],
      ),
    );
  }
}

class _VinLookupChip extends StatelessWidget {
  const _VinLookupChip({
    required this.state,
    required this.marcaNombre,
    required this.modelo,
    required this.anno,
  });

  final _VinLookup state;
  final String? marcaNombre;
  final String modelo;
  final String anno;

  @override
  Widget build(BuildContext context) {
    final (color, bg, icon, text) = switch (state) {
      _VinLookup.loading => (
        AppColors.ink2,
        AppColors.background,
        Icons.search,
        'Detectando datos…',
      ),
      _VinLookup.loaded => (
        AppColors.success,
        AppColors.successSoft,
        Icons.auto_awesome,
        'Datos encontrados${_resumen()}',
      ),
      _VinLookup.empty => (
        AppColors.warning,
        const Color(0xFFFFF7E6),
        Icons.info_outline,
        'VIN nuevo · captura los datos',
      ),
      _VinLookup.error => (
        AppColors.warning,
        const Color(0xFFFFF7E6),
        Icons.info_outline,
        'No se pudo decodificar · captura manual',
      ),
      _VinLookup.idle => (
        AppColors.ink2,
        AppColors.background,
        Icons.search,
        '',
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          if (state == _VinLookup.loading)
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(icon, color: color, size: 15),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: color,
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _resumen() {
    final parts = [
      ?marcaNombre,
      if (modelo.isNotEmpty) modelo,
      if (anno.isNotEmpty) anno,
    ];
    return parts.isEmpty ? '' : ' · ${parts.join(' ')}';
  }
}

class _VehiculoCard extends StatelessWidget {
  const _VehiculoCard({
    required this.autofilled,
    required this.marcaNombre,
    required this.marcasLoading,
    required this.onPickMarca,
    required this.modeloController,
    required this.annoController,
  });

  final bool autofilled;
  final String? marcaNombre;
  final bool marcasLoading;
  final VoidCallback onPickMarca;
  final TextEditingController modeloController;
  final TextEditingController annoController;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (autofilled)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  const Icon(
                    Icons.auto_fix_high,
                    color: AppColors.success,
                    size: 15,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    'Autocompletado del VIN',
                    style: TextStyle(
                      color: AppColors.success,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          InkWell(
            onTap: onPickMarca,
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Marca',
                prefixIcon: Icon(Icons.directions_car_outlined),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      marcaNombre ??
                          (marcasLoading
                              ? 'Cargando…'
                              : 'Selecciona una marca'),
                      style: TextStyle(
                        color: marcaNombre == null
                            ? AppColors.ink3
                            : AppColors.ink,
                      ),
                    ),
                  ),
                  const Icon(Icons.expand_more, color: AppColors.ink3),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 3,
                child: TextField(
                  controller: modeloController,
                  decoration: const InputDecoration(
                    labelText: 'Modelo',
                    hintText: 'Ej: Corolla',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: TextField(
                  controller: annoController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Año',
                    hintText: '2018',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ClienteRow extends StatelessWidget {
  const _ClienteRow({
    required this.cliente,
    required this.onTap,
    required this.onClear,
  });

  final ClienteListItem? cliente;
  final VoidCallback onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final selected = cliente != null;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: selected
            ? CircleAvatar(
                backgroundColor: AppColors.purple.withValues(alpha: 0.14),
                foregroundColor: AppColors.purple,
                child: Text(
                  cliente!.initials,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              )
            : const CircleAvatar(
                backgroundColor: AppColors.background,
                foregroundColor: AppColors.ink3,
                child: Icon(Icons.person_outline),
              ),
        title: Text(
          selected ? cliente!.label : 'Asignar cliente',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: selected ? AppColors.ink : AppColors.ink2,
          ),
        ),
        subtitle: Text(
          selected ? cliente!.meta : 'Opcional · puedes registrar sin cliente',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: AppColors.ink3, fontSize: 12),
        ),
        trailing: selected
            ? IconButton(
                icon: const Icon(Icons.close, color: AppColors.ink3),
                onPressed: onClear,
                tooltip: 'Quitar cliente',
              )
            : const Icon(Icons.chevron_right, color: AppColors.ink3),
      ),
    );
  }
}

class _MarcaPicker extends StatefulWidget {
  const _MarcaPicker({required this.marcas, required this.selectedId});

  final List<Marca> marcas;
  final String? selectedId;

  @override
  State<_MarcaPicker> createState() => _MarcaPickerState();
}

class _MarcaPickerState extends State<_MarcaPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final filtered = _query.isEmpty
        ? widget.marcas
        : widget.marcas
              .where(
                (m) => m.nombre.toLowerCase().contains(_query.toLowerCase()),
              )
              .toList();

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.92,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  autofocus: true,
                  onChanged: (value) => setState(() => _query = value),
                  decoration: const InputDecoration(
                    hintText: 'Buscar marca',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final marca = filtered[index];
                    final selected = marca.id == widget.selectedId;
                    return ListTile(
                      title: Text(marca.nombre),
                      trailing: selected
                          ? const Icon(Icons.check, color: AppColors.red)
                          : null,
                      onTap: () => Navigator.of(context).pop(marca),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Buscador de clientes (`/api/clientes/search`) con debounce.
class ClientePickerPage extends ConsumerStatefulWidget {
  const ClientePickerPage({super.key});

  @override
  ConsumerState<ClientePickerPage> createState() => _ClientePickerPageState();
}

class _ClientePickerPageState extends ConsumerState<ClientePickerPage> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  List<ClienteListItem> _results = const [];
  bool _loading = false;
  String _lastQuery = '';

  @override
  void initState() {
    super.initState();
    _search('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () => _search(value));
  }

  Future<void> _search(String query) async {
    _lastQuery = query;
    setState(() => _loading = true);
    try {
      final results = await ref
          .read(catalogApiProvider)
          .searchClientes(query.trim());
      if (!mounted || query != _lastQuery) return;
      setState(() {
        _results = results;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || query != _lastQuery) return;
      setState(() {
        _results = const [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Asignar cliente')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              onChanged: _onChanged,
              decoration: const InputDecoration(
                hintText: 'Buscar por apodo, nombre o teléfono',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _results.isEmpty
                ? const Center(
                    child: Text(
                      'Sin resultados',
                      style: TextStyle(color: AppColors.ink2),
                    ),
                  )
                : ListView.separated(
                    itemCount: _results.length,
                    separatorBuilder: (_, _) =>
                        const Divider(height: 1, indent: 70),
                    itemBuilder: (context, index) {
                      final cliente = _results[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.purple.withValues(
                            alpha: 0.14,
                          ),
                          foregroundColor: AppColors.purple,
                          child: Text(
                            cliente.initials,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        title: Text(
                          cliente.label,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        subtitle: Text(
                          cliente.meta,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => Navigator.of(context).pop(cliente),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
