export const environment = {
  production: true,
  apiUrl: 'https://rrimportaciones.onrender.com',
  vapidPublicKey:
    'BOqMbFw0OZ59ij7zpQTEni2eYI5W0j6990f7ibKQ8UEK6Vw1KlS8EUv8UvPWCOwGWZ9VFc4NJk5jvI_j6Wn8BKI',
  firebase: {
    apiKey: 'AIzaSyArG1ZssiWSeEmJIiaxG9e7ivqvS-ZnMpw',
    authDomain: 'rrimportaciones-213d1.firebaseapp.com',
    projectId: 'rrimportaciones-213d1',
    storageBucket: 'rrimportaciones-213d1.firebasestorage.app',
    messagingSenderId: '11072477101',
    appId: '1:11072477101:web:5e8c6de2cdc3a176793324',
    measurementId: 'G-4MRPV7ELMK',
  },
  /**
   * Certificado push web del proyecto (Firebase Console → Configuración del
   * proyecto → Cloud Messaging → Certificados push web). Es opcional: si se
   * deja vacío, Firebase usa su clave por defecto y las notificaciones
   * funcionan igual.
   */
  firebaseVapidKey: '',
};
