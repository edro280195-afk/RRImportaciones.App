class TareaCampo {
  const TareaCampo({
    required this.id,
    required this.tramiteId,
    required this.vehiculoId,
    required this.numeroConsecutivo,
    required this.clienteNombre,
    required this.vehiculoResumen,
    required this.descripcionVehiculo,
    required this.clienteNombreLibre,
    required this.vin,
    required this.vinCorto,
    required this.tipo,
    required this.estatus,
    required this.ubicacion,
    required this.vinConfirmado,
    required this.fotosUrls,
    required this.incidencia,
  });

  final String id;
  final String? tramiteId;
  final String? vehiculoId;
  final String? numeroConsecutivo;
  final String? clienteNombre;
  final String vehiculoResumen;
  final String? descripcionVehiculo;
  final String? clienteNombreLibre;
  final String? vin;
  final String? vinCorto;
  final String tipo;
  final String estatus;
  final String? ubicacion;
  final String? vinConfirmado;
  final List<String> fotosUrls;
  final String? incidencia;

  bool get estaCerrada => estatus == 'COMPLETADA' || estatus == 'CANCELADA';

  String get folio => numeroConsecutivo ?? 'PRE-INSP';

  factory TareaCampo.fromJson(Map<String, dynamic> json) {
    return TareaCampo(
      id: json['id'].toString(),
      tramiteId: json['tramiteId']?.toString(),
      vehiculoId: json['vehiculoId']?.toString(),
      numeroConsecutivo: json['numeroConsecutivo']?.toString(),
      clienteNombre: json['clienteNombre']?.toString(),
      vehiculoResumen: json['vehiculoResumen']?.toString() ?? 'Unidad',
      descripcionVehiculo: json['descripcionVehiculo']?.toString(),
      clienteNombreLibre: json['clienteNombreLibre']?.toString(),
      vin: json['vin']?.toString(),
      vinCorto: json['vinCorto']?.toString(),
      tipo: json['tipo']?.toString() ?? 'FOTOS_YARDA',
      estatus: json['estatus']?.toString() ?? 'ABIERTA',
      ubicacion: json['ubicacion']?.toString(),
      vinConfirmado: json['vinConfirmado']?.toString(),
      fotosUrls: (json['fotosUrls'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      incidencia: json['incidencia']?.toString(),
    );
  }
}

class UploadFotoResponse {
  const UploadFotoResponse({required this.fotoUrl, required this.tarea});

  final String fotoUrl;
  final TareaCampo tarea;

  factory UploadFotoResponse.fromJson(Map<String, dynamic> json) {
    return UploadFotoResponse(
      fotoUrl: json['fotoUrl'].toString(),
      tarea: TareaCampo.fromJson(json['tarea'] as Map<String, dynamic>),
    );
  }
}
