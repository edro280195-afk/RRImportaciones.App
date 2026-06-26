import 'package:flutter_test/flutter_test.dart';
import 'package:rr_campo/src/features/campo/domain/vin_parser.dart';

void main() {
  group('VIN parser', () {
    test('normaliza solo caracteres permitidos por VIN', () {
      expect(normalizeVinInput(' 1hgcm82633a004352 '), '1HGCM82633A004352');
    });

    test('extrae VIN completo desde texto OCR', () {
      final vin = extractVinCandidate('Unidad recibida\nVIN 1HGCM82633A004352');

      expect(vin, '1HGCM82633A004352');
    });

    test('extrae VIN desde valor compacto de codigo de barras', () {
      final vin = extractVinCandidate('VIN1HGCV1F33JA235611');

      expect(vin, '1HGCV1F33JA235611');
    });

    test('regresa ultimos 6 caracteres para captura de campo', () {
      expect(toShortVin('1HGCV1F33JA235611'), '235611');
    });

    test('prefiere candidatos con digito verificador valido', () {
      final vin = extractVinCandidate('AAAAA1111BBBB2223 1HGCM82633A004352');

      expect(vin, '1HGCM82633A004352');
    });
  });
}
