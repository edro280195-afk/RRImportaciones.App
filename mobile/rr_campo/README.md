# R&R Campo Flutter

Aplicacion nativa inicial para el modulo Campo de R&R Importaciones.

## Flujo de autenticación

- La contraseña crea la primera sesión del dispositivo.
- El PIN de seis dígitos es una credencial rápida para crear una sesión nueva;
  se configura únicamente después de autenticar la contraseña.
- La biometría no solicita tokens ni reemplaza al PIN: desbloquea una sesión
  guardada y, solo después de validar la huella o el rostro, permite renovarla.
- Al abrir de nuevo la app, una sesión guardada comienza bloqueada. Se intenta
  biometría si el usuario la activó; de lo contrario se ofrece PIN o contraseña.
- `Cerrar sesión` revoca el refresh token en el servidor y limpia la sesión
  segura del dispositivo. `Bloquear aplicación` conserva la sesión.

## Funcionalidad incluida

- Login rápido por PIN mediante `/api/auth/pin-login`.
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
