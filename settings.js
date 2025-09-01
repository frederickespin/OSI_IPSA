
(function(){
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault(); deferredPrompt=e;});
  const $ = (id) => document.getElementById(id);
  $('#btnInstall').onclick = async () => {
    if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; }
    else alert('Si no ves el cuadro, usa “Agregar a la pantalla de inicio”.');
  };
  $('#btnShareLink').onclick = async () => {
    const link = location.origin + location.pathname.replace('settings.html','index.html') + '?v=22s3';
    if(navigator.share){ try{ await navigator.share({title:'OSI', text:'Formulario OSI', url: link}); }catch(_){}} else { await navigator.clipboard.writeText(link); alert('🔗 Enlace copiado'); }
  };

  function enc(s){ return new TextEncoder().encode(s); }
  function pbkdf2(pin,salt,it){
    return crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits'])
      .then(key => crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations: it }, key, 256));
  }
  async function updatePins(){
    const e = $('#pinEnc').value.trim();
    const s = $('#pinSup').value.trim();
    if(!e && !s){ alert('Escribe al menos un PIN'); return; }
    let meta = JSON.parse(localStorage.getItem('osi-pins')||'null');
    if(!meta){
      meta = {encargado:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null},
              supervisor:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null}};
    }
    if(e){
      const saltE = new Uint8Array(crypto.getRandomValues(new Uint8Array(16)));
      const bitsE = await pbkdf2(e, saltE, meta.encargado.iterations);
      meta.encargado.salt = Array.from(saltE);
      meta.encargado.hash = Array.from(new Uint8Array(bitsE));
    }
    if(s){
      const saltS = new Uint8Array(crypto.getRandomValues(new Uint8Array(16)));
      const bitsS = await pbkdf2(s, saltS, meta.supervisor.iterations);
      meta.supervisor.salt = Array.from(saltS);
      meta.supervisor.hash = Array.from(new Uint8Array(bitsS));
    }
    localStorage.setItem('osi-pins', JSON.stringify(meta));
    alert('PIN(es) actualizado(s).');
    $('#pinEnc').value = ''; $('#pinSup').value = '';
  }
  $('#btnUpdatePins').onclick = updatePins;
})();
