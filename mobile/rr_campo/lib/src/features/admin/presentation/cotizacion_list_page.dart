import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:intl/intl.dart';

import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';
import 'cotizacion_detail_page.dart';
import 'cotizacion_nueva_page.dart';

class CotizacionListPage extends ConsumerStatefulWidget {
  const CotizacionListPage({super.key});

  @override
  ConsumerState<CotizacionListPage> createState() => _CotizacionListPageState();
}

class _CotizacionListPageState extends ConsumerState<CotizacionListPage> {
  static const _pageSize = 20;

  final PagingController<int, CotizacionListDto> _pagingController =
      PagingController(firstPageKey: 1);

  final _searchController = TextEditingController();
  String _search = '';
  String? _selectedStatus;

  final List<String> _statuses = [
    'BORRADOR',
    'ENVIADA',
    'ACEPTADA',
    'RECHAZADA',
    'EXPIRADA',
  ];

  @override
  void initState() {
    super.initState();
    _pagingController.addPageRequestListener((pageKey) {
      _fetchPage(pageKey);
    });
  }

  @override
  void dispose() {
    _pagingController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchPage(int pageKey) async {
    try {
      final api = ref.read(adminApiProvider);
      final result = await api.getCotizaciones(
        search: _search.isEmpty ? null : _search,
        estado: _selectedStatus,
        page: pageKey,
        pageSize: _pageSize,
      );

      final isLastPage = result.items.length < _pageSize || pageKey >= result.totalPages;
      if (isLastPage) {
        _pagingController.appendLastPage(result.items);
      } else {
        final nextPageKey = pageKey + 1;
        _pagingController.appendPage(result.items, nextPageKey);
      }
    } catch (error) {
      _pagingController.error = error;
    }
  }

  void _onSearchChanged(String value) {
    setState(() {
      _search = value.trim();
    });
    _pagingController.refresh();
  }

  void _onStatusSelected(String? status) {
    setState(() {
      _selectedStatus = _selectedStatus == status ? null : status;
    });
    _pagingController.refresh();
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
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Cotizaciones',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const CotizacionNuevaPage(),
                ),
              ).then((_) => _pagingController.refresh());
            },
            icon: const Icon(Icons.add_circle_outline, color: AppColors.red),
            tooltip: 'Nueva Cotización',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter header
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              children: [
                // Search bar
                TextField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Buscar por folio, cliente, vehículo o VIN...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _onSearchChanged('');
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    fillColor: AppColors.background,
                    filled: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Status chips
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: _statuses.map((status) {
                      final isSelected = _selectedStatus == status;
                      final chipColor = _getStatusColor(status);
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(
                            status,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: isSelected ? Colors.white : AppColors.ink,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: chipColor,
                          backgroundColor: AppColors.background,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                            side: BorderSide(
                              color: isSelected ? Colors.transparent : AppColors.border,
                            ),
                          ),
                          showCheckmark: false,
                          onSelected: (_) => _onStatusSelected(status),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          // List of cotizaciones
          Expanded(
            child: PagedListView<int, CotizacionListDto>(
              pagingController: _pagingController,
              padding: const EdgeInsets.all(16),
              builderDelegate: PagedChildBuilderDelegate<CotizacionListDto>(
                itemBuilder: (context, item, index) {
                  final statusColor = _getStatusColor(item.estado);
                  final isConverted = item.tramiteId != null;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CotizacionDetailPage(cotizacionId: item.id),
                          ),
                        ).then((_) => _pagingController.refresh());
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Top Row: Folio + Estatus
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  item.folio ?? 'Borrador sin Folio',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 15,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    item.estado.toUpperCase(),
                                    style: TextStyle(
                                      color: statusColor,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            // Mid: Vehicle
                            Row(
                              children: [
                                const Icon(Icons.directions_car_filled_outlined,
                                    size: 16, color: AppColors.ink3),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '${item.vehiculo ?? 'Vehículo sin especificar'} ${item.anno ?? ''}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (item.vin != null && item.vin!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  const Icon(Icons.pin,
                                      size: 16, color: AppColors.ink3),
                                  const SizedBox(width: 8),
                                  Text(
                                    'VIN: ${item.vin}',
                                    style: const TextStyle(
                                      color: AppColors.ink2,
                                      fontSize: 13,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            const SizedBox(height: 6),
                            // Client
                            Row(
                              children: [
                                const Icon(Icons.person_outline,
                                    size: 16, color: AppColors.ink3),
                                const SizedBox(width: 8),
                                Text(
                                  'Cliente: ${item.clienteNombre ?? 'N/A'}',
                                  style: const TextStyle(
                                    color: AppColors.ink2,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24),
                            // Bottom: Date and Total
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Creado: ${DateFormat('dd/MM/yyyy').format(DateTime.parse(item.fechaCreacion))}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: AppColors.ink3,
                                      ),
                                    ),
                                    if (isConverted)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 2),
                                        child: Text(
                                          'Trámite: ${item.tramiteNumero}',
                                          style: const TextStyle(
                                            color: AppColors.success,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                Text(
                                  currencyFormat.format(item.total),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: AppColors.ink,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
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
                          Icons.calculate_outlined,
                          size: 48,
                          color: AppColors.ink3,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No se encontraron cotizaciones',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _search.isNotEmpty || _selectedStatus != null
                              ? 'Intenta cambiar los filtros o búsqueda.'
                              : 'No hay cotizaciones registradas en el sistema.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.ink2),
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
}
