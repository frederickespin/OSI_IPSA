// Configuración (PWA + PIN + compartir)
(function(){
  const $=id=>document.getElementById(id);
  // PIN
  $('savePin').onclick=()=>{ const p=$('pinNew').value.trim(); if(!p) return alert('PIN vacío'); OSI_AUTH.setPin(p); alert('PIN actualizado'); $('pinNew').value=''; };

  // Instalar PWA
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; });
  $('installBtn').onclick=async()=>{
    if(!deferredPrompt){ alert('Si el botón no funciona, usa: Añadir a pantalla de inicio desde el navegador.'); return; }
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null;
  };

  // Compartir / copiar enlace del formulario (index.html)
  function formURL(){ return new URL('index.html', new URL('.', location.href)).href; }
  $('shareSite').onclick=()=>{ const url=formURL(); if(navigator.share){ navigator.share({title:'OSI Encargado', url}).catch(()=>{}); } else { window.open('https://wa.me/?text='+encodeURIComponent(url),'_blank'); } };
  $('copySite').onclick=async()=>{ const url=formURL(); try{ await navigator.clipboard.writeText(url); alert('Enlace copiado'); }catch(_){ alert(url); } };
})();
