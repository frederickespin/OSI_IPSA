document.addEventListener('DOMContentLoaded',()=>{

  /* ============================
     CONFIGURACIÓN DEL ENDPOINT
     (rellena estos 2 valores)
     ============================ */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpHs5Soi5PoqhIq0io63S2xyA7a73YvbVXDVvX5lSbKEyi0D4WgZXc93GoJFcU2JwAVA/exec'; // <-- Pega aquí tu URL /exec
  const OSI_TOKEN  = '09oilmh78uyt65rfvcd326eswfnbcdawq16543890lkoijyhgtrfde';          // <-- Igual al TOKEN del GAS

  /* ===== Claves de storage ===== */
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  const MATS_KEY='osi-mats-v1';
  const REPORTS_KEY='osi-reports-v1';
  const SEQ_KEY='osi-seq';
  const CURR_KEY='osi-current-id';
  const DRAFT_PREFIX='osi-draft-';
  const HIST_KEY='osi-hist-v1';

  /* ===== Helpers ===== */
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  /* ===== Sesión: 1 min de inactividad ===== */
  let idleTimer=null;
  function resetIdle(){
    if(idleTimer) clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{
      try{sessionStorage.removeItem('enc-session');}catch(_){}
      alert('Sesión cerrada por inactividad.');
      location.replace('login.html');
    }, 60*1000);
  }
  ['click','keydown','mousemove','touchstart','scroll'].forEach(ev=>document.addEventListener(ev, resetIdle, {passive:true}));
  resetIdle();
  $('logoutBtn')?.addEventListener('click',()=>{ sessionStorage.removeItem('enc-session'); location.replace('login.html'); });

  /* ===== Utilidades ===== */
  const b64u={ enc:s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') };
  const today=()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const setToday=()=>{ const t=today(); const f=$('fecha'); if(f){f.value=t; f.min=t; f.max=t;} };
  setToday(); setTimeout(setToday,80);
  const pad=(n,w)=>String(n).padStart(w,'0');
  const toast=(msg)=>{ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500); };

  /* ===== Numeración / ID actual ===== */
  function currentSeq(){ return parseInt(localStorage.getItem(SEQ_KEY)||'3',10); }
  function setSeq(n){ localStorage.setItem(SEQ_KEY, String(n)); }
  function setCurrentId(id){ localStorage.setItem(CURR_KEY,id); }
  function getCurrentId(){ return localStorage.getItem(CURR_KEY); }
  function showNum(id){ $('num').value=id || 'OSI-'+pad(currentSeq(),5); }

  /* ===== Roles ===== */
  function ensureRoles(){
    let roles=ls(ROLES_KEY);
    if(!Array.isArray(roles)||roles.length===0){
      roles=['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
    }else{
      CORE_ROLES.forEach(r=>{ if(!roles.includes(r)) roles.unshift(r); });
      if(!roles.includes('Mantenimiento')) roles.push('Mantenimiento');
      roles=[...new Set(roles.map(r=>String(r).trim()).filter(Boolean))];
    }
    ls(ROLES_KEY,roles); return roles;
  }
  const getRoles=()=>ensureRoles();

  /* ===== Catálogo de personal ===== */
  function getCat(){ return ls(CAT_KEY)||[] }
  function setCat(a){ ls(CAT_KEY,a); }

  if(!ls(CAT_KEY)){
    setCat([
      {num:'E-010', nombre:'Ana Encargada', roles:['Encargado'], activo:true},
      {num:'S-020', nombre:'Samuel Supervisor', roles:['Supervisor'], activo:true},
      {num:'C-100', nombre:'Carlos Chofer', roles:['Chofer','Operario'], activo:true},
      {num:'E-200', nombre:'Elena Empacadora', roles:['Empacador','Operario'], activo:true},
      {num:'M-300', nombre:'Mario Mecánico', roles:['Mecánico','Operario'], activo:true},
      {num:'K-400', nombre:'Karla Carpintera', roles:['Carpintero','Operario'], activo:true},
      {num:'MT-500', nombre:'Miguel Mantenimiento', roles:['Mantenimiento','Operario'], activo:true},
      {num:'V-101', nombre:'Víctor Mantenimiento', roles:['Mantenimiento','Operario'], activo:true},
      {num:'F-01',  nombre:'Freder Encargado', roles:['Encargado'], activo:true}
    ]);
  }

  function byRole(role){ return getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role)); }
  function fillSelectByRole(id, role){
    const sel=$(id); if(!sel) return;
    const list=byRole(role);
    sel.innerHTML='<option value="">—</option>'+list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){ fillSelectByRole('encargado','Encargado'); fillSelectByRole('supervisor','Supervisor'); }

  /* ===== Materiales ===== */
  function mats(){ return ls(MATS_KEY)||[] }
  function setMats(a){ ls(MATS_KEY,a) }
  function ensureOneRow(){ const a=mats(); if(a.length===0){ setMats([{item:'',cant:''}]); } }
  function renderMats(){
    ensureOneRow();
    const tb=$('tbMat'); if(!tb) return; tb.innerHTML='';
    mats().forEach((m,i)=>{
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td><input class="tbl-input" data-m="${i}" data-k="item" value="${m.item||''}"></td>
        <td style="width:160px"><input class="tbl-input" data-m="${i}" data-k="cant" value="${m.cant||''}"></td>`;
      tb.appendChild(tr);
    });
  }
  $('matAdd')?.addEventListener('click',()=>{ const a=mats(); a.push({item:'',cant:''}); setMats(a); renderMats(); saveDraft(); });
  document.addEventListener('input',(e)=>{
    if(e.target.hasAttribute('data-m')){
      const i=+e.target.getAttribute('data-m'); const k=e.target.getAttribute('data-k');
      const a=mats(); if(!a[i]) return; a[i][k]=e.target.value; setMats(a); saveDraft();
    }
  });

  /* ===== Modal gestión de personal ===== */
  const modalGest=$('modalGestion'), empRolesSel=$('empRolesSel'), tb=$('tbPersonal');

  function fillRolesMulti(selEl, selected){
    const roles=getRoles(); const set=new Set(selected||[]);
    selEl.innerHTML=roles.map(r=>`<option value="${r}" ${set.has(r)?'selected':''}>${r}</option>`).join('');
  }

  function renderTabla(filter=''){
    const cat=getCat(); const q=(filter||'').toLowerCase(); tb.innerHTML='';
    cat.forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const rolesBadges=(p.roles||[]).map(r=>`<span class="badge badge-role">${r}</span>`).join(' ');
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input class="sm selPick" type="checkbox" data-i="${i}" ${p.picked?'checked':''}></td>
        <td class="empCell">
          <span class="empCode">${p.num||''}</span>
          <input class="tbl-input empName" data-i="${i}" data-k="nombre" value="${p.nombre||''}">
        </td>
        <td class="col-roles">${rolesBadges}<br><small class="sub">(edita roles al agregar)</small></td>
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>`;
      tb.appendChild(tr);
    });
  }

  $('navGestion')?.addEventListener('click',()=>{ modalGest.style.display='flex'; fillRolesMulti(empRolesSel,[]); renderTabla(); });
  $('gCerrar')?.addEventListener('click',()=>{ modalGest.style.display='none'; });
  $('gAplicar')?.addEventListener('click',()=>{ modalGest.style.display='none'; showAsignados(); saveDraft(); });

  $('empAgregar')?.addEventListener('click',()=>{
    const num=$('empNum').value.trim(), nombre=$('empNombre').value.trim();
    const roles=[...empRolesSel.selectedOptions].map(o=>o.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo son obligatorios');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe un No. de empleado igual');
    cat.push({num,nombre,roles,activo:true}); setCat(cat);
    $('empNum').value=''; $('empNombre').value=''; [...empRolesSel.options].forEach(o=>o.selected=false);
    renderTabla(); refreshEncSup();
  });
  $('busca')?.addEventListener('input',e=>renderTabla(e.target.value||''));
  document.addEventListener('change',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.classList.contains('selPick')){ cat[idx].picked=e.target.checked; setCat(cat); saveDraft(); return; }
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox'){ cat[idx][k]=e.target.checked; } else { cat[idx][k]=e.target.value; }
      setCat(cat);
    }
  });

  /* ===== Resumen asignados ===== */
  function showAsignados(){
    const sel=getCat().filter(p=>p.picked);
    const ul=$('asignadosLista'), rs=$('asignadosResumen');
    if(!ul||!rs) return;
    ul.innerHTML = sel.map(p=>{
      const rol=(p.roles&&p.roles[0])?p.roles[0]:'—';
      return `<li>${p.num} — ${p.nombre} — <span class="badge badge-role">${rol}</span></li>`;
    }).join('');
    rs.textContent = sel.length? (sel.length+' seleccionado(s)'):'';
  }

  /* ===== Historial ===== */
  function histAll(){ return ls(HIST_KEY)||[] }
  function histUpsert(rec){
    const all=histAll().filter(x=>x.id!==rec.id); all.push({...rec, updatedAt:Date.now()});
    ls(HIST_KEY, all.sort((a,b)=>String(a.id).localeCompare(String(b.id))));
  }

  /* ===== Autosave por OSI ===== */
  function saveDraft(){
    const id=$('num')?.value?.trim(); if(!id) return;
    const draft={
      id,
      fecha:$('fecha')?.value,
      prioridad:$('prioridad')?.value,
      iniHora:$('iniHora')?.value,
      finHora:$('finHora')?.value,
      desc:$('desc')?.value,
      encargado:$('encargado')?.value,
      supervisor:$('supervisor')?.value,
      materiales:mats(),
      asignados:getCat().filter(p=>p.picked).map(p=>p.num),
      ts:Date.now()
    };
    localStorage.setItem(DRAFT_PREFIX+id, JSON.stringify(draft));
    setCurrentId(id);
    histUpsert({
      id,
      fecha:draft.fecha,
      prioridad:draft.prioridad,
      encargado:draft.encargado, supervisor:draft.supervisor,
      personal:(draft.asignados||[]).length,
      estado:(getReports()[id]?'Con reporte':'Borrador')
    });
  }
  function restoreDraft(){
    const cid=getCurrentId();
    if(cid){ showNum(cid); } else { showNum(); }
    refreshEncSup();

    const id=$('num')?.value?.trim();
    const raw=id && localStorage.getItem(DRAFT_PREFIX+id);
    if(raw){
      try{
        const d=JSON.parse(raw);
        if(d.fecha) $('fecha').value=d.fecha;
        if(d.prioridad) $('prioridad').value=d.prioridad;
        $('iniHora').value=d.iniHora||'';
        $('finHora').value=d.finHora||'';
        $('desc').value=d.desc||'';
        if(d.encargado) $('encargado').value=d.encargado;
        if(d.supervisor) $('supervisor').value=d.supervisor;
        if(Array.isArray(d.materiales)){ ls(MATS_KEY,d.materiales); }
        if(Array.isArray(d.asignados)){
          const cat=getCat().map(p=>({...p, picked:d.asignados.includes(p.num)}));
          setCat(cat);
        }
      }catch(_){}
    }
    renderMats(); showAsignados();
  }

  /* ===== Enlace para supervisor ===== */
  function buildPayload(){
    const getNameByNum=num=>{ const p=getCat().find(x=>x.num===num); return p? p.nombre:''; };
    return {
      id: ($('num')?.value||'').trim(),
      fecha: $('fecha')?.value||today(),
      prioridad: $('prioridad')?.value||'Media',
      iniHora: $('iniHora')?.value||'',
      finHora: $('finHora')?.value||'',
      desc: $('desc')?.value||'',
      encargado:{ num:$('encargado')?.value||'', nombre:getNameByNum($('encargado')?.value||'') },
      supervisor:{ num:$('supervisor')?.value||'', nombre:getNameByNum($('supervisor')?.value||'') },
      materiales: mats().filter(m=>(m.item||'').trim()),
      asignados: getCat().filter(p=>p.picked).map(p=>({num:p.num, nombre:p.nombre, roles:p.roles||[]})),
      v:'gas1'
    };
  }
  function shareLink(){
    saveDraft();
    const p=buildPayload();
    if(!p.id) return alert('Falta el Nº OSI.');
    if(!p.supervisor.num) return alert('Selecciona un Supervisor.');
    const d=b64u.enc(JSON.stringify(p));
    const base=new URL('.',location.href);
const supURL=new URL('supervisor.html?d='+d, base).href;
    const text = `OSI ${p.id} — instrucciones de hoy (${p.fecha})\nSupervisor: ${p.supervisor.nombre||p.supervisor.num}\n${supURL}`;
    if(navigator.share){ navigator.share({title:`OSI ${p.id}`, text, url:supURL}).catch(()=>{}); }
    else { window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank'); }
    histUpsert({ id:p.id, fecha:p.fecha, prioridad:p.prioridad, encargado:p.encargado?.num, supervisor:p.supervisor?.num, personal:(p.asignados||[]).length, estado:'Enviada' });
  }
  async function copyLink(){
    saveDraft();
    const p=buildPayload();
    if(!p.id || !p.supervisor.num){ alert('Completa Nº OSI y Supervisor antes de copiar.'); return; }
    const d=b64u.enc(JSON.stringify(p));
const supURL=new URL('supervisor.html?d='+d, new URL('.',location.href)).href;

    try{ await navigator.clipboard.writeText(supURL); toast('Enlace copiado'); }
    catch(_){ const ta=document.createElement('textarea'); ta.value=supURL; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Enlace copiado'); }
    histUpsert({ id:p.id, fecha:p.fecha, prioridad:p.prioridad, encargado:p.encargado?.num, supervisor:p.supervisor?.num, personal:(p.asignados||[]).length, estado:'Enviada' });
  }

  /* ===== Reportes importados (local) ===== */
  function getReports(){ return ls(REPORTS_KEY)||{} }
  function setReports(m){ ls(REPORTS_KEY,m) }

  function openReportView(print=false){
    const id=($('num')?.value||'').trim(); const rep=getReports()[id]; if(!rep) return alert('No hay reporte cargado.');
    const imgs=(rep.photos||[]).map(src=>`<img src="${src}" style="max-width:260px;max-height:260px;margin:6px;border:1px solid #ddd;border-radius:8px">`).join('');
    const html=`<title>Reporte ${rep.osiId}</title><body style="font-family:system-ui,Segoe UI,Roboto,Arial">
      <h2>Reporte del supervisor — ${rep.osiId}</h2>
      <p><b>Fecha:</b> ${rep.fecha} &nbsp; <b>Supervisor:</b> ${rep.supervisor?.nombre||rep.supervisor?.num||''}</p>
      <h3>Resumen (original)</h3><pre style="white-space:pre-wrap">${rep.summary||''}</pre>
      <h3>Reporte de lo realizado</h3><pre style="white-space:pre-wrap">${rep.done||''}</pre>
      <h3>Situaciones / Incidencias</h3><pre style="white-space:pre-wrap">${rep.issues||''}</pre>
      <h3>Fotos</h3><div>${imgs||'<i>Sin fotos</i>'}</div>
      <script>window.onload=function(){ ${print?'setTimeout(()=>window.print(),300);':''} }<\/script>
      </body>`;
    const win=window.open('','_blank'); win.document.write(html); win.document.close();
  }
  function refreshReportStatus(){
    const id=($('num')?.value||'').trim(); const rep=getReports()[id];
    const st=$('reportStatus'), vr=$('viewReport'), cr=$('clearReport'), pr=$('printReport');
    if(!st||!vr||!cr||!pr) return;
    if(rep){
      st.textContent=`Reporte del supervisor recibido (${new Date(rep.timestamp||Date.now()).toLocaleString()}).`;
      vr.style.display=cr.style.display=pr.style.display='inline-block';
      const d=JSON.parse(localStorage.getItem(DRAFT_PREFIX+id)||'{}');
      histUpsert({ id, fecha:d.fecha||today(), prioridad:d.prioridad||'Media', encargado:d.encargado||'', supervisor:d.supervisor||'', personal:(d.asignados||[]).length||0, estado:'Con reporte' });
    } else {
      st.textContent='Sin reporte importado aún.';
      vr.style.display=cr.style.display=pr.style.display='none';
    }
  }
  $('importReport')?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const rep=JSON.parse(await f.text());
      if(!rep||!rep.osiId) return alert('Archivo inválido');
      const map=getReports(); map[rep.osiId]=rep; setReports(map); refreshReportStatus(); alert('Reporte importado correctamente.'); e.target.value='';
    }catch(err){ alert('Error leyendo el archivo: '+err.message); }
  });
  $('clearReport')?.addEventListener('click',()=>{
    const id=($('num')?.value||'').trim(); if(!id) return;
    if(confirm('¿Eliminar el reporte importado para '+id+'?')){ const map=getReports(); delete map[id]; setReports(map); refreshReportStatus(); }
  });
  $('viewReport')?.addEventListener('click',()=>openReportView(false));
  $('printReport')?.addEventListener('click',()=>openReportView(true));

  /* ===== Sincronizar desde la nube (GAS) ===== */
  async function pullFromCloud(){
    const id = ($('num')?.value||'').trim();
    if(!id){ alert('Nº OSI vacío.'); return; }
    try{
      const url = `${SCRIPT_URL}?osiId=${encodeURIComponent(id)}&token=${encodeURIComponent(OSI_TOKEN)}`;
      const res = await fetch(url, { method:'GET' });
      const j   = await res.json();
      if(j.ok && j.found){
        const map = getReports(); map[id] = j.report; setReports(map);
        refreshReportStatus();
        alert('Reporte sincronizado correctamente.');
      }else if(j.ok && !j.found){
        alert('Aún no hay reporte en la nube para '+id);
      }else{
        throw new Error(j.error || 'Error desconocido');
      }
    }catch(err){
      alert('Error al sincronizar: '+err.message);
    }
  }

  /* ===== Nueva OSI ===== */
  function newOSI(){
    setSeq(currentSeq()+1); const id='OSI-'+pad(currentSeq(),5); showNum(id); setCurrentId(id);
    setMats([{item:'',cant:''}]); renderMats();
    const cat=getCat().map(p=>({...p, picked:false})); setCat(cat); showAsignados();
    $('iniHora').value=''; $('finHora').value=''; $('desc').value=''; $('prioridad').value='Baja'; setToday();
    $('reportStatus') && ( $('reportStatus').textContent='Sin reporte importado aún.' );
    localStorage.removeItem(DRAFT_PREFIX+id); saveDraft();
    histUpsert({ id, fecha:today(), prioridad:'Baja', encargado:'', supervisor:'', personal:0, estado:'Borrador' });
  }

  /* ===== Eventos ===== */
  $('navShare')?.addEventListener('click',shareLink);
  $('navCopy')?.addEventListener('click',copyLink);
  $('navPrint')?.addEventListener('click',()=>window.print());
  $('navConfig')?.addEventListener('click',()=>{ location.href='settings.html'; });
  $('newOsiBtn')?.addEventListener('click',newOSI);
  $('pullCloud')?.addEventListener('click',pullFromCloud);

  ['prioridad','iniHora','finHora','desc','encargado','supervisor'].forEach(id=>{
    const el=$(id);
    if(!el) return;
    el.addEventListener('change',saveDraft);
    if(id==='desc') el.addEventListener('input',saveDraft);
  });

  /* ===== Init ===== */
  ensureRoles();
  restoreDraft();
  renderMats();
  showAsignados();
  refreshEncSup();
  refreshReportStatus();
});

