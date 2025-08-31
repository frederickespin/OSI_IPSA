
(function(){
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

  const $ = (id) => document.getElementById(id);

  $('btnInstall').addEventListener('click', async () => {
    if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
    else alert('Si no ves el cuadro, usa “Agregar a la pantalla de inicio” en el navegador.');
  });

  function buildShareURL(){
    const base = location.origin + location.pathname.replace('settings.html','index.html');
    return base;
  }
  $('btnShareLink').addEventListener('click', async () => {
    const link = buildShareURL();
    if(navigator.share){
      try{ await navigator.share({title:'OSI', text:'Formulario OSI', url: link}); }catch(_){}
    } else {
      await navigator.clipboard.writeText(link);
      alert('🔗 Enlace copiado');
    }
  });

  $('btnCambiarPin').addEventListener('click', async () => {
    alert('Para cambiar PIN, entra al formulario, inicia sesión y usa “🔐 Cambiar PIN”.');
  });

  $('btnCerrarSesion').addEventListener('click', () => {
    OSI_AUTH.endSession();
    alert('Sesión cerrada en este dispositivo.');
  });

  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("./sw.js", { scope: "./" }); }

  // Iniciar control de inactividad con 1 minuto
  OSI_AUTH.init({ idleMs: 60000, heartbeatMs: 15000, endOnClose: true });
})();
