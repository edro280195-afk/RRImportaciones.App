const _vinLength = 17;

final _vinRegex = RegExp(r'^[A-HJ-NPR-Z0-9]{17}$', caseSensitive: false);
final _lenientVinRegex = RegExp(r'[A-Z0-9]{17}', caseSensitive: false);
final _alphaNumericRun = RegExp(r'[A-Z0-9]+', caseSensitive: false);
final _invalidVinCharacters = RegExp(r'[^A-HJ-NPR-Z0-9]');
final _nonAlphaNumeric = RegExp(r'[^A-Z0-9]');
final _alphaNumeric = RegExp(r'[A-Z0-9]');
final _digit = RegExp(r'\d');
final _letter = RegExp(r'[A-Z]');
final _vinLabelPrefix = RegExp(
  r'^\s*(?:VIN|V1N)\s*[:#-]?\s*',
  caseSensitive: false,
);
final _symbologyIdentifierPrefix = RegExp(
  r'^\](?:A|C|d|e|E|Q)[0-9A-Z]',
  caseSensitive: false,
);

/// Caracteres que suelen confundirse en OCR, pero que nunca son válidos en
/// un VIN real. Sólo se aplican al extraer candidatos, no al texto libre.
const _ocrCharacterReplacements = <String, String>{
  'I': '1',
  'O': '0',
  'Q': '0',
};

/// Alfabeto VIN válido: excluye I, O y Q.
const _vinAlphabet = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

String normalizeVinInput(String value) {
  final normalized = value.toUpperCase().replaceAll(_invalidVinCharacters, '');
  if (normalized.length <= _vinLength) return normalized;
  return normalized.substring(0, _vinLength);
}

String toShortVin(String value) {
  final extracted = extractVinCandidate(value);
  final normalized = extracted ?? normalizeVinInput(value);
  if (normalized.length <= 6) return normalized;
  return normalized.substring(normalized.length - 6);
}

/// Extrae el mejor VIN encontrado en un texto OCR completo.
String? extractVinCandidate(String value) {
  final candidates = <String>[];
  for (final line in value.split(RegExp(r'[\r\n]+'))) {
    candidates.addAll(extractVinCandidatesFromOcrLine(line));
  }
  return _selectBestCandidate(candidates);
}

/// Devuelve candidatos VIN de un payload de código de barras.
///
/// Los payloads pueden contener identificadores de simbología (`]C0`, `]C1`)
/// y datos adicionales. Por eso se revisan ventanas de 17 caracteres y se
/// prefiere el candidato que pasa el dígito verificador.
List<String> extractVinCandidatesFromBarcode(String value) {
  var payload = value.toUpperCase().trim();
  payload = payload.replaceFirst(_symbologyIdentifierPrefix, '');
  var compact = payload.replaceAll(_nonAlphaNumeric, '');
  if (compact.startsWith('V1N') || compact.startsWith('VIN')) {
    compact = compact.substring(3);
  }
  if (compact.isEmpty) return const [];

  final candidates = <String>[];
  if (compact.length <= 256) {
    for (var index = 0; index + _vinLength <= compact.length; index++) {
      _addCandidate(candidates, compact.substring(index, index + _vinLength));
    }
  } else {
    for (final match in _lenientVinRegex.allMatches(compact)) {
      final candidate = match.group(0);
      if (candidate != null) _addCandidate(candidates, candidate);
    }
  }

  return _rankCandidates(candidates);
}

String? extractVinFromBarcode(String value) {
  final candidates = extractVinCandidatesFromBarcode(value);
  return candidates.isEmpty ? null : candidates.first;
}

/// Devuelve todos los candidatos razonables de un renglón OCR.
///
/// Además de VIN perfectos, intenta reparar un carácter adicional o faltante
/// cuando el resultado reparado pasa el dígito verificador. Esto ayuda con
/// etiquetas inclinadas, reflejos y lecturas OCR incompletas sin convertir
/// frases largas de la etiqueta en VIN falsos.
List<String> extractVinCandidatesFromOcrLine(String value) {
  final upper = value.toUpperCase().trim();
  if (upper.isEmpty) return const [];

  final candidates = <String>[];

  for (final match in _lenientVinRegex.allMatches(upper)) {
    final leftIsClear =
        match.start == 0 || !_alphaNumeric.hasMatch(upper[match.start - 1]);
    final rightIsClear =
        match.end == upper.length || !_alphaNumeric.hasMatch(upper[match.end]);
    if (!leftIsClear || !rightIsClear) continue;

    final candidate = match.group(0);
    if (candidate != null) _addCandidate(candidates, candidate);
  }

  final withoutLabel = upper.replaceFirst(_vinLabelPrefix, '');
  final compact = withoutLabel.replaceAll(_nonAlphaNumeric, '');
  if (compact.length >= 16 && compact.length <= 18) {
    _addCandidateWithRepair(candidates, compact);
  }

  for (final match in _alphaNumericRun.allMatches(withoutLabel)) {
    final run = match.group(0);
    if (run == null || run.length < 16 || run.length > 18) continue;
    _addCandidateWithRepair(candidates, run);
  }

  return _rankCandidates(candidates);
}

String? extractVinFromOcrLine(String value) {
  final candidates = extractVinCandidatesFromOcrLine(value);
  return candidates.isEmpty ? null : candidates.first;
}

bool hasValidVinCheckDigit(String value) {
  final vin = _canonicalizeCandidate(value);
  if (vin.length != _vinLength || !_vinRegex.hasMatch(vin)) return false;

  const transliteration = <String, int>{
    'A': 1,
    'B': 2,
    'C': 3,
    'D': 4,
    'E': 5,
    'F': 6,
    'G': 7,
    'H': 8,
    'J': 1,
    'K': 2,
    'L': 3,
    'M': 4,
    'N': 5,
    'P': 7,
    'R': 9,
    'S': 2,
    'T': 3,
    'U': 4,
    'V': 5,
    'W': 6,
    'X': 7,
    'Y': 8,
    'Z': 9,
  };
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

  var sum = 0;
  for (var index = 0; index < vin.length; index++) {
    final char = vin[index];
    final value = _digit.hasMatch(char)
        ? int.parse(char)
        : transliteration[char] ?? 0;
    sum += value * weights[index];
  }

  final expected = sum % 11 == 10 ? 'X' : (sum % 11).toString();
  return vin[8] == expected;
}

void _addCandidateWithRepair(List<String> candidates, String rawValue) {
  final compact = _canonicalizeCandidate(rawValue);
  if (compact.length == _vinLength) {
    _addCandidate(candidates, compact);
    return;
  }

  if (compact.length == _vinLength + 1) {
    for (var index = 0; index < compact.length; index++) {
      final repaired =
          compact.substring(0, index) + compact.substring(index + 1);
      if (hasValidVinCheckDigit(repaired)) {
        _addCandidate(candidates, repaired);
      }
    }
    return;
  }

  if (compact.length != _vinLength - 1) return;

  // Cuando falta un carácter, sólo conservamos inserciones que pasan el
  // dígito verificador. El filtro evita generar cientos de falsos positivos.
  for (var index = 0; index <= compact.length; index++) {
    for (final character in _vinAlphabet.split('')) {
      final repaired =
          compact.substring(0, index) + character + compact.substring(index);
      if (hasValidVinCheckDigit(repaired)) {
        _addCandidate(candidates, repaired);
      }
    }
  }
}

void _addCandidate(List<String> candidates, String rawCandidate) {
  final corrected = _canonicalizeCandidate(rawCandidate);
  if (!_looksLikeVin(corrected) || candidates.contains(corrected)) return;
  candidates.add(corrected);
}

String _canonicalizeCandidate(String value) {
  var candidate = value.toUpperCase();
  for (final replacement in _ocrCharacterReplacements.entries) {
    candidate = candidate.replaceAll(replacement.key, replacement.value);
  }
  return candidate.replaceAll(_nonAlphaNumeric, '');
}

bool _looksLikeVin(String value) {
  if (value.length != _vinLength || !_vinRegex.hasMatch(value)) return false;
  return _digit.allMatches(value).length >= 2 &&
      _letter.allMatches(value).length >= 2;
}

List<String> _rankCandidates(Iterable<String> values) {
  final unique = <String>[];
  for (final value in values) {
    if (!unique.contains(value)) unique.add(value);
  }

  unique.sort((a, b) {
    final strongComparison =
        (hasValidVinCheckDigit(b) ? 1 : 0) - (hasValidVinCheckDigit(a) ? 1 : 0);
    return strongComparison;
  });
  return unique;
}

String? _selectBestCandidate(Iterable<String> candidates) {
  final ranked = _rankCandidates(candidates);
  return ranked.isEmpty ? null : ranked.first;
}
