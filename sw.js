
const CACHE="osi-cache-v22r";
const ASSETS=["./","./index.html?v=22r","./app.js?v=22r","./auth.js?v=22r","./manifest.webmanifest",
"./icons/icon-192.png","./icons/icon-512.png","./icons/icon-180.png","./icons/icon-96.png","./icons/icon-48.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
  const url=new URL(e.request.url);
  if(url.origin===self.location.origin&&(url.pathname.endsWith(".html")||url.pathname.endsWith(".js"))) url.searchParams.set("v","22r");
  const req=new Request(url,{cache:"no-store"});
  e.respondWith(caches.match(req).then(c=>c||fetch(req).then(r=>{if(r&&r.ok)caches.open(CACHE).then(cc=>cc.put(req,r.clone()));return r}).catch(()=>c)));
});
