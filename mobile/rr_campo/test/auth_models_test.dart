import 'package:flutter_test/flutter_test.dart';
import 'package:rr_campo/src/features/auth/domain/auth_models.dart';

void main() {
  group('LoginResponse', () {
    test('parsea token, expiración y usuario desde la respuesta del login', () {
      final response = LoginResponse.fromJson({
        'token': 'access-token',
        'refreshToken': 'refresh-token',
        'expiresAt': '2026-07-03T18:00:00Z',
        'user': {
          'id': 'user-1',
          'username': 'operador',
          'nombre': 'Operador',
          'apellidos': 'Prueba',
          'role': 'YARDERO',
          'tenantId': 'tenant-1',
          'permisos': ['CAMPO_USAR'],
        },
      });

      expect(response.token, 'access-token');
      expect(response.refreshToken, 'refresh-token');
      expect(response.user.username, 'operador');
      expect(response.user.permisos, contains('CAMPO_USAR'));
    });
  });

  test('UserInfo conserva sus datos al guardarse en almacenamiento seguro', () {
    const original = UserInfo(
      id: 'user-1',
      username: 'operador',
      nombre: 'Operador',
      apellidos: 'Prueba',
      role: 'YARDERO',
      tenantId: 'tenant-1',
      permisos: ['CAMPO_USAR'],
    );

    final restored = UserInfo.decode(original.encode());

    expect(restored.username, original.username);
    expect(restored.role, original.role);
    expect(restored.permisos, contains('CAMPO_USAR'));
  });

  test('solo roles operativos de campo usan el shell de campo', () {
    const fieldUser = UserInfo(
      id: 'field',
      username: 'yardero',
      nombre: 'Yardero',
      apellidos: null,
      role: 'YARDERO',
      tenantId: 'tenant-1',
      permisos: ['CAMPO_USAR'],
    );
    const manager = UserInfo(
      id: 'manager',
      username: 'gerente',
      nombre: 'Gerente',
      apellidos: null,
      role: 'GERENTE',
      tenantId: 'tenant-1',
      permisos: ['CAMPO_USAR'],
    );

    expect(fieldUser.usesCampoShell, isTrue);
    expect(manager.usesCampoShell, isFalse);
  });

  test('ADMIN y DUEÑO tienen todos los permisos aunque no estén listados', () {
    const admin = UserInfo(
      id: 'admin',
      username: 'admin',
      nombre: 'Admin',
      apellidos: null,
      role: 'ADMIN',
      tenantId: 'tenant-1',
      permisos: [],
    );
    const operador = UserInfo(
      id: 'op',
      username: 'operador',
      nombre: 'Operador',
      apellidos: null,
      role: 'YARDERO',
      tenantId: 'tenant-1',
      permisos: ['CAMPO_USAR'],
    );

    expect(admin.can('CUALQUIER_COSA'), isTrue);
    expect(operador.can('CAMPO_USAR'), isTrue);
    expect(operador.can('OTRO_PERMISO'), isFalse);
  });
}
