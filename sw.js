const CACHE='osi-ipssa-v1';
const ASSETS=[
  './','index.html','login.html','settings.html','personal.html','historial.html',
  'app.js','auth.js','settings.js','personal.js','historial.js',
  'supervisor.html','supervisor.js','manifest.webmanifest','logo.png'
];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); });
self.addEventListener('fetch',e=>{
  const req=e.request;
  e.respondWith(caches.match(req).then(cached=> cached || fetch(req).then(r=>{
    if(req.method==='GET' && r.status===200 && !req.url.includes('chrome-extension')) {
      const clone=r.clone(); caches.open(CACHE).then(c=>c.put(req,clone)); }
    return r;
  }).catch(()=>cached)));
});
