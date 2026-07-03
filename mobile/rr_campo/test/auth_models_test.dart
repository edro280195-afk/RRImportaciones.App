import 'package:flutter_test/flutter_test.dart';
import 'package:rr_campo/src/features/auth/domain/auth_models.dart';

void main() {
  group('LoginResponse', () {
    test('conserva la diferencia entre PIN requerido y PIN configurado', () {
      final response = LoginResponse.fromJson({
        'token': 'access-token',
        'refreshToken': 'refresh-token',
        'expiresAt': '2026-07-03T18:00:00Z',
        'needsSetPin': false,
        'user': {
          'id': 'user-1',
          'username': 'operador',
          'nombre': 'Operador',
          'apellidos': 'Prueba',
          'role': 'YARDERO',
          'tenantId': 'tenant-1',
          'permisos': ['CAMPO_USAR'],
          'hasPin': true,
        },
      });

      expect(response.needsSetPin, isFalse);
      expect(response.user.hasPin, isTrue);
    });

    test('trata sesiones antiguas sin hasPin como no configuradas', () {
      final user = UserInfo.fromJson({
        'id': 'user-1',
        'username': 'admin',
        'nombre': 'Admin',
        'apellidos': null,
        'role': 'ADMIN',
        'tenantId': 'tenant-1',
        'permisos': <String>[],
      });

      expect(user.hasPin, isFalse);
    });
  });

  test('UserInfo conserva hasPin al guardarse en almacenamiento seguro', () {
    const original = UserInfo(
      id: 'user-1',
      username: 'operador',
      nombre: 'Operador',
      apellidos: 'Prueba',
      role: 'YARDERO',
      tenantId: 'tenant-1',
      permisos: ['CAMPO_USAR'],
      hasPin: true,
    );

    final restored = UserInfo.decode(original.encode());

    expect(restored.username, original.username);
    expect(restored.hasPin, isTrue);
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
      hasPin: true,
    );
    const manager = UserInfo(
      id: 'manager',
      username: 'gerente',
      nombre: 'Gerente',
      apellidos: null,
      role: 'GERENTE',
      tenantId: 'tenant-1',
      permisos: ['CAMPO_USAR'],
      hasPin: false,
    );

    expect(fieldUser.usesCampoShell, isTrue);
    expect(manager.usesCampoShell, isFalse);
  });
}
