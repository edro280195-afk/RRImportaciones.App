import 'package:flutter_test/flutter_test.dart';
import 'package:rr_campo/src/features/campo/domain/vin_scan_consensus.dart';

void main() {
  const vinA = '3FA6P0LU7HR105186';
  const vinB = '3FA6P0LU0HR105186';
  final start = DateTime(2026, 6, 26, 12);

  test('fija un VIN de alta confianza con dos votos', () {
    final lock = VinStabilityLock();

    final first = lock.offer(vin: vinA, strong: true, now: start);
    final second = lock.offer(
      vin: vinA,
      strong: true,
      now: start.add(const Duration(milliseconds: 300)),
    );

    expect(first, isNull);
    expect(second, vinA);
  });

  test('un VIN sin dígito verificador requiere tres votos', () {
    final lock = VinStabilityLock();

    final first = lock.offer(vin: vinA, strong: false, now: start);
    final second = lock.offer(
      vin: vinA,
      strong: false,
      now: start.add(const Duration(milliseconds: 300)),
    );
    final third = lock.offer(
      vin: vinA,
      strong: false,
      now: start.add(const Duration(milliseconds: 600)),
    );

    expect(first, isNull);
    expect(second, isNull);
    expect(third, vinA);
  });

  test('tolera el tembleque del OCR y gana el candidato con más votos', () {
    final lock = VinStabilityLock();

    // Mezcla de lecturas: A aparece tres veces, B una. A debe ganar.
    lock.offer(vin: vinA, strong: false, now: start);
    lock.offer(
      vin: vinB,
      strong: false,
      now: start.add(const Duration(milliseconds: 150)),
    );
    lock.offer(
      vin: vinA,
      strong: false,
      now: start.add(const Duration(milliseconds: 300)),
    );
    final locked = lock.offer(
      vin: vinA,
      strong: false,
      now: start.add(const Duration(milliseconds: 450)),
    );

    expect(locked, vinA);
  });

  test('no fija mientras dos candidatos van empatados (sin margen)', () {
    final lock = VinStabilityLock(minVotes: 2);

    lock.offer(vin: vinA, strong: false, now: start);
    final tied = lock.offer(
      vin: vinB,
      strong: false,
      now: start.add(const Duration(milliseconds: 150)),
    );

    // A=1, B=1: alcanza el mínimo de votos pero sin la ventaja requerida.
    expect(tied, isNull);
  });

  test('descarta votos viejos fuera de la ventana de tiempo', () {
    final lock = VinStabilityLock();

    lock.offer(vin: vinA, strong: true, now: start);
    final delayed = lock.offer(
      vin: vinA,
      strong: true,
      now: start.add(const Duration(seconds: 2)),
    );

    // El primer voto ya expiró (ventana de 1.5 s): solo queda uno.
    expect(delayed, isNull);
    expect(lock.votesFor(vinA), 1);
  });
}
