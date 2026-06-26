import 'package:flutter_test/flutter_test.dart';
import 'package:rr_campo/src/features/campo/domain/tarea_campo.dart';

void main() {
  test('TareaCampo parsea fotos y datos base del API', () {
    final tarea = TareaCampo.fromJson({
      'id': 'task-1',
      'tramiteId': 'tramite-1',
      'vehiculoId': 'vehiculo-1',
      'numeroConsecutivo': 'RR-0001',
      'clienteNombre': 'Cliente prueba',
      'vehiculoResumen': 'Honda Accord 2018',
      'descripcionVehiculo': null,
      'clienteNombreLibre': null,
      'vin': '1HGCV1F33JA235611',
      'vinCorto': '235611',
      'tipo': 'FOTOS_YARDA',
      'estatus': 'ABIERTA',
      'ubicacion': 'Patio norte',
      'vinConfirmado': null,
      'fotosUrls': ['/storage/campo/foto-1.jpg'],
      'incidencia': null,
    });

    expect(tarea.id, 'task-1');
    expect(tarea.folio, 'RR-0001');
    expect(tarea.fotosUrls, hasLength(1));
    expect(tarea.estaCerrada, isFalse);
  });
}
