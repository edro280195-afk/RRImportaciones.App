import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_client.dart';
import '../domain/catalog_models.dart';

final catalogApiProvider = Provider<CatalogApi>((ref) {
  return CatalogApi(ref.watch(apiClientProvider));
});

/// Marcas activas (catálogo). Se cachea mientras viva el provider.
final marcasProvider = FutureProvider.autoDispose<List<Marca>>((ref) {
  return ref.watch(catalogApiProvider).getMarcas();
});

class CatalogApi {
  const CatalogApi(this._api);

  final ApiClient _api;

  Future<List<Marca>> getMarcas() async {
    final result =
        await _api.getJson('/api/marcas', {'soloActivas': 'true'})
            as List<dynamic>;
    return result
        .map((item) => Marca.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClienteListItem>> searchClientes(String query) async {
    final result =
        await _api.getJson('/api/clientes/search', {'q': query})
            as List<dynamic>;
    return result
        .map((item) => ClienteListItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<VinDecodeResult> decodeVin(String vin) async {
    final result =
        await _api.getJson('/api/cotizaciones/decode-vin/$vin')
            as Map<String, dynamic>;
    return VinDecodeResult.fromJson(result);
  }
}
