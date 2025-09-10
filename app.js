 // app_vfix4b.js — build fix4b
// - Fecha automática robusta (iOS / zona horaria local)
// - Nº OSI robusto (preview, commit y persistencia)
// - Encargado/Supervisor desde personal (semilla si está vacío)
// - Selector de personal en modal (sin duplicar funciones)
// - Materiales (Ítem + Cantidad) con “+ Agregar ítem”
// - Copiar/Compartir enlace para Supervisor (payload ?d= base64url)
// - “Nueva OSI” en la parte superior que reserva el siguiente número

document.addEventListener('DOMContentLoaded', () => {

 * ========= CONFIG ========= */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpHs5Soi5PoqhIq0io63S2xyA7a73YvbVXDVvX5lSbKEyi0D4WgZXc93GoJFcU2JwAVA/exec'; // <-- Pega tu URL /exec
  const OSI_TOKEN  = '09oilmh78uyt65rfvcd326eswfnbcdawq16543890lkoijyhgtrfde';          // <-- Mismo TOKEN del GAS

  /* ========= Utilidades ========= */
  const $ = id => document.getElementById(id);
  const ls = (k, v) => v === undefined
    ? JSON.parse(localStorage.getItem(k) || 'null')
    : (localStorage.setItem(k, JSON.stringify(v)), v);
  const pad = (n, w) => String(n).padStart(w, '0');

  /* ========= Fecha del día (robusto iOS / TZ local) ========= */
  const localISODate = (d = new Date()) => {
    const tz = d.getTimezoneOffset() * 60000;              // desfase en ms
    return new Date(d.getTime() - tz).toISOString().slice(0, 10); // YYYY-MM-DD
  };

  const setToday = (force = false) => {
    const f = $('fecha');
    if (!f) return;
    const t = localISODate();
    if (force || !f.value) f.value = t;   // escribe la fecha si está vacía o si se fuerza
    f.setAttribute('min', t);
    f.setAttribute('max', t);
  };

  // Salvaguardas extra para iOS (si el input quedó vacío tras render)
  $('fecha')?.addEventListener('blur', () => {
    if (!$('fecha').value) setToday(true);
  });
  requestAnimationFrame(() => {
    if ($('fecha') && !$('fecha').value) setToday(true);
  });

  /* ========= Nº OSI robusto (persistente y a prueba de caché) ========= */
  const SEQ_KEY = 'osi-seq-v2';
  const OSI_INPUT_ID = 'num';
  const OSI_PREFIX = 'OSI-';

  const currentSeq = () => Number(localStorage.getItem(SEQ_KEY) || '0');
  const setSeq     = (n) => localStorage.setItem(SEQ_KEY, String(n));
  const fmt        = (n) => OSI_PREFIX + String(n).padStart(5, '0');

  // Muestra SIEMPRE el próximo número si el campo está vacío o mal formado
  function previewNextOSI() {
    const el = $(OSI_INPUT_ID);
    if (!el) return;
    if (!el.value || !/^OSI-\d{5}$/.test(el.value)) {
      el.value = fmt(currentSeq() + 1);
    }
  }

  // Confirma (incrementa y guarda) un nuevo número y lo pone en pantalla
  function commitNextOSI() {
    const n = currentSeq() + 1;
    setSeq(n);
    const el = $(OSI_INPUT_ID);
    if (el) el.value = fmt(n);
    return n;
  }

  // Si ya hay un número visible mayor al guardado, lo sincroniza a disco
  function ensureSeqFromVisible() {
    const el = $(OSI_INPUT_ID); if (!el) return;
    const m = (el.value || '').match(/^OSI-(\d{5})$/);
    if (m) {
      const n = Number(m[1]);
      if (n > currentSeq()) setSeq(n);
    }
  }

  /* ========= Roles / Personal ========= */
  const ROLES_KEY = 'osi-roles-master-v1';
  const CAT_KEY   = 'osi-personal-v1';
  const CORE_ROLES = ['Encargado', 'Supervisor'];

  function ensureRoles() {
    let roles = ls(ROLES_KEY);
    if (!Array.isArray(roles) || !roles.length) {
      roles = ['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
    }
    CORE_ROLES.forEach(r => { if (!roles.includes(r)) roles.unshift(r); });
    roles = [...new Set(roles.map(r => String(r).trim()).filter(Boolean))];
    ls(ROLES_KEY, roles);
    return roles;
  }

  if (!ls(CAT_KEY)) {
    ls(CAT_KEY, [
      {num:'E-010', nombre:'Ana Encargada',     roles:['Encargado'],             activo:true},
      {num:'S-020', nombre:'Samuel Supervisor', roles:['Supervisor'],            activo:true},
      {num:'C-100', nombre:'Carlos',            roles:['Chofer','Operario'],     activo:true},
      {num:'E-200', nombre:'Elena',             roles:['Empacador','Operario'],  activo:true},
      {num:'M-300', nombre:'Mario',             roles:['Mecánico','Operario'],   activo:true},
      {num:'K-400', nombre:'Karla',             roles:['Carpintero','Operario'], activo:true}
    ]);
  }

  const getCat = () => ls(CAT_KEY) || [];
  const setCat = (a) => ls(CAT_KEY, a);

  function optionsByRole(role) {
    const list = getCat().filter(p => p.activo !== false && (p.roles || []).includes(role));
    return '<option value="">—</option>' + list.map(p => `<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }

  function refreshEncSup() {
    if ($('encargado')) $('encargado').innerHTML = optionsByRole('Encargado');
    if ($('supervisor')) $('supervisor').innerHTML = optionsByRole('Supervisor');
  }

  /* ========= Materiales (Ítem + Cantidad) ========= */
  const MATS_KEY = 'osi-mats-v1';
  const mats    = () => ls(MATS_KEY) || [];
  const setMats = (a) => ls(MATS_KEY, a);

  function ensureOneMat() {
    if (mats().length === 0) setMats([{ item:'', cant:'' }]);
  }

  function renderMats() {
    ensureOneMat();
    const tb = $('tbMat'); if (!tb) return;
    tb.innerHTML = '';
    mats().forEach((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input class="tbl-input" data-m="${i}" data-k="item" value="${m.item||''}" placeholder="Ítem"></td>
        <td style="width:160px"><input class="tbl-input" data-m="${i}" data-k="cant" value="${m.cant||''}" placeholder="Cantidad"></td>`;
      tb.appendChild(tr);
    });
  }

  $('matAdd')?.addEventListener('click', () => {
    const a = mats();
    a.push({ item:'', cant:'' });
    setMats(a);
    renderMats();
  });

  document.addEventListener('input', (e) => {
    if (e.target.hasAttribute('data-m')) {
      const i = +e.target.getAttribute('data-m');
      const k = e.target.getAttribute('data-k');
      const a = mats(); if (!a[i]) return;
      a[i][k] = e.target.value;
      setMats(a);
    }
  });

  /* ========= Selector de personal (modal) ========= */
  const modal      = $('modalGestion');
  const tbPersonal = $('tbPersonal');
  const rolesSel   = $('empRolesSel');

  function fillRolesMulti(sel, selected) {
    const roles = ensureRoles();
    const set = new Set(selected || []);
    sel.innerHTML = roles.map(r => `<option value="${r}" ${set.has(r) ? 'selected' : ''}>${r}</option>`).join('');
  }

  function renderTabla(filter='') {
    const q = (filter || '').toLowerCase();
    tbPersonal.innerHTML = '';
    getCat().forEach((p, i) => {
      if (q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const rolesBadges = (p.roles || []).map(r => `<span class="badge badge-role">${r}</span>`).join(' ');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center"><input class="sm selPick" type="checkbox" data-i="${i}" ${p.picked?'checked':''}></td>
        <td class="empCell"><span class="empCode">${p.num}</span> <input class="tbl-input empName" data-i="${i}" data-k="nombre" value="${p.nombre||''}" style="max-width:240px"></td>
        <td class="col-roles">${rolesBadges}<br><small class="sub">(edita roles al agregar)</small></td>
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>`;
      tbPersonal.appendChild(tr);
    });
  }

  $('navGestion')?.addEventListener('click', () => {
    if (!modal) return;
    modal.style.display = 'flex';
    fillRolesMulti(rolesSel, []);
    renderTabla();
  });

  $('gCerrar')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
  $('gAplicar')?.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
    showAsignados();
  });

  $('empAgregar')?.addEventListener('click', () => {
    const num    = $('empNum').value.trim();
    const nombre = $('empNombre').value.trim();
    const roles  = [...rolesSel.selectedOptions].map(o => o.value);
    if (!num || !nombre || roles.length === 0) return alert('Número, Nombre y al menos un Cargo');
    const cat = getCat();
    if (cat.some(p => p.num === num)) return alert('Ya existe ese número');
    cat.push({num, nombre, roles, activo:true});
    setCat(cat);
    $('empNum').value = '';
    $('empNombre').value = '';
    [...rolesSel.options].forEach(o => o.selected = false);
    renderTabla();
    refreshEncSup();
  });

  $('busca')?.addEventListener('input', e => renderTabla(e.target.value || ''));

  document.addEventListener('change', (e) => {
    const i = e.target.getAttribute('data-i');
    if (i === null) return;
    const cat = getCat();
    const idx = parseInt(i, 10);
    if (!cat[idx]) return;

    if (e.target.classList.contains('selPick')) {
      cat[idx].picked = e.target.checked;
      setCat(cat);
      return;
    }
    if (e.target.hasAttribute('data-k')) {
      const k = e.target.getAttribute('data-k');
      if (e.target.type === 'checkbox') cat[idx][k] = e.target.checked;
      else cat[idx][k] = e.target.value;
      setCat(cat);
    }
  });

  function showAsignados() {
    const sel = getCat().filter(p => p.picked);
    const ul  = $('asignadosLista');
    const rs  = $('asignadosResumen');
    if (!ul || !rs) return;
    ul.innerHTML = sel.map(p => {
      const rol = (p.roles && p.roles[0]) ? p.roles[0] : '—';
      return `<li>${p.num} — ${p.nombre} — <span class="badge badge-role">${rol}</span></li>`;
    }).join('');
    rs.textContent = sel.length ? (sel.length + ' seleccionado(s)') : '';
  }

  /* ========= Copiar / Compartir enlace (iOS-safe) ========= */
  const toast = (m) => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1500); };
  const b64u  = { enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') };

  function buildPayload() {
    const nameByNum = num => { const p = getCat().find(x => x.num === num); return p ? p.nombre : ''; };
    return {
      id: $('num').value,
      fecha: $('fecha').value,
      prioridad: $('prioridad').value,
      iniHora: $('iniHora').value,
      finHora: $('finHora').value,
      desc: $('desc').value,
      encargado: { num: $('encargado').value, nombre: nameByNum($('encargado').value) },
      supervisor:{ num: $('supervisor').value, nombre: nameByNum($('supervisor').value) },
      materiales: mats().filter(m => (m.item || '').trim()),
      asignados: getCat().filter(p => p.picked).map(p => ({ num:p.num, nombre:p.nombre, roles:p.roles||[] })),
      v: 'fix4b'
    };
  }

  function supURL(p) {
    const d = b64u.enc(JSON.stringify(p));
    const base = new URL('.', location.href);
    return new URL('supervisor.html?d=' + d, base).href;
  }

  $('navCopy')?.addEventListener('click', async () => {
    ensureSeqFromVisible(); // guarda la previsualización si no se había confirmado
    const url = supURL(buildPayload());
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); }
    catch (_){ alert(url); }
  });

  $('navShare')?.addEventListener('click', () => {
    ensureSeqFromVisible();
    const p = buildPayload();
    const url = supURL(p);
    const text = `OSI ${p.id} — instrucciones de hoy (${p.fecha})\nSupervisor: ${p.supervisor.nombre || p.supervisor.num}\n${url}`;
    if (navigator.share) { navigator.share({ title:`OSI ${p.id}`, text, url }).catch(()=>{}); }
    else { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
  });

  /* ========= Nueva OSI (reserva número y limpia) ========= */
  function newOSI() {
    // Reserva y muestra un nuevo número de OSI
    commitNextOSI();

    // Restaura campos de hoy y limpia formulario
    setToday(true);
    $('prioridad').value = 'Baja';
    $('iniHora').value = '';
    $('finHora').value = '';
    $('desc').value = '';
    $('encargado').value = '';
    $('supervisor').value = '';

    // Materiales: deja 1 fila vacía
    setMats([{ item:'', cant:'' }]);
    renderMats();

    // Personal: desmarca selecciones
    setCat(getCat().map(p => ({ ...p, picked:false })));
    showAsignados();

    // Aviso
    toast('Nueva OSI preparada');
  }

  $('newOsiBtn')?.addEventListener('click', newOSI);

  /* ========= INIT ========= */
  ensureRoles();
  setToday(true);         // Fecha automática (bloquea a hoy)
  previewNextOSI();       // Muestra OSI-0000X en el campo
  refreshEncSup();        // Llena Encargado/Supervisor filtrado por cargo
  renderMats();           // Renderiza materiales
  showAsignados();        // Lista seleccionados
});

