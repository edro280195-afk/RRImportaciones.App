/* eslint-disable no-undef */
//
// Service worker exclusivo de Firebase Cloud Messaging. Es el que recibe las
// notificaciones cuando la pestaña está cerrada o en segundo plano.
//
// Va aparte de sw.js a propósito: sw.js es el que guarda la app en caché para
// que la yarda funcione sin señal, y no queremos que dependa de bajar los
// scripts de Firebase para instalarse.
//
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyArG1ZssiWSeEmJIiaxG9e7ivqvS-ZnMpw',
  authDomain: 'rrimportaciones-213d1.firebaseapp.com',
  projectId: 'rrimportaciones-213d1',
  storageBucket: 'rrimportaciones-213d1.firebasestorage.app',
  messagingSenderId: '11072477101',
  appId: '1:11072477101:web:5e8c6de2cdc3a176793324',
});

const messaging = firebase.messaging();

// Solo entra aquí cuando el mensaje llega SIN bloque `notification` (data-only).
// Si el mensaje trae `notification`, el SDK ya la muestra solo y no hay que
// pintarla otra vez: si lo hiciéramos, saldría duplicada.
messaging.onBackgroundMessage(payload => {
  const datos = payload.data || {};
  if (payload.notification) return;

  const titulo = datos.title || 'R&R Importaciones';
  self.registration.showNotification(titulo, {
    body: datos.body || '',
    icon: '/icons/campo-192.png',
    badge: '/icons/campo-192.png',
    tag: datos.tag || 'rr-notification',
    data: { url: datos.url || '/' },
    vibrate: [120, 60, 120],
    renotify: true,
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const datos = event.notification.data || {};
  // El click de una notificación con `notification` trae la ruta en FCM_MSG.
  const desdeFcm = datos.FCM_MSG?.data?.url;
  const destino = datos.url || desdeFcm || '/';
  const destinoAbsoluto = new URL(destino, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const cliente of lista) {
        if ('focus' in cliente) {
          cliente.focus();
          if ('navigate' in cliente) {
            try {
              cliente.navigate(destinoAbsoluto);
            } catch (e) {
              /* la pestaña puede estar en un origen distinto */
            }
          }
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(destinoAbsoluto);
    })
  );
});
