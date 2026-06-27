import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

import '../../config/app_config.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
    httpClient: ref.watch(httpClientProvider),
    secureStorage: ref.watch(secureStorageProvider),
  );
});

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.httpClient,
    required this.secureStorage,
  });

  final String baseUrl;
  final http.Client httpClient;
  final FlutterSecureStorage secureStorage;

  Uri uri(String path, [Map<String, String?> query = const {}]) {
    final cleanBase = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$cleanBase$cleanPath');
    final params = Map.fromEntries(
      query.entries.where(
        (entry) => entry.value != null && entry.value!.isNotEmpty,
      ),
    );
    return params.isEmpty ? uri : uri.replace(queryParameters: params);
  }

  Future<Map<String, String>> authHeaders({bool json = true}) async {
    final token = await secureStorage.read(key: 'token');
    return {
      if (json) 'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> getJson(
    String path, [
    Map<String, String?> query = const {},
  ]) async {
    final response = await httpClient.get(
      uri(path, query),
      headers: await authHeaders(json: false),
    );
    return _decode(response);
  }

  Future<dynamic> postJson(String path, Map<String, dynamic> body) async {
    final response = await httpClient.post(
      uri(path),
      headers: await authHeaders(),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  Future<dynamic> putJson(String path, Map<String, dynamic> body) async {
    final response = await httpClient.put(
      uri(path),
      headers: await authHeaders(),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  Future<dynamic> deleteJson(String path) async {
    final response = await httpClient.delete(
      uri(path),
      headers: await authHeaders(),
    );
    return _decode(response);
  }

  Future<dynamic> uploadFile(String path, XFile file) async {
    final request = http.MultipartRequest('POST', uri(path));
    request.headers.addAll(await authHeaders(json: false));
    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        file.path,
        filename: file.name,
        contentType: MediaType.parse(file.mimeType ?? 'image/jpeg'),
      ),
    );

    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _decode(response);
  }

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    var message = 'Error de servidor';
    if (body is Map<String, dynamic>) {
      message = body['message']?.toString() ?? message;
    }

    throw ApiException(message, statusCode: response.statusCode);
  }
}
