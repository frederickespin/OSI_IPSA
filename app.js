
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  // Util
  const todayISO = () => new Date().toISOString().slice(0,10);
  const pad = (n, w) => String(n).padStart(w,'0');
  const enc = (s) => new TextEncoder().encode(s);

  // PIN PBKDF2
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

  const savePins = (pins) => localStorage.setItem('osi-pins', JSON.stringify(pins));

  function pbkdf2(pin, salt, iterations){
    return crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits']).then(key => {
      return crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations }, key, 256);
    });
  }

  async function verifyPin(role, pin){
    const pins = await loadPins();
    const meta = pins[role];
    const bits = await pbkdf2(pin, new Uint8Array(meta.salt), meta.iterations);
    const arr = Array.from(new Uint8Array(bits));
    return JSON.stringify(arr) === JSON.stringify(meta.hash);
  }

  async function changePin(role){
    const p1 = prompt('Nuevo PIN para ' + role + ' (4-8 dígitos):');
    if(!p1 || !/^\d{4,8}$/.test(p1)) return alert('PIN inválido');
    const pins = await loadPins();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const bits = await pbkdf2(p1, salt, pins[role].iterations);
    pins[role].salt = Array.from(salt);
    pins[role].hash = Array.from(new Uint8Array(bits));
    savePins(pins);
    alert('PIN actualizado.');
  }

  // Rol
  let ROLE = sessionStorage.getItem('osi-role') || null;

  // Numeración
  const getSeq = () => parseInt(localStorage.getItem('osi-seq')||'1',10);
  const setSeq = (n) => localStorage.setItem('osi-seq', String(n));
  const asignarNumero = () => { $('numeroOrden').value = 'OSI-' + pad(getSeq(), 5); };
  const nuevaOSI = () => { setSeq(getSeq()+1); limpiar(true); asignarNumero(); setLocked(false); };

  // Catálogo (solo activos)
  const getCatalogo = () => { try { return JSON.parse(localStorage.getItem('osi-catalog')||'[]'); } catch(e){ return []; } };
  const actualizarDatalists = () => {
    const cat = getCatalogo().filter(p=>p.activo!==false);
    const dlPers = $('listaPersonal'), dlSup = $('listaSupervisores'), dlEnc = $('listaEncargados');
    dlPers.innerHTML = dlSup.innerHTML = dlEnc.innerHTML = '';
    const nombresUnicos = [...new Set(cat.map(p => p.nombre).filter(Boolean))];
    nombresUnicos.forEach(n => { const o = document.createElement('option'); o.value = n; dlPers.appendChild(o); });
    const sup = cat.filter(p => /supervisor|jefe|gerente/i.test(p.rol||''));
    const enc = cat.filter(p => /encargado|almac[eé]n/i.test(p.rol||''));
    [...new Set(sup.map(p=>p.nombre))].forEach(n=>{ const o=document.createElement('option');o.value=n;dlSup.appendChild(o); });
    [...new Set(enc.map(p=>p.nombre))].forEach(n=>{ const o=document.createElement('option');o.value=n;dlEnc.appendChild(o); });
  };

  // Tabla y KPIs
  const tbody = $('tbody');
  const kpiActividades = $('kpiActividades');
  const kpiDuracion = $('kpiDuracion');

  const createRow = (data={}) => {
    data = Object.assign({tarea:'', desc:'', inicio:'', fin:'', empleados:'', materiales:''}, data);
    const tr = document.createElement('tr');
    tr.innerHTML = ''
      + '<td><input value="' + (data.tarea||'') + '" placeholder="Ej. Inventario bodega A"></td>'
      + '<td><input value="' + (data.desc||'') + '" placeholder="Instrucciones o alcance"></td>'
      + '<td><input type="time" value="' + (data.inicio||'') + '"></td>'
      + '<td><input type="time" value="' + (data.fin||'') + '"></td>'
      + '<td><input list="listaPersonal" value="' + (data.empleados||'') + '" placeholder="Nombres separados por coma"></td>'
      + '<td><input value="' + (data.materiales||'') + '" placeholder="Materiales/equipos"></td>'
      + '<td><button title="Eliminar" class="btnDel">✕</button></td>';
    tbody.appendChild(tr);
    tr.querySelector('.btnDel').addEventListener('click', () => { tr.remove(); updateKpis(); autoSave(); });
    Array.from(tr.querySelectorAll('input')).forEach(inp => inp.addEventListener('input', () => { updateKpis(); autoSave(); }));
    updateKpis();
  };

  const updateKpis = () => {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    kpiActividades.textContent = rows.length;
    let totalMin = 0;
    rows.forEach(r => {
      const i = r.children[2].querySelector('input').value;
      const f = r.children[3].querySelector('input').value;
      if(i && f){
        const [ih, im] = i.split(':').map(Number);
        const [fh, fm] = f.split(':').map(Number);
        const mins = (fh*60+fm) - (ih*60+im);
        if(mins>0) totalMin += mins;
      }
    });
    const hh = String(Math.floor(totalMin/60)).padStart(2,'0');
    const mm = String(totalMin%60).padStart(2,'0');
    kpiDuracion.textContent = hh + ':' + mm;
  };

  // Fotos (requeridas para cerrar)
  const inputFoto = $('fileFoto');
  const btnFoto = $('btnTomarFoto');
  const btnBorrarFotos = $('btnBorrarFotos');
  const preview = $('preview');
  let fotos = [];

  if(btnFoto) btnFoto.addEventListener('click', () => inputFoto.click());
  if(btnBorrarFotos) btnBorrarFotos.addEventListener('click', () => { fotos = []; renderFotos(); autoSave(); });
  if(inputFoto) inputFoto.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const dataUrl = await fileToCompressedDataURL(file, 1600, 0.85);
    fotos.push(dataUrl); renderFotos(); e.target.value = ''; autoSave();
  });

  const renderFotos = () => {
    preview.innerHTML = '';
    fotos.forEach((d,i) => {
      const img = document.createElement('img');
      img.src = d; img.title = 'Foto ' + (i+1);
      preview.appendChild(img);
    });
  };

  const fileToCompressedDataURL = (file, maxW, quality) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(){
      const img = new Image();
      img.onload = function(){
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if(w > maxW){ h = Math.round(h * (maxW/w)); w = maxW; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Datos + autosave
  const collectData = () => {
    const rows = Array.from(tbody.querySelectorAll('tr')).map(r => ({
      tarea: r.children[0].querySelector('input').value.trim(),
      desc: r.children[1].querySelector('input').value.trim(),
      inicio: r.children[2].querySelector('input').value,
      fin: r.children[3].querySelector('input').value,
      empleados: r.children[4].querySelector('input').value.trim(),
      materiales: r.children[5].querySelector('input').value.trim(),
    }));
    return ({
      fechaEmision: $('fechaEmision').value,
      numeroOrden: $('numeroOrden').value.trim(),
      area: $('area').value,
      prioridad: $('prioridad').value,
      supervisor: $('supervisor').value.trim(),
      encargado: $('encargado').value.trim(),
      tipoTarea: $('tipoTarea').value,
      estado: $('estado').value,
      actividades: rows,
      firmaSupervisor: $('firmaSupervisor').value.trim(),
      firmaEncargado: $('firmaEncargado').value.trim(),
      observaciones: $('observaciones').value.trim(),
      fotos: fotos,
      kpis: { actividades: rows.length, duracionTotal: $('kpiDuracion').textContent },
      meta: getMeta()
    });
  };

  const guardarLocal = (silent) => {
    const data = collectData();
    const key = 'osi-internal-' + (data.numeroOrden || 'temp');
    localStorage.setItem(key, JSON.stringify(data));
    if(!silent) alert('💾 Guardado offline como: ' + key);
  };

  let autosaveTimer = null;
  function autoSave(){
    if(autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(()=> guardarLocal(true), 700);
  }

  // Lock meta
  function getMeta(){
    const raw = localStorage.getItem('osi-meta-current');
    return raw? JSON.parse(raw) : { locked:false, lockedBy:null, closed:false, ts:null };
  }
  function setMeta(m){ localStorage.setItem('osi-meta-current', JSON.stringify(m)); updateLockBadge(); }
  function setLocked(state, by){
    const m = getMeta();
    m.locked = state; m.lockedBy = state? (by||ROLE) : null; m.ts = Date.now();
    setMeta(m); syncLockToInputs();
  }
  function setClosed(){ const m = getMeta(); m.closed = true; setMeta(m); }
  function updateLockBadge(){
    const b = $('lockBadge'); const m = getMeta();
    if(m.closed){ b.textContent = 'Estado: Cerrada'; b.className = 'lock locked'; return; }
    if(m.locked){ b.textContent = 'Estado: Bloqueada por ' + (m.lockedBy||'-'); b.className = 'lock locked'; }
    else { b.textContent = 'Estado: Edición'; b.className = 'lock unlocked'; }
  }
  function syncLockToInputs(){
    const m = getMeta();
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      const id = el.id || '';
      if(ROLE==='supervisor'){
        const allowed = ['estado','observaciones','firmaSupervisor'].includes(id);
        if(m.locked){ el.disabled = !allowed; } else { el.disabled = false; }
      } else {
        if(m.locked){ el.disabled = true; } else { el.disabled = (id==='numeroOrden'); }
      }
    });
    const tableInputs = tbody.querySelectorAll('input');
    tableInputs.forEach(inp => { inp.disabled = m.locked ? true : (ROLE!=='encargado'); });
    document.getElementById('actEncargado').style.display = (ROLE==='encargado') ? 'flex' : 'none';
    document.getElementById('actSupervisor').style.display = (ROLE==='supervisor') ? 'flex' : 'none';
  }

  // Compartir
  const buildShareURL = () => {
    const d = collectData();
    const payload = {
      numeroOrden: d.numeroOrden || undefined,
      fechaEmision: d.fechaEmision || undefined,
      area: d.area || undefined,
      prioridad: d.prioridad || undefined,
      supervisor: d.supervisor || undefined,
      encargado: d.encargado || undefined,
      tipoTarea: d.tipoTarea || undefined,
      estado: d.estado || undefined
    };
    const b64 = btoa(JSON.stringify(payload));
    const base = location.href.split('?')[0];
    return `${base}?payload=${encodeURIComponent(b64)}`;
  };
  const shareWhatsApp = () => {
    const link = buildShareURL();
    const d = collectData();
    const msg = `OSI: ${d.numeroOrden}\nÁrea: ${d.area}\nFecha: ${d.fechaEmision}\nPrioridad: ${d.prioridad}\nSupervisor: ${d.supervisor}\nLink: ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Eventos
  const btnAdd = $('btnAdd'); if(btnAdd) btnAdd.addEventListener('click', () => { if(ROLE!=='encargado') return; createRow(); autoSave(); });
  const btnGuardar = $('btnGuardar'); if(btnGuardar) btnGuardar.addEventListener('click', () => guardarLocal());
  const btnImprimir = $('btnImprimir'); if(btnImprimir) btnImprimir.addEventListener('click', () => window.print());
  const btnWA = $('btnWhatsApp'); if(btnWA) btnWA.addEventListener('click', () => shareWhatsApp());
  const btnNueva = $('btnNueva'); if(btnNueva) btnNueva.addEventListener('click', () => nuevaOSI());
  const btnAsignar = $('btnAsignar'); if(btnAsignar) btnAsignar.addEventListener('click', () => {
    if(ROLE!=='encargado') return;
    setLocked(true,'encargado'); alert('Asignada y bloqueada. El supervisor puede continuar.');
  });
  const btnFirmar = $('btnFirmarCerrar'); if(btnFirmar) btnFirmar.addEventListener('click', () => {
    if(ROLE!=='supervisor') return;
    if((fotos||[]).length < 1) return alert('Debes adjuntar al menos una foto de verificación.');
    $('estado').value = 'Completada'; setClosed(); setLocked(true,'supervisor'); guardarLocal(); alert('Orden firmada y cerrada.');
  });

  document.querySelectorAll('input, select, textarea').forEach(el => {
    if(el.id==='numeroOrden') return;
    el.addEventListener('input', autoSave);
    el.addEventListener('change', autoSave);
  });

  // PWA install/share
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
  document.getElementById('btnInstall').addEventListener('click', async () => {
    if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
    else alert('Usa "Agregar a la pantalla de inicio".');
  });
  document.getElementById('btnShareLink').addEventListener('click', async () => {
    const link = buildShareURL();
    if(navigator.share){
      try{ await navigator.share({title:'OSI '+$('numeroOrden').value, text:'Detalles básicos de OSI', url: link}); }catch(_){}
    } else {
      await navigator.clipboard.writeText(link);
      alert('🔗 Enlace copiado');
    }
  });

  // Rol & PIN UI
  const roleBadge = $('roleBadge');
  function setRole(r){ ROLE = r; sessionStorage.setItem('osi-role', r); roleBadge.textContent = 'Rol: ' + (r==='encargado'?'Encargado':'Supervisor'); syncLockToInputs(); }
  let selectedRole = 'encargado';
  document.getElementById('loginEncargado').addEventListener('click', ()=>{ selectedRole='encargado'; });
  document.getElementById('loginSupervisor').addEventListener('click', ()=>{ selectedRole='supervisor'; });
  document.getElementById('btnEntrar').addEventListener('click', async () => {
    const pin = document.getElementById('pinInput').value.trim();
    if(!pin) return alert('Ingresa PIN');
    const ok = await verifyPin(selectedRole, pin);
    if(!ok) return alert('PIN incorrecto');
    setRole(selectedRole);
    document.getElementById('loginOverlay').style.display='none';
  });
  document.getElementById('btnCambiarRol').addEventListener('click', ()=>{
    document.getElementById('loginOverlay').style.display='flex';
    document.getElementById('pinInput').value='';
  });
  document.getElementById('btnCambiarPin').addEventListener('click', async () => {
    if(!ROLE) return alert('Primero inicia sesión');
    await changePin(ROLE);
  });

  // Atajo escritorio: Ctrl/Cmd + S
  document.addEventListener('keydown', (e) => {
    const isSave = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
    if(isSave){ e.preventDefault(); if(ROLE==='encargado') document.getElementById('btnGuardar').click(); }
  });

  // Init
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("./sw.js", { scope: "./" }); }
  document.getElementById('fechaEmision').value = todayISO();
  asignarNumero();
  actualizarDatalists();
  createRow();
  updateKpis();
  renderFotos();
  setLocked(false);
  updateLockBadge();

  // Prefill (opcional)
  (function prefillFromURL(){
    const params = new URLSearchParams(location.search);
    if(params.get('payload')){
      try{
        const d = JSON.parse(atob(params.get('payload')));
        if(d.fechaEmision) document.getElementById('fechaEmision').value = d.fechaEmision;
        if(d.numeroOrden) document.getElementById('numeroOrden').value = d.numeroOrden;
        if(d.area) document.getElementById('area').value = d.area;
        if(d.prioridad) document.getElementById('prioridad').value = d.prioridad;
        if(d.supervisor) document.getElementById('supervisor').value = d.supervisor;
        if(d.encargado) document.getElementById('encargado').value = d.encargado;
        if(d.tipoTarea) document.getElementById('tipoTarea').value = d.tipoTarea;
        if(d.estado) document.getElementById('estado').value = d.estado;
      }catch(_){}
    }
  })();

  // Overlay login
  document.getElementById('loginOverlay').style.display='flex';
});
