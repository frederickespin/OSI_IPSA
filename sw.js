// sw.js  — cache-bust Build fix2
const CACHE = 'osi-ipssa-fix2-2025-09-10';

const ASSETS = [
  './','index.html','login.html','settings.html','personal.html','historial.html',
  'app.js','auth.js','settings.js','personal.js','historial.js',
  'supervisor.html','supervisor.js','manifest.webmanifest','logo.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // activa esta versión inmediatamente
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // toma control de todas las pestañas abiertas
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(r => {
        if (req.method === 'GET' && r.status === 200 && !req.url.includes('chrome-extension')) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return r;
      }).catch(() => cached)
    )
  );
});
