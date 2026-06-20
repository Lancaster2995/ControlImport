// Service worker — Control DM (BPA / DIGEMID)
// ponytail: cache-first para el shell de la app (estático, cambia poco) con actualización
// en segundo plano (stale-while-revalidate); todo lo de Google (auth + Drive API) se deja
// pasar directo a la red sin tocarlo, porque cachear tokens/datos dinámicos sería un error.
// Para publicar una actualización del shell, sube el número de CACHE_VERSION.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `dm-bpa-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-32.png',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Nunca interceptar Google (OAuth / Drive API) ni Google Fonts: siempre red, nunca caché.
  if (url.origin.includes('google') || url.origin.includes('gstatic')) return;
  // Solo manejar nuestro propio origen.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
