// Registra un Service Worker real (embebido como Blob, sin archivos sueltos).
// Un SW con manejador de "fetch" es requisito indispensable para que Chrome/Edge/Android
// consideren la app "instalable" (junto con el manifest + HTTPS). Antes este bloque
// desregistraba cualquier SW en cada carga, por lo que la app NUNCA cumplía los
// criterios de instalación.
if('serviceWorker' in navigator){
  var __SW_SRC = "" +
    "const CACHE='controldm-shell-v1';" +
    "self.addEventListener('install',e=>{" +
    "  self.skipWaiting();" +
    "  e.waitUntil(caches.open(CACHE).then(c=>c.add(self.registration.scope)).catch(()=>{}));" +
    "});" +
    "self.addEventListener('activate',e=>{" +
    "  e.waitUntil(self.clients.claim());" +
    "});" +
    "self.addEventListener('fetch',e=>{" +
    "  if(e.request.method!=='GET') return;" +
    "  e.respondWith(" +
    "    fetch(e.request).then(res=>{" +
    "      const copy=res.clone();" +
    "      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});" +
    "      return res;" +
    "    }).catch(()=>caches.match(e.request).then(r=>r||caches.match(self.registration.scope)))" +
    "  );" +
    "});";
  var __swBlob = new Blob([__SW_SRC], {type:'application/javascript'});
  var __swUrl = URL.createObjectURL(__swBlob);
  window.addEventListener('load', function(){
    // Un Service Worker registrado desde una URL blob: no tiene un "scope" de
    // directorio implícito fiable (las blob: URL no tienen ruta jerárquica), así
    // que el navegador puede terminar controlando un scope distinto al de
    // start_url. Eso hace que la instalación "cuente" pero la app instalada no
    // abra correctamente. Forzamos el scope al directorio real de la página.
    var __swScope = new URL('.', window.location.href).href;
    navigator.serviceWorker.register(__swUrl, { scope: __swScope }).catch(function(err){
      console.warn('No se pudo registrar el Service Worker:', err);
    });
  });
}
