import 'dart:async';
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

  // Stream global para avisar cuando la sesión expira definitivamente
  static final _sessionExpiredController = StreamController<void>.broadcast();
  static Stream<void> get onSessionExpired => _sessionExpiredController.stream;

  // Bloqueo global para solicitudes de refresh paralelas.
  static Completer<String?>? _refreshCompleter;

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

  Future<bool> refreshSession() => _tryTokenRefresh();

  /// Ejecutor centralizado de peticiones HTTP con lógica de auto-refresh y reintento.
  Future<dynamic> _runRequest(
    String method,
    String path, {
    Map<String, String?> query = const {},
    Map<String, dynamic>? body,
    bool json = true,
  }) async {
    Future<http.Response> execute() async {
      final headers = await authHeaders(json: json);
      final url = uri(path, query);
      switch (method.toUpperCase()) {
        case 'GET':
          return httpClient.get(url, headers: headers);
        case 'POST':
          return httpClient.post(
            url,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
        case 'PUT':
          return httpClient.put(
            url,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
        case 'DELETE':
          return httpClient.delete(url, headers: headers);
        default:
          throw UnsupportedError('Método HTTP $method no soportado');
      }
    }

    final response = await execute();
    try {
      return _decode(response);
    } on ApiException catch (e) {
      // Intercepta 401 si no es llamada de login ni de refresh
      if (e.statusCode == 401 &&
          !path.contains('/api/auth/refresh') &&
          !path.contains('/api/auth/login') &&
          !path.contains('/api/auth/pin-login')) {
        final success = await _tryTokenRefresh();
        if (success) {
          // Reintentamos con la nueva cabecera (authHeaders tomará el nuevo token)
          final retryResponse = await execute();
          return _decode(retryResponse);
        }
      }
      rethrow;
    }
  }

  /// Intento de refresh de token. Usa un Completer para evitar peticiones redundantes.
  Future<bool> _tryTokenRefresh() async {
    if (_refreshCompleter != null) {
      final token = await _refreshCompleter!.future;
      return token != null;
    }

    final completer = Completer<String?>();
    _refreshCompleter = completer;

    try {
      final refreshToken = await secureStorage.read(key: 'refreshToken');
      if (refreshToken == null || refreshToken.isEmpty) {
        throw const ApiException('No se encontró Refresh Token');
      }

      // Petición directa sin interceptores para evitar bucle infinito
      final url = uri('/api/auth/refresh');
      final response = await httpClient.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      final body = response.body.isEmpty ? null : jsonDecode(response.body);
      if (response.statusCode >= 200 &&
          response.statusCode < 300 &&
          body is Map<String, dynamic>) {
        final newToken = body['token']?.toString();
        final newRefreshToken = body['refreshToken']?.toString();
        final expiresAt = body['expiresAt']?.toString();
        final user = body['user'];

        if (newToken == null ||
            newToken.isEmpty ||
            newRefreshToken == null ||
            newRefreshToken.isEmpty) {
          throw const ApiException('Respuesta de refresh incompleta');
        }

        await secureStorage.write(key: 'token', value: newToken);
        await secureStorage.write(key: 'refreshToken', value: newRefreshToken);
        if (expiresAt != null && expiresAt.isNotEmpty) {
          await secureStorage.write(key: 'expiresAt', value: expiresAt);
        } else {
          await secureStorage.delete(key: 'expiresAt');
        }
        if (user is Map<String, dynamic>) {
          await secureStorage.write(key: 'user', value: jsonEncode(user));
        }

        completer.complete(newToken);
        _refreshCompleter = null;
        return true;
      } else {
        throw const ApiException('Refresh token inválido o expirado');
      }
    } catch (e) {
      // Limpieza definitiva por fallo en sesión
      await secureStorage.delete(key: 'token');
      await secureStorage.delete(key: 'refreshToken');
      await secureStorage.delete(key: 'expiresAt');
      await secureStorage.delete(key: 'user');

      completer.complete(null);
      _refreshCompleter = null;

      // Disparamos la expiración global
      _sessionExpiredController.add(null);
      return false;
    }
  }

  Future<dynamic> getJson(
    String path, [
    Map<String, String?> query = const {},
  ]) {
    return _runRequest('GET', path, query: query, json: false);
  }

  Future<dynamic> postJson(String path, Map<String, dynamic> body) {
    return _runRequest('POST', path, body: body);
  }

  Future<dynamic> putJson(String path, Map<String, dynamic> body) {
    return _runRequest('PUT', path, body: body);
  }

  Future<dynamic> deleteJson(String path) {
    return _runRequest('DELETE', path);
  }

  Future<dynamic> uploadFile(String path, XFile file) async {
    Future<http.Response> execute() async {
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
      return http.Response.fromStream(streamed);
    }

    final response = await execute();
    try {
      return _decode(response);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        final success = await _tryTokenRefresh();
        if (success) {
          final retryResponse = await execute();
          return _decode(retryResponse);
        }
      }
      rethrow;
    }
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
