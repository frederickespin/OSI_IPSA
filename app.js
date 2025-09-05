document.addEventListener('DOMContentLoaded',()=>{
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  const MATS_KEY='osi-mats-v1';
  const REPORTS_KEY='osi-reports-v1';
  const SEQ_KEY='osi-seq';
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  // ---- sesión (1 minuto de inactividad) ----
  let idleTimer=null;
  function resetIdle(){
    if(idleTimer) clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{ try{sessionStorage.removeItem('enc-session');}catch(_){}
      alert('Sesión cerrada por inactividad.');
      location.replace('login.html'); }, 60*1000);
  }
  ['click','keydown','mousemove','touchstart','scroll'].forEach(ev=>document.addEventListener(ev, resetIdle, {passive:true}));
  resetIdle();
  $('logoutBtn').onclick=()=>{ sessionStorage.removeItem('enc-session'); location.replace('login.html'); };

  // helpers
  const b64u={ enc:s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') };
  const today=()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const setToday=()=>{ const t=today(); const f=$('fecha'); if(f){f.value=t; f.min=t; f.max=t;} };
  setToday(); setTimeout(setToday,80);
  const pad=(n,w)=>String(n).padStart(w,'0');
  const toast=(msg)=>{ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500); };

  // numeración
  function currentSeq(){ return parseInt(localStorage.getItem(SEQ_KEY)||'3',10); }
  function setSeq(n){ localStorage.setItem(SEQ_KEY, String(n)); }
  function showNum(){ if($('num')) $('num').value='OSI-'+pad(currentSeq(),5); }
  showNum();

  // roles
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

  // catálogo
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

  // materiales
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
  $('matAdd').onclick=()=>{ const a=mats(); a.push({item:'',cant:''}); setMats(a); renderMats(); };
  document.addEventListener('input',(e)=>{
    if(e.target.hasAttribute('data-m')){
      const i=+e.target.getAttribute('data-m'); const k=e.target.getAttribute('data-k');
      const a=mats(); if(!a[i]) return; a[i][k]=e.target.value; setMats(a);
    }
  });

  // gestión / selección (modal)
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

  $('navGestion').onclick=()=>{ modalGest.style.display='flex'; fillRolesMulti(empRolesSel,[]); renderTabla(); };
  $('gCerrar').onclick=()=>{ modalGest.style.display='none'; };
  $('gAplicar').onclick=()=>{ modalGest.style.display='none'; showAsignados(); };

  $('empAgregar').onclick=()=>{
    const num=$('empNum').value.trim(), nombre=$('empNombre').value.trim();
    const roles=[...empRolesSel.selectedOptions].map(o=>o.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo son obligatorios');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe un No. de empleado igual');
    cat.push({num,nombre,roles,activo:true}); setCat(cat);
    $('empNum').value=''; $('empNombre').value=''; [...empRolesSel.options].forEach(o=>o.selected=false);
    renderTabla(); refreshEncSup();
  };
  $('busca').addEventListener('input',e=>renderTabla(e.target.value||''));

  document.addEventListener('change',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.classList.contains('selPick')){ cat[idx].picked=e.target.checked; setCat(cat); return; }
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox'){ cat[idx][k]=e.target.checked; } else { cat[idx][k]=e.target.value; }
      setCat(cat);
    }
  });

  // resumen asignados
  function showAsignados(){
    const sel=getCat().filter(p=>p.picked);
    const ul=$('asignadosLista'), rs=$('asignadosResumen');
    ul.innerHTML = sel.map(p=>{
      const rol=(p.roles&&p.roles[0])?p.roles[0]:'—';
      return `<li>${p.num} — ${p.nombre} — <span class="badge badge-role">${rol}</span></li>`;
    }).join('');
    rs.textContent = sel.length? (sel.length+' seleccionado(s)'):'';
  }

  // payload para supervisor
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
      v:'v1t'
    };
  }

  // compartir (usa HASH #d=...)
  function shareLink(){
    const p=buildPayload();
    if(!p.id) return alert('Falta el Nº OSI.');
    if(!p.supervisor.num) return alert('Selecciona un Supervisor.');
    const d=b64u.enc(JSON.stringify(p));
    const base=new URL('.',location.href);
    const supURL=new URL('supervisor.html#d='+d, base).href;
    const text = `OSI ${p.id} — instrucciones de hoy (${p.fecha})\nSupervisor: ${p.supervisor.nombre||p.supervisor.num}\n${supURL}`;
    if(navigator.share){ navigator.share({title:`OSI ${p.id}`, text, url:supURL}).catch(()=>{}); }
    else { window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank'); }
  }

  async function copyLink(){
    const p=buildPayload();
    if(!p.id || !p.supervisor.num){ alert('Completa Nº OSI y Supervisor antes de copiar.'); return; }
    const d=b64u.enc(JSON.stringify(p));
    const supURL=new URL('supervisor.html#d='+d, new URL('.',location.href)).href;
    try{ await navigator.clipboard.writeText(supURL); toast('Enlace copiado'); }
    catch(_){ const ta=document.createElement('textarea'); ta.value=supURL; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Enlace copiado'); }
  }

  // reportes importados
  function getReports(){ return ls(REPORTS_KEY)||{} }
  function setReports(m){ ls(REPORTS_KEY,m) }
  function refreshReportStatus(){
    const id=($('num')?.value||'').trim(); const rep=getReports()[id];
    const st=$('reportStatus'), vr=$('viewReport'), cr=$('clearReport');
    if(rep){ st.textContent=`Reporte del supervisor recibido (${new Date(rep.timestamp||Date.now()).toLocaleString()}).`; vr.style.display='inline-block'; cr.style.display='inline-block'; }
    else { st.textContent='Sin reporte importado aún.'; vr.style.display='none'; cr.style.display='none'; }
  }
  $('importReport').addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const rep=JSON.parse(await f.text());
      if(!rep||!rep.osiId) return alert('Archivo inválido');
      const map=getReports(); map[rep.osiId]=rep; setReports(map); refreshReportStatus(); alert('Reporte importado correctamente.'); e.target.value='';
    }catch(err){ alert('Error leyendo el archivo: '+err.message); }
  });
  $('clearReport').onclick=()=>{
    const id=($('num')?.value||'').trim(); if(!id) return;
    if(confirm('¿Eliminar el reporte importado para '+id+'?')){ const map=getReports(); delete map[id]; setReports(map); refreshReportStatus(); }
  };
  $('viewReport').onclick=()=>{
    const id=($('num')?.value||'').trim(); const rep=getReports()[id]; if(!rep) return alert('No hay reporte cargado.');
    const win=window.open('','_blank');
    const imgs=(rep.photos||[]).map(src=>`<img src="${src}" style="max-width:260px;max-height:260px;margin:6px;border:1px solid #ddd;border-radius:8px">`).join('');
    win.document.write(`<title>Reporte ${rep.osiId}</title><body style="font-family:system-ui,Segoe UI,Roboto,Arial">
      <h2>Reporte del supervisor — ${rep.osiId}</h2>
      <p><b>Fecha:</b> ${rep.fecha} &nbsp; <b>Supervisor:</b> ${rep.supervisor?.nombre||rep.supervisor?.num||''}</p>
      <h3>Resumen (original)</h3><pre style="white-space:pre-wrap">${rep.summary||''}</pre>
      <h3>Reporte de lo realizado</h3><pre style="white-space:pre-wrap">${rep.done||''}</pre>
      <h3>Situaciones / Incidencias</h3><pre style="white-space:pre-wrap">${rep.issues||''}</pre>
      <h3>Fotos</h3><div>${imgs||'<i>Sin fotos</i>'}</div></body>`); win.document.close();
  };

  // Nueva OSI
  function newOSI(){
    setSeq(currentSeq()+1); showNum();
    setMats([{item:'',cant:''}]); renderMats();
    const cat=getCat().map(p=>({...p, picked:false})); setCat(cat); showAsignados();
    $('iniHora').value=''; $('finHora').value=''; $('desc').value=''; $('prioridad').value='Baja'; setToday();
    $('reportStatus').textContent='Sin reporte importado aún.';
  }

  // eventos
  $('navShare').onclick=shareLink; $('navCopy').onclick=copyLink;
  $('navPrint').onclick=()=>window.print();
  $('navConfig').onclick=()=>{ location.href='login.html#cambiar'; }; // acceso rápido a cambiar PIN
  $('newOsiBtn').onclick=newOSI;

  // init
  refreshEncSup(); renderMats(); showAsignados(); refreshReportStatus();
});
