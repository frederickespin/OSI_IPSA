
/* OSI IPSA - Encargado (build fix1: fecha y OSI visibles, selects llenos,
   selector de personal funcional, horarios y cabeceras sin encimar,
   +Materiales operativo, barra inferior uniforme, "Nueva OSI" arriba)
*/
document.addEventListener('DOMContentLoaded', () => {
   * ========= CONFIG ========= */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpHs5Soi5PoqhIq0io63S2xyA7a73YvbVXDVvX5lSbKEyi0D4WgZXc93GoJFcU2JwAVA/exec'; // <-- Pega tu URL /exec
  const OSI_TOKEN  = '09oilmh78uyt65rfvcd326eswfnbcdawq16543890lkoijyhgtrfde';          // <-- Mismo TOKEN del GAS

  /* === KEYS === */
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const MATS_KEY='osi-mats-v1';
  const REPORTS_KEY='osi-reports-v1';
  const SEQ_KEY='osi-seq';
  const DRAFT_PREFIX='osi-draft-';
  const HIST_KEY='osi-hist-v1';

  /* === Shortcuts === */
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
  const pad=(n,w)=>String(n).padStart(w,'0');

  /* === Fecha del día (iOS-friendly) === */
  const today = () => {
    const d=new Date();
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`; // formato que acepta <input type="date">
  };
  function setToday(){
    const f=$('fecha');
    if(f){ const t=today(); f.value=t; f.min=t; f.max=t; }
  }

  /* === Numeración OSI visible === */
  const currentSeq=()=> parseInt(localStorage.getItem(SEQ_KEY)||'0',10);
  const formatId=n=>'OSI-'+pad(n,5);
  function showNext(){ const n=currentSeq()+1; if($('num')) $('num').value=formatId(n); }
  function bumpSeqFromVisible(){
    const v=$('num')?.value||''; const m=v.match(/^OSI-(\d+)$/);
    if(m){ const n=+m[1]; if(n>currentSeq()) localStorage.setItem(SEQ_KEY,String(n)); }
  }

  /* === Toast === */
  const toast = (msg) => { const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600); };

  /* === Sesión 5 min inactividad === */
  const IDLE_MS=5*60*1000; let idleTimer=null;
  function resetIdle(){ if(idleTimer) clearTimeout(idleTimer); idleTimer=setTimeout(()=>{ try{sessionStorage.removeItem('enc-session');}catch(_){ } alert('Sesión cerrada por inactividad (5 min)'); location.replace('login.html'); }, IDLE_MS); }
  ['click','keydown','mousemove','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,resetIdle,{passive:true}));
  resetIdle();

  /* === Roles / Personal === */
  const CORE_ROLES=['Encargado','Supervisor'];
  function ensureRoles(){
    let roles=ls(ROLES_KEY);
    if(!Array.isArray(roles)||!roles.length) roles=['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
    CORE_ROLES.forEach(r=>{ if(!roles.includes(r)) roles.unshift(r); });
    roles=[...new Set(roles.map(r=>String(r).trim()).filter(Boolean))];
    ls(ROLES_KEY,roles);
    return roles;
  }
  if(!ls(CAT_KEY)){
    ls(CAT_KEY,[
      {num:'E-010',nombre:'Ana Encargada',roles:['Encargado'],activo:true},
      {num:'S-020',nombre:'Samuel Supervisor',roles:['Supervisor'],activo:true},
      {num:'C-100',nombre:'Carlos Chofer',roles:['Chofer','Operario'],activo:true},
      {num:'E-200',nombre:'Elena Empacadora',roles:['Empacador','Operario'],activo:true},
      {num:'M-300',nombre:'Mario Mecánico',roles:['Mecánico','Operario'],activo:true},
      {num:'K-400',nombre:'Karla Carpintera',roles:['Carpintero','Operario'],activo:true}
    ]);
  }
  const getCat=()=>ls(CAT_KEY)||[];
  const setCat=a=>ls(CAT_KEY,a);
  function byRole(r){ return getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(r)); }
  function fillSelectByRole(id, role){
    const el=$(id); if(!el) return;
    const list=byRole(role);
    el.innerHTML='<option value="">—</option>'+list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){ fillSelectByRole('encargado','Encargado'); fillSelectByRole('supervisor','Supervisor'); }

  /* === Materiales (Ítem + Cantidad) === */
  const mats=()=>ls(MATS_KEY)||[];
  const setMats=a=>ls(MATS_KEY,a);
  function ensureOneMat(){ if(mats().length===0) setMats([{item:'',cant:''}]); }
  function renderMats(){
    ensureOneMat();
    const tb=$('tbMat'); if(!tb) return; tb.innerHTML='';
    mats().forEach((m,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td><input class="tbl-input" data-m="${i}" data-k="item" value="${m.item||''}" placeholder="Ítem"></td>
        <td style="width:160px"><input class="tbl-input" data-m="${i}" data-k="cant" value="${m.cant||''}" placeholder="Cantidad"></td>`;
      tb.appendChild(tr);
    });
  }
  $('matAdd')?.addEventListener('click',()=>{ const a=mats(); a.push({item:'',cant:''}); setMats(a); renderMats(); saveDraft(); });
  document.addEventListener('input',e=>{
    if(e.target.hasAttribute('data-m')){
      const i=+e.target.getAttribute('data-m'); const k=e.target.getAttribute('data-k');
      const a=mats(); if(!a[i]) return; a[i][k]=e.target.value; setMats(a); saveDraft();
    }
  });

  /* === Modal selección personal (desde ESTE formulario) === */
  const modal=$('modalGestion'), empRolesSel=$('empRolesSel'), tb=$('tbPersonal');
  function fillRolesMulti(sel, selected){ const roles=ensureRoles(); const set=new Set(selected||[]); sel.innerHTML=roles.map(r=>`<option value="${r}" ${set.has(r)?'selected':''}>${r}</option>`).join(''); }
  function renderTabla(filter=''){
    const q=(filter||'').toLowerCase(); tb.innerHTML='';
    getCat().forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const rolesBadges=(p.roles||[]).map(r=>`<span class="badge badge-role">${r}</span>`).join(' ');
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input class="sm selPick" type="checkbox" data-i="${i}" ${p.picked?'checked':''}></td>
        <td class="empCell"><span class="empCode">${p.num}</span> <input class="tbl-input empName" data-i="${i}" data-k="nombre" value="${p.nombre||''}" style="max-width:240px"></td>
        <td class="col-roles">${rolesBadges}<br><small class="sub">(edita roles al agregar)</small></td>
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>`;
      tb.appendChild(tr);
    });
  }
  $('navGestion')?.addEventListener('click',()=>{ modal.style.display='flex'; fillRolesMulti(empRolesSel,[]); renderTabla(); });
  $('gCerrar')?.addEventListener('click',()=>{ modal.style.display='none'; });
  $('gAplicar')?.addEventListener('click',()=>{ modal.style.display='none'; showAsignados(); saveDraft(); });
  $('empAgregar')?.addEventListener('click',()=>{
    const num=$('empNum').value.trim(), nombre=$('empNombre').value.trim();
    const roles=[...empRolesSel.selectedOptions].map(o=>o.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe ese No.');
    cat.push({num,nombre,roles,activo:true}); setCat(cat);
    $('empNum').value=''; $('empNombre').value=''; [...empRolesSel.options].forEach(o=>o.selected=false);
    renderTabla(); refreshEncSup();
  });
  $('busca')?.addEventListener('input',e=>renderTabla(e.target.value||''));
  document.addEventListener('change',e=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.classList.contains('selPick')){ cat[idx].picked=e.target.checked; setCat(cat); saveDraft(); return; }
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox') cat[idx][k]=e.target.checked; else cat[idx][k]=e.target.value;
      setCat(cat);
    }
  });
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

  /* === Reporte local y nube === */
  const getReports=()=>ls(REPORTS_KEY)||{};
  const setReports=m=>ls(REPORTS_KEY,m);
  function refreshReportStatus(){
    const id=($('num')?.value||'').trim(); const rep=getReports()[id];
    const st=$('reportStatus'), vr=$('viewReport'), cr=$('printReport');
    if(!st) return;
    if(rep){ st.textContent=`Reporte del supervisor recibido (${new Date(rep.timestamp||Date.now()).toLocaleString()}).`; vr.style.display=cr.style.display='inline-block'; }
    else { st.textContent='Sin reporte importado aún.'; vr.style.display=cr.style.display='none'; }
  }
  $('pullCloud')?.addEventListener('click', async ()=>{
    const id=($('num')?.value||'').trim(); if(!id) return;
    try{
      const url = `${SCRIPT_URL}?osiId=${encodeURIComponent(id)}&token=${encodeURIComponent(OSI_TOKEN)}`;
      const r = await fetch(url); const j=await r.json();
      if(j.ok && j.found){ const map=getReports(); map[id]=j.report; setReports(map); refreshReportStatus(); toast('Reporte sincronizado'); }
      else toast('Sin reporte en nube aún');
    }catch(_){ toast('Error al sincronizar'); }
  });
  $('viewReport')?.addEventListener('click',()=>{
    const id=($('num')?.value||'').trim(); const rep=getReports()[id]; if(!rep) return alert('No hay reporte cargado');
    const imgs=(rep.photos||[]).map(src=>`<img src="${src}" style="max-width:260px;max-height:260px;margin:6px;border:1px solid #ddd;border-radius:8px">`).join('');
    const html=`<title>Reporte ${rep.osiId}</title><body style="font-family:system-ui"><h2>Reporte del supervisor — ${rep.osiId}</h2>
      <p><b>Fecha:</b> ${rep.fecha} &nbsp; <b>Supervisor:</b> ${rep.supervisor?.nombre||rep.supervisor?.num||''}</p>
      <h3>Resumen</h3><pre style="white-space:pre-wrap">${rep.summary||''}</pre>
      <h3>Realizado</h3><pre style="white-space:pre-wrap">${rep.done||''}</pre>
      <h3>Incidencias</h3><pre style="white-space:pre-wrap">${rep.issues||''}</pre>
      <h3>Fotos</h3><div>${imgs||'<i>Sin fotos</i>'}</div></body>`;
    const w=window.open('','_blank'); w.document.write(html); w.document.close();
  });
  $('printReport')?.addEventListener('click',()=>{ window.print(); });

  /* === Construcción de enlace para supervisor (iOS-safe) === */
  const b64u={enc:s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
  function buildPayload(){
    const getName=num=>{ const p=getCat().find(x=>x.num===num); return p? p.nombre:''; };
    return {
      id: ($('num')?.value||'').trim(),
      fecha: $('fecha')?.value||today(),
      prioridad: $('prioridad')?.value||'Media',
      iniHora: $('iniHora')?.value||'',
      finHora: $('finHora')?.value||'',
      desc: $('desc')?.value||'',
      encargado:{ num:$('encargado')?.value||'', nombre:getName($('encargado')?.value||'') },
      supervisor:{ num:$('supervisor')?.value||'', nombre:getName($('supervisor')?.value||'') },
      materiales: mats().filter(m=>(m.item||'').trim()),
      asignados: getCat().filter(p=>p.picked).map(p=>({num:p.num, nombre:p.nombre, roles:p.roles||[]})),
      v:'iphone_ok'
    };
  }
  function supURL(p){ const d=b64u.enc(JSON.stringify(p)); const base=new URL('.',location.href); return new URL('supervisor.html?d='+d, base).href; }
  async function copyLink(){
    bumpSeqFromVisible();
    const url=supURL(buildPayload());
    try{ await navigator.clipboard.writeText(url); toast('Enlace copiado'); }catch(_){ alert(url); }
  }
  function shareLink(){
    bumpSeqFromVisible();
    const p=buildPayload(); const url=supURL(p);
    const text=`OSI ${p.id} — instrucciones de hoy (${p.fecha})\nSupervisor: ${p.supervisor.nombre||p.supervisor.num}\n${url}`;
    if(navigator.share){ navigator.share({title:`OSI ${p.id}`, text, url}).catch(()=>{}); }
    else { window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank'); }
  }
  $('navCopy')?.addEventListener('click',copyLink);
  $('navShare')?.addEventListener('click',shareLink);

  /* === Borrador / Historial (básico) === */
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
  }
  function restoreDraftOrFresh(){
    setToday(); showNext(); refreshEncSup(); renderMats(); // base
    const id=$('num')?.value?.trim(); const raw=id && localStorage.getItem(DRAFT_PREFIX+id);
    if(raw){ try{
      const d=JSON.parse(raw);
      if(d.fecha) $('fecha').value=d.fecha;
      $('prioridad').value=d.prioridad||'Baja';
      $('iniHora').value=d.iniHora||''; $('finHora').value=d.finHora||'';
      $('desc').value=d.desc||'';
      if(d.encargado) $('encargado').value=d.encargado;
      if(d.supervisor) $('supervisor').value=d.supervisor;
      if(Array.isArray(d.materiales)) ls(MATS_KEY,d.materiales);
      if(Array.isArray(d.asignados)){ const cat=getCat().map(p=>({...p,picked:d.asignados.includes(p.num)})); setCat(cat); }
      renderMats(); showAsignados();
    }catch(_){ /* ignora */ } }
  }

  /* === Nueva OSI === */
  function newOSI(){
    showNext(); setToday();
    $('prioridad').value='Baja'; $('iniHora').value=''; $('finHora').value=''; $('desc').value='';
    $('encargado').value=''; $('supervisor').value='';
    setMats([{item:'',cant:''}]); renderMats();
    setCat(getCat().map(p=>({...p,picked:false}))); showAsignados();
    saveDraft();
    toast('Nueva OSI preparada');
  }
  $('newOsiBtn')?.addEventListener('click',newOSI);

  /* === Auto-guardado de campos ===== */
  ['fecha','prioridad','iniHora','finHora','desc','encargado','supervisor'].forEach(id=>{
    const el=$(id); if(!el) return;
    const ev=(id==='desc')?'input':'change';
    el.addEventListener(ev,saveDraft);
  });

  /* === INIT === */
  ensureRoles(); refreshEncSup(); setToday(); showNext(); renderMats(); showAsignados(); refreshReportStatus(); restoreDraftOrFresh();
});
