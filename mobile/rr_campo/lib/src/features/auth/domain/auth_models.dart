import 'dart:convert';

class CampoUser {
  const CampoUser({
    required this.id,
    required this.username,
    required this.nombre,
    required this.apellidos,
    required this.tienePin,
  });

  final String id;
  final String username;
  final String nombre;
  final String? apellidos;
  final bool tienePin;

  String get displayName {
    final last = apellidos == null || apellidos!.isEmpty ? '' : ' $apellidos';
    return '$nombre$last';
  }

  factory CampoUser.fromJson(Map<String, dynamic> json) {
    return CampoUser(
      id: json['id'].toString(),
      username: json['username'].toString(),
      nombre: json['nombre'].toString(),
      apellidos: json['apellidos']?.toString(),
      tienePin: json['tienePin'] == true,
    );
  }
}

class UserInfo {
  const UserInfo({
    required this.id,
    required this.username,
    required this.nombre,
    required this.apellidos,
    required this.role,
    required this.tenantId,
    required this.permisos,
  });

  final String id;
  final String username;
  final String nombre;
  final String? apellidos;
  final String role;
  final String tenantId;
  final List<String> permisos;

  bool can(String permission) {
    return role == 'ADMIN' || role == 'DUEÑO' || permisos.contains(permission);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'nombre': nombre,
      'apellidos': apellidos,
      'role': role,
      'tenantId': tenantId,
      'permisos': permisos,
    };
  }

  String encode() => jsonEncode(toJson());

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      id: json['id'].toString(),
      username: json['username'].toString(),
      nombre: json['nombre'].toString(),
      apellidos: json['apellidos']?.toString(),
      role: json['role'].toString(),
      tenantId: json['tenantId'].toString(),
      permisos: (json['permisos'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
    );
  }

  factory UserInfo.decode(String value) {
    return UserInfo.fromJson(jsonDecode(value) as Map<String, dynamic>);
  }
}

class LoginResponse {
  const LoginResponse({
    required this.token,
    required this.refreshToken,
    required this.expiresAt,
    required this.needsSetPin,
    required this.user,
  });

  final String token;
  final String refreshToken;
  final String expiresAt;
  final bool needsSetPin;
  final UserInfo user;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['token'].toString(),
      refreshToken: json['refreshToken'].toString(),
      expiresAt: json['expiresAt'].toString(),
      needsSetPin: json['needsSetPin'] == true,
      user: UserInfo.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
