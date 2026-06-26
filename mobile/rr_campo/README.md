# R&R Campo Flutter

Aplicacion nativa inicial para el modulo Campo de R&R Importaciones.

## Flujo incluido

- Login por usuario de campo + PIN usando `/api/auth/campo-users`, `/api/auth/pin-login` e `/api/auth/initial-campo-pin`.
- Lista de tareas desde `/api/campo/tareas`.
- Captura de tarea con camara nativa mediante `image_picker`.
- Subida de fotos a `/api/campo/tareas/{id}/fotos`.
- Cierre de captura en `/api/campo/tareas/{id}/completar`.

## Ejecutar

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=https://rrimportaciones.onrender.com
```

Para apuntar a backend local desde emulador Android:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5198
```

## Notificaciones nativas

Ya estan agregadas las dependencias base (`firebase_messaging`, `firebase_core` y `flutter_local_notifications`) y permisos moviles. Para activar push nativo real falta que el cliente entregue/configure:

- `android/app/google-services.json`
- `ios/Runner/GoogleService-Info.plist`
- cuenta/proyecto Firebase con APNs configurado para iOS
- endpoint backend para registrar tokens FCM/APNs y servicio backend para enviar esos mensajes
