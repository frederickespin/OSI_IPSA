
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  OSI_AUTH.init({ idleMs: 60000, heartbeatMs: 15000, endOnClose: true });

  const todayISO = () => new Date().toISOString().slice(0,10);
  const pad = (n, w) => String(n).padStart(w,'0');
  const enc = (s) => new TextEncoder().encode(s);

  // PBKDF2 PIN
  const loadPins = () => {
    const raw = localStorage.getItem('osi-pins');
    if(raw) return JSON.parse(raw);
    const init = {
      encargado: { salt: Array.from(crypto.getRandomValues(new Uint8Array(16))), iterations: 120000, hash: null },
      supervisor: { salt: Array.from(crypto.getRandomValues(new Uint8Array(16))), iterations: 120000, hash: null }
    };
    return Promise.all([
      pbkdf2('1111', new Uint8Array(init.encargado.salt), init.encargado.iterations),
      pbkdf2('2222', new Uint8Array(init.supervisor.salt), init.supervisor.iterations)
    ]).then(([hE, hS]) => {
      init.encargado.hash = Array.from(new Uint8Array(hE));
      init.supervisor.hash = Array.from(new Uint8Array(hS));
      localStorage.setItem('osi-pins', JSON.stringify(init));
      return init;
    });
  };
  function pbkdf2(pin, salt, iterations){
    return crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits']).then(key => crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations }, key, 256));
  }
  async function verifyPin(role, pin){
    const pins = await loadPins();
    const meta = pins[role];
    const bits = await pbkdf2(pin, new Uint8Array(meta.salt), meta.iterations);
    const arr = Array.from(new Uint8Array(bits));
    return JSON.stringify(arr) === JSON.stringify(meta.hash);
  }

  const getSeq = () => parseInt(localStorage.getItem('osi-seq')||'1',10);
  const setSeq = (n) => localStorage.setItem('osi-seq', String(n));
  const asignarNumero = () => { $('numeroOrden').value = 'OSI-' + pad(getSeq(), 5); };
  const nuevaOSI = () => { setSeq(getSeq()+1); asignarNumero(); };

  const guardarLocal = () => {
    const key = 'osi-internal-' + (($('numeroOrden').value)||'temp');
    const data = { fecha: $('fechaEmision').value, num: $('numeroOrden').value, area: $('area').value, prioridad: $('prioridad').value };
    localStorage.setItem(key, JSON.stringify(data));
    alert('💾 Guardado offline: '+key);
  };

  // Init UI
  $('fechaEmision').value = todayISO();
  asignarNumero();
  document.getElementById('btnImprimir').addEventListener('click', () => window.print());
  document.getElementById('btnGuardar').addEventListener('click', () => guardarLocal());

  // PWA install/share helpers
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; });
  document.getElementById('btnInstall').addEventListener('click', async () => {
    if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; }
    else alert('Usa “Agregar a la pantalla de inicio”.');
  });
  document.getElementById('btnShareLink').addEventListener('click', async () => {
    const link = location.href.split('?')[0] + '?v=9r3';
    if(navigator.share){ try{ await navigator.share({title:'OSI', text:'Formulario OSI', url: link}); }catch(_){}} else { await navigator.clipboard.writeText(link); alert('🔗 Enlace copiado'); }
  });

  // Login overlay visible si no hay sesión
  let selectedRole = 'encargado';
  document.getElementById('loginEncargado').addEventListener('click', ()=>{ selectedRole = 'encargado'; });
  document.getElementById('loginSupervisor').addEventListener('click', ()=>{ selectedRole = 'supervisor'; });
  document.getElementById('btnEntrar').addEventListener('click', async () => {
    const pin = document.getElementById('pinInput').value.trim();
    if(!pin) return alert('Ingresa PIN');
    const ok = await verifyPin(selectedRole, pin);
    if(!ok) return alert('PIN incorrecto');
    OSI_AUTH.startSession(selectedRole, '', 1/60); // 1 minuto, se renueva con actividad
    document.getElementById('loginOverlay').style.display='none';
  });

  (function ensureSession(){
    const s = OSI_AUTH.getSession();
    document.getElementById('loginOverlay').style.display = (s && s.role) ? 'none' : 'flex';
  })();

  window.addEventListener('osi:session-ended', ()=>{
    alert('Sesión finalizada (build 9r3).');
    document.getElementById('loginOverlay').style.display='flex';
  });
});
