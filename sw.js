
const CACHE = "osi-cache-v9r3";
const ASSETS = [
  "./","./index.html?v=9r3","./app.js?v=9r3","./auth.js?v=9r3",
  "./settings.html?v=9r3","./settings.js?v=9r3",
  "./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/icon-180.png","./icons/icon-32.png","./icons/icon-16.png"
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
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin && (url.pathname.endsWith(".html") || url.pathname.endsWith(".js"))) {
    url.searchParams.set("v", "9r3");
  }
  const req = new Request(url, { cache: "no-store" });
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if(resp && resp.ok) caches.open(CACHE).then(c=>c.put(req, resp.clone()));
      return resp;
    }).catch(()=>cached))
  );
});
