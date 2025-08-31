const CACHE = "osi-cache-v9";
const ASSETS = [
  "./","./index.html","./app.js","./auth.js",
  "./personal.html","./personal.js",
  "./settings.html","./settings.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png",
  "./icons/icon-180.png","./icons/icon-32.png","./icons/icon-16.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if(e.request.method === "GET" && resp && resp.status === 200 && e.request.url.startsWith(self.location.origin)){
        const clone = resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request, clone));
      }
      return resp;
    }).catch(()=>cached))
  );
});