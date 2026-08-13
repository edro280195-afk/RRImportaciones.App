// Subir esta versión invalida todo lo cacheado por la versión anterior.
const CACHE_NAME = 'rr-importaciones-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/icons/campo-192.png',
  '/icons/campo-512.png',
  // Motor y modelo OCR local para leer VIN aunque la yarda no tenga señal.
  '/assets/ocr/tesseract/worker.min.js',
  '/assets/ocr/eng/4.0.0_best_int/eng.traineddata.gz',
  '/assets/ocr/core/tesseract-core.wasm.js',
  '/assets/ocr/core/tesseract-core.wasm',
  '/assets/ocr/core/tesseract-core-simd.wasm.js',
  '/assets/ocr/core/tesseract-core-simd.wasm',
  '/assets/ocr/core/tesseract-core-simd-lstm.wasm.js',
  '/assets/ocr/core/tesseract-core-simd-lstm.wasm',
  '/assets/ocr/core/tesseract-core-relaxedsimd.wasm.js',
  '/assets/ocr/core/tesseract-core-relaxedsimd.wasm',
  '/assets/ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js',
  '/assets/ocr/core/tesseract-core-relaxedsimd-lstm.wasm'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Ojo: aquí NO se llama a skipWaiting(). La versión nueva se queda esperando a
  // propósito, para que la app pueda avisarle al usuario ("hay una versión
  // nueva") y recargar cuando él acepte. Si se activara sola, cambiaría el
  // service worker por debajo de una pestaña que sigue corriendo el código
  // viejo: mitad nueva, mitad vieja, que es peor que no actualizar.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// La app manda este mensaje cuando el usuario toca "Actualizar" en el aviso.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Estrategias de caché ──────────────────────────────────────────────────
//
// El HTML y el código de la app van por RED PRIMERO, con la caché solo como
// respaldo sin conexión. Antes era al revés (caché primero para todo) y eso
// dejaba la app congelada en la versión instalada: al publicar una versión
// nueva, el navegador seguía sirviendo el index.html viejo, que a su vez
// apuntaba a los bundles viejos —también cacheados—, así que el despliegue no
// le llegaba nunca al usuario.
//
// Las imágenes e iconos sí van por caché primero: no cambian y así la app
// arranca rápido y funciona en la yarda sin señal.
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET locales
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // La huella del build nunca se cachea: es justo el archivo que sirve para
  // saber si lo que está corriendo ya quedó viejo.
  if (url.pathname === '/version.json') return;

  // Navegación (rutas de Angular como /campo o /asistente-personal)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const esCodigo = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  const esEstatico = url.pathname.includes('/assets/') || url.pathname.includes('/icons/');

  if (esCodigo) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200 && esEstatico) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

// ── Web Push: notificaciones aún con la PWA cerrada ──────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'R&R Importaciones', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'R&R Importaciones';
  const options = {
    body: data.body || '',
    icon: '/icons/campo-192.png',
    badge: '/icons/campo-192.png',
    tag: data.tag || 'rr-notification',
    data: { url: data.url || '/' },
    vibrate: [120, 60, 120],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const targetAbsoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestaña abierta de la app, enfócala y navega
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            try { client.navigate(targetAbsoluteUrl); } catch (e) { /* ignore */ }
          }
          return;
        }
      }
      // Si no hay ninguna, abre una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetAbsoluteUrl);
      }
    })
  );
});
