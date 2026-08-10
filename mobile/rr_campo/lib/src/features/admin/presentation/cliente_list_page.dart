import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:intl/intl.dart';

import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';
import 'cliente_detail_page.dart';
import 'cliente_form_sheet.dart';

class ClienteListPage extends ConsumerStatefulWidget {
  const ClienteListPage({super.key});

  @override
  ConsumerState<ClienteListPage> createState() => _ClienteListPageState();
}

class _ClienteListPageState extends ConsumerState<ClienteListPage> {
  static const _pageSize = 20;

  final PagingController<int, ClienteListDto> _pagingController =
      PagingController(firstPageKey: 1);

  final _searchController = TextEditingController();
  String _search = '';

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
      final result = await api.getClientes(
        search: _search.isEmpty ? null : _search,
        page: pageKey,
        pageSize: _pageSize,
      );

      final isLastPage =
          result.items.length < _pageSize || pageKey >= result.totalPages;
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
    setState(() => _search = value.trim());
    _pagingController.refresh();
  }

  Future<void> _createCliente() async {
    final created = await showClienteFormSheet(context);
    if (created == null || !mounted) return;
    _pagingController.refresh();
    Navigator.of(context)
        .push(
          MaterialPageRoute(
            builder: (_) => ClienteDetailPage(clienteId: created.id),
          ),
        )
        .then((_) => _pagingController.refresh());
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Clientes',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_outlined),
            tooltip: 'Nuevo cliente',
            onPressed: _createCliente,
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Buscar por apodo, nombre o teléfono...',
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
          ),
          Expanded(
            child: PagedListView<int, ClienteListDto>(
              pagingController: _pagingController,
              padding: const EdgeInsets.all(16),
              builderDelegate: PagedChildBuilderDelegate<ClienteListDto>(
                itemBuilder: (context, item, index) {
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
                        Navigator.of(context)
                            .push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    ClienteDetailPage(clienteId: item.id),
                              ),
                            )
                            .then((_) => _pagingController.refresh());
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: AppColors.redSoft,
                                  foregroundColor: AppColors.red,
                                  child: Text(
                                    item.apodo.isEmpty
                                        ? '?'
                                        : item.apodo[0].toUpperCase(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.apodo,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 16,
                                        ),
                                      ),
                                      if ((item.nombreCompleto ?? '')
                                          .trim()
                                          .isNotEmpty)
                                        Text(
                                          item.nombreCompleto!,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: AppColors.ink2,
                                            fontSize: 13,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                Text(
                                  currencyFormat.format(item.totalFacturado),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24),
                            Row(
                              children: [
                                if ((item.telefono ?? '').isNotEmpty) ...[
                                  const Icon(
                                    Icons.phone_outlined,
                                    size: 15,
                                    color: AppColors.ink3,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    item.telefono!,
                                    style: const TextStyle(
                                      color: AppColors.ink2,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                ],
                                const Icon(
                                  Icons.directions_car_outlined,
                                  size: 15,
                                  color: AppColors.ink3,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${item.totalVehiculos} vehículos',
                                  style: const TextStyle(
                                    color: AppColors.ink2,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                const Icon(
                                  Icons.assignment_outlined,
                                  size: 15,
                                  color: AppColors.ink3,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${item.totalTramites} trámites',
                                  style: const TextStyle(
                                    color: AppColors.ink2,
                                    fontSize: 12,
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
                          Icons.people_outline,
                          size: 48,
                          color: AppColors.ink3,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No se encontraron clientes',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _search.isNotEmpty
                              ? 'Intenta cambiar la búsqueda.'
                              : 'Toca + para registrar el primer cliente.',
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
