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

    test('no convierte texto descriptivo de una etiqueta en VIN', () {
      expect(
        extractVinFromOcrLine(
          'THIS VEHICLE CONFORMS TO ALL APPLICABLE FEDERAL MOTOR',
        ),
        isNull,
      );
      expect(extractVinFromOcrLine('OCCUPANTS 5 TOTAL 2 FRONT 3 REAR'), isNull);
    });

    test('acepta VIN impreso en un solo renglon', () {
      expect(extractVinFromOcrLine('3FA6P0LU7HR105186'), '3FA6P0LU7HR105186');
      expect(hasValidVinCheckDigit('3FA6P0LU7HR105186'), isTrue);
    });

    test('acepta VIN separado por espacios cuando ocupa todo el renglon', () {
      expect(
        extractVinFromOcrLine('3 F A 6 P 0 L U 7 H R 1 0 5 1 8 6'),
        '3FA6P0LU7HR105186',
      );
    });

    test('extrae VIN de payload de codigo con identificador de simbologia', () {
      expect(
        extractVinFromBarcode(']C03FA6P0LU7HR105186'),
        '3FA6P0LU7HR105186',
      );
    });
  });
}
