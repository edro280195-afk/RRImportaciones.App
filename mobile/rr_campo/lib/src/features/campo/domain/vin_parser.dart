final _vinRegex = RegExp(r'[A-HJ-NPR-Z0-9]{17}', caseSensitive: false);
final _lenientVinRegex = RegExp(r'[A-Z0-9]{17}', caseSensitive: false);
final _invalidVinCharacters = RegExp(r'[^A-HJ-NPR-Z0-9]');
final _nonAlphaNumeric = RegExp(r'[^A-Z0-9]');
final _alphaNumeric = RegExp(r'[A-Z0-9]');
final _digit = RegExp(r'\d');
final _letter = RegExp(r'[A-Z]');
final _vinLabelPrefix = RegExp(r'^\s*VIN\s*[:#-]?\s*', caseSensitive: false);

String normalizeVinInput(String value) {
  final normalized = value.toUpperCase().replaceAll(_invalidVinCharacters, '');
  if (normalized.length <= 17) return normalized;
  return normalized.substring(0, 17);
}

String toShortVin(String value) {
  final normalized = normalizeVinInput(value);
  if (normalized.length <= 6) return normalized;
  return normalized.substring(normalized.length - 6);
}

String? extractVinCandidate(String value) {
  final candidates = <String>[];
  for (final line in value.split(RegExp(r'[\r\n]+'))) {
    final candidate = extractVinFromOcrLine(line);
    if (candidate != null && !candidates.contains(candidate)) {
      candidates.add(candidate);
    }
  }
  return _selectBestCandidate(candidates);
}

String? extractVinFromBarcode(String value) {
  var compact = value
      .toUpperCase()
      .replaceAll('I', '1')
      .replaceAll('O', '0')
      .replaceAll('Q', '0')
      .replaceAll(_nonAlphaNumeric, '');
  if (compact.startsWith('V1N')) {
    compact = compact.substring(3);
  }

  final candidates = <String>[];
  for (var index = 0; index + 17 <= compact.length; index++) {
    _addCandidate(candidates, compact.substring(index, index + 17));
  }
  if (candidates.isEmpty) return null;

  for (final candidate in candidates) {
    if (hasValidVinCheckDigit(candidate)) return candidate;
  }
  return compact.length == 17 ? candidates.first : null;
}

/// Extrae un VIN únicamente cuando está contenido en el mismo renglón.
///
/// No compacta frases largas. Esto evita convertir texto descriptivo de una
/// etiqueta vehicular en un VIN falso de 17 caracteres.
String? extractVinFromOcrLine(String value) {
  final upper = value.toUpperCase().trim();
  if (upper.isEmpty) return null;

  final candidates = _collectBoundedCandidates(upper);
  final withoutLabel = upper.replaceFirst(_vinLabelPrefix, '');
  final compact = withoutLabel.replaceAll(_nonAlphaNumeric, '');
  if (compact.length == 17) {
    _addCandidate(candidates, compact);
  }

  return _selectBestCandidate(candidates);
}

bool hasValidVinCheckDigit(String value) {
  final vin = normalizeVinInput(value);
  if (vin.length != 17) return false;

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

List<String> _collectBoundedCandidates(String value) {
  final upper = value.toUpperCase();
  final matches = _lenientVinRegex.allMatches(upper);
  final candidates = <String>[];
  for (final match in matches) {
    final leftIsClear =
        match.start == 0 || !_alphaNumeric.hasMatch(upper[match.start - 1]);
    final rightIsClear =
        match.end == upper.length || !_alphaNumeric.hasMatch(upper[match.end]);
    if (!leftIsClear || !rightIsClear) continue;

    final candidate = match.group(0);
    if (candidate != null) _addCandidate(candidates, candidate);
  }
  return candidates;
}

void _addCandidate(List<String> candidates, String rawCandidate) {
  final corrected = rawCandidate
      .toUpperCase()
      .replaceAll('I', '1')
      .replaceAll('O', '0')
      .replaceAll('Q', '0')
      .replaceAll(_invalidVinCharacters, '');
  if (!_looksLikeVin(corrected) || candidates.contains(corrected)) return;
  candidates.add(corrected);
}

bool _looksLikeVin(String value) {
  if (!_vinRegex.hasMatch(value) || value.length != 17) return false;
  return _digit.allMatches(value).length >= 2 &&
      _letter.allMatches(value).length >= 2;
}

String? _selectBestCandidate(List<String> candidates) {
  if (candidates.isEmpty) return null;
  return candidates.firstWhere(
    hasValidVinCheckDigit,
    orElse: () => candidates.first,
  );
}
