/// Marca de vehículo (catálogo `/api/marcas`).
class Marca {
  const Marca({required this.id, required this.nombre, required this.aliases});

  final String id;
  final String nombre;
  final List<String> aliases;

  factory Marca.fromJson(Map<String, dynamic> json) {
    return Marca(
      id: json['id'].toString(),
      nombre: json['nombre']?.toString() ?? '',
      aliases: (json['aliases'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
    );
  }

  /// ¿Coincide el nombre o algún alias con el texto del decodificador de VIN?
  bool matches(String value) {
    final lower = value.toLowerCase();
    return nombre.toLowerCase() == lower ||
        aliases.any((alias) => alias.toLowerCase() == lower);
  }
}

/// Cliente para el buscador (`/api/clientes/search`).
class ClienteListItem {
  const ClienteListItem({
    required this.id,
    required this.apodo,
    required this.nombreCompleto,
    required this.telefono,
    required this.procedencia,
    required this.totalVehiculos,
  });

  final String id;
  final String apodo;
  final String? nombreCompleto;
  final String? telefono;
  final String? procedencia;
  final int totalVehiculos;

  String get label =>
      apodo.isNotEmpty ? apodo : (nombreCompleto ?? 'Cliente sin nombre');

  String get initials {
    final source = label.trim();
    if (source.isEmpty) return '?';
    final parts = source.split(RegExp(r'\s+'));
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  String get meta {
    final parts = <String>[
      if (nombreCompleto != null &&
          nombreCompleto!.isNotEmpty &&
          nombreCompleto != apodo)
        nombreCompleto!,
      if (telefono != null && telefono!.isNotEmpty) telefono!,
      if (procedencia != null && procedencia!.isNotEmpty) procedencia!,
      '$totalVehiculos ${totalVehiculos == 1 ? 'vehículo' : 'vehículos'}',
    ];
    return parts.join(' · ');
  }

  factory ClienteListItem.fromJson(Map<String, dynamic> json) {
    return ClienteListItem(
      id: json['id'].toString(),
      apodo: json['apodo']?.toString() ?? '',
      nombreCompleto: json['nombreCompleto']?.toString(),
      telefono: json['telefono']?.toString(),
      procedencia: json['procedencia']?.toString(),
      totalVehiculos: (json['totalVehiculos'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Resultado del decodificador de VIN (`/api/cotizaciones/decode-vin/{vin}`).
class VinDecodeResult {
  const VinDecodeResult({this.make, this.model, this.modelYear});

  final String? make;
  final String? model;
  final int? modelYear;

  bool get isEmpty => make == null && model == null && modelYear == null;

  factory VinDecodeResult.fromJson(Map<String, dynamic> json) {
    return VinDecodeResult(
      make: json['make']?.toString(),
      model: json['model']?.toString(),
      modelYear: (json['modelYear'] as num?)?.toInt(),
    );
  }
}
