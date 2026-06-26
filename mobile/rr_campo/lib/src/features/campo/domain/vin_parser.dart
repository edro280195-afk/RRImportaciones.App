final _vinRegex = RegExp(r'[A-HJ-NPR-Z0-9]{17}', caseSensitive: false);
final _invalidVinCharacters = RegExp(r'[^A-HJ-NPR-Z0-9]');
final _nonAlphaNumeric = RegExp(r'[^A-Z0-9]');
final _digit = RegExp(r'\d');

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
  final direct = _collectCandidates(value);
  final withoutLabels = value.replaceAll(
    RegExp(r'\bVIN\b', caseSensitive: false),
    ' ',
  );
  final compact = withoutLabels.toUpperCase().replaceAll(
    _invalidVinCharacters,
    '',
  );
  final labelPrefixed = value.toUpperCase().replaceAll(_nonAlphaNumeric, '');
  final compactCandidates = [
    ..._collectCandidates(compact),
    if (labelPrefixed.startsWith('VIN'))
      ..._collectCandidates(labelPrefixed.substring(3)),
  ];
  final candidates = [...direct, ...compactCandidates];

  if (candidates.isEmpty) return null;
  return candidates.firstWhere(
    hasValidVinCheckDigit,
    orElse: () => candidates.first,
  );
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

List<String> _collectCandidates(String value) {
  final matches = _vinRegex.allMatches(value.toUpperCase());
  final candidates = <String>[];
  for (final match in matches) {
    final candidate = match.group(0);
    if (candidate != null && !candidates.contains(candidate)) {
      candidates.add(candidate);
    }
  }
  return candidates;
}
