enum VinScanSource { barcode, ocr }

/// Fija un VIN por **votación dentro de una ventana de tiempo**, en lugar de
/// exigir varias lecturas idénticas seguidas.
///
/// El OCR de ML Kit "tiembla" entre frames del mismo VIN (`52O94` / `5209A` /
/// `52094`, `I`/`1`, `O`/`0`...). Un consenso que cuenta lecturas idénticas
/// consecutivas se reinicia con cada variación y casi nunca llega al mínimo.
/// Aquí contamos las apariciones de cada candidato dentro de [window] y fijamos
/// el que gana por [lead] votos de margen, una vez que alcanza el mínimo.
///
/// Tambien sirve para barcodes dudosos: una lectura con check digit valido puede
/// entrar con [strongVotes] bajo, mientras que una lectura sin check digit valido
/// exige mas votos antes de fijarse.
class VinStabilityLock {
  VinStabilityLock({
    this.window = const Duration(milliseconds: 1500),
    this.minVotes = 3,
    this.strongVotes = 2,
    this.lead = 1,
  });

  /// Ventana de tiempo en la que se acumulan los votos.
  final Duration window;

  /// Votos necesarios para un candidato normal (sin dígito verificador válido).
  final int minVotes;

  /// Votos necesarios para un candidato de alta confianza (check digit válido).
  final int strongVotes;

  /// Ventaja mínima en votos sobre el segundo lugar (evita el rebote entre dos
  /// lecturas parecidas).
  final int lead;

  final _observations = <_VinObservation>[];

  /// Registra una lectura y devuelve el VIN fijado, o `null` si todavía no hay
  /// consenso. [strong] indica que el VIN pasó el dígito verificador.
  String? offer({
    required String vin,
    required bool strong,
    required DateTime now,
  }) {
    if (vin.isEmpty) return null;

    _observations.add(_VinObservation(vin: vin, strong: strong, at: now));
    _observations.removeWhere((obs) => now.difference(obs.at) > window);

    final counts = <String, int>{};
    for (final obs in _observations) {
      counts[obs.vin] = (counts[obs.vin] ?? 0) + 1;
    }

    final ranked = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final top = ranked.first;
    final runnerUp = ranked.length > 1 ? ranked[1].value : 0;

    final topIsStrong = _observations.any(
      (obs) => obs.vin == top.key && obs.strong,
    );
    final required = topIsStrong ? strongVotes : minVotes;

    if (top.value >= required && top.value - runnerUp >= lead) {
      return top.key;
    }
    return null;
  }

  /// Votos acumulados para [vin] en la ventana actual.
  int votesFor(String vin) =>
      _observations.where((obs) => obs.vin == vin).length;

  void reset() => _observations.clear();
}

class _VinObservation {
  _VinObservation({required this.vin, required this.strong, required this.at});

  final String vin;
  final bool strong;
  final DateTime at;
}
