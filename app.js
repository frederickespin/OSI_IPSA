document.addEventListener('DOMContentLoaded',()=>{
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  const MATS_KEY='osi-mats-v1';
  const REPORTS_KEY='osi-reports-v1'; // Reportes recibidos del supervisor
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  // ---- util ----
  const b64u = {
    enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
    dec: s => decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))))
  };
  const today = ()=>{ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
  const setToday=()=>{ const t=today(); const f=$('fecha'); if(f){f.value=t; f.min=t; f.max=t;} };
  setToday(); setTimeout(setToday,100);
  const pad=(n,w)=>String(n).padStart(w,'0'); const seq=()=>parseInt(localStorage.getItem('osi-seq')||'3',10);
  if($('num')) $('num').value='OSI-'+pad(seq(),5);

  // ---- roles base ----
  function ensureRoles(){
    let roles = ls(ROLES_KEY);
    if(!Array.isArray(roles) || roles.length===0){
      roles = ['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
    } else {
      CORE_ROLES.forEach(r=>{ if(!roles.includes(r)) roles.unshift(r); });
      if(!roles.includes('Mantenimiento')) roles.push('Mantenimiento');
      roles = Array.from(new Set(roles.map(r=>String(r).trim()).filter(Boolean)));
    }
    ls(ROLES_KEY, roles);
    try{ localStorage.setItem('osi-roles-ping', String(Date.now())); }catch(_){}
    return roles;
  }
  const getRoles=()=>ensureRoles();

  // ---- catálogo personal ----
  function getCat(){ return ls(CAT_KEY)||[] }
  function setCat(a){ ls(CAT_KEY,a); try{localStorage.setItem('osi-cat-ping', String(Date.now()));}catch(_){ } }

  if(!ls(CAT_KEY)){
    setCat([
      {num:'E-010', nombre:'Ana Encargada', roles:['Encargado'], activo:true},
      {num:'S-020', nombre:'Samuel Supervisor', roles:['Supervisor'], activo:true},
      {num:'C-100', nombre:'Carlos Chofer', roles:['Chofer','Operario'], activo:true},
      {num:'E-200', nombre:'Elena Empacadora', roles:['Empacador','Operario'], activo:true},
      {num:'M-300', nombre:'Mario Mecánico', roles:['Mecánico','Operario'], activo:true},
      {num:'K-400', nombre:'Karla Carpintera', roles:['Carpintero','Operario'], activo:true},
      {num:'MT-500', nombre:'Miguel Mantenimiento', roles:['Mantenimiento','Operario'], activo:true}
    ]);
  }

  function byRole(role){ return getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role)); }
  function fillSelectByRole(selectId, role){
    const sel=$(selectId); if(!sel) return;
    const list = byRole(role);
    sel.innerHTML = '<option value="">—</option>' + list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){ fillSelectByRole('encargado','Encargado'); fillSelectByRole('supervisor','Supervisor'); }

  // ---- materiales ----
  function mats(){ return ls(MATS_KEY)||[] }
  function setMats(a){ ls(MATS_KEY,a) }
  function renderMats(){
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

  // ---- gestión / selección ----
  const modalGest=$('modalGestion');
  const empRolesSel=$('empRolesSel');
  const tb=$('tbPersonal');

  function fillRolesMulti(selEl, selected){
    const roles=getRoles();
    const set = new Set(selected||[]);
    selEl.innerHTML = roles.map(r=>`<option value="${r}" ${set.has(r)?'selected':''}>${r}</option>`).join('');
  }

  function renderTabla(filter=''){
    const cat=getCat();
    const q=(filter||'').toLowerCase();
    tb.innerHTML='';
    cat.forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const rolesBadges=(p.roles||[]).map(r=>`<span class="badge badge-role">${r}</span>`).join(' ');
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input class="sm selPick" type="checkbox" data-i="${i}" ${p.picked?'checked':''}></td>
        <td><input class="tbl-input" data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td><input class="tbl-input" data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td>${rolesBadges}<br><small class="sub">(edita roles al agregar)</small></td>
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>`;
      tb.appendChild(tr);
    });
  }

  $('navGestion').onclick=()=>{ modalGest.style.display='flex'; fillRolesMulti(empRolesSel, []); renderTabla(); };
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
  $('busca').addEventListener('input', (e)=>{ renderTabla(e.target.value||''); });

  document.addEventListener('change',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.classList.contains('selPick')){ cat[idx].picked = e.target.checked; setCat(cat); return; }
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox'){ cat[idx][k]=e.target.checked; } else { cat[idx][k]=e.target.value; }
      setCat(cat);
    }
  });

  // ---- resumen asignados ----
  function showAsignados(){
    const sel = getCat().filter(p=>p.picked);
    const ul=$('asignadosLista'); const rs=$('asignadosResumen');
    ul.innerHTML = sel.map(p=>{
      const rol = (p.roles&&p.roles[0])? p.roles[0] : '—';
      return `<li>${p.num} — ${p.nombre} — <span class="badge badge-role">${rol}</span></li>`;
    }).join('');
    rs.textContent = sel.length? (sel.length+' seleccionado(s)'):'';
  }

  // ---- generar enlace para Supervisor ----
  function buildPayload(){
    const getNameByNum = (num)=>{ const p=getCat().find(x=>x.num===num); return p? p.nombre: ''; };
    const payload = {
      id: ($('num')?.value||'').trim(),
      fecha: $('fecha')?.value||today(),
      prioridad: $('prioridad')?.value||'Media',
      iniHora: $('iniHora')?.value||'',
      finHora: $('finHora')?.value||'',
      desc: $('desc')?.value||'',
      encargado: { num:$('encargado')?.value||'', nombre:getNameByNum($('encargado')?.value||'') },
      supervisor:{ num:$('supervisor')?.value||'', nombre:getNameByNum($('supervisor')?.value||'') },
      materiales: mats().filter(m=> (m.item||'').trim()),
      asignados: getCat().filter(p=>p.picked).map(p=>({num:p.num, nombre:p.nombre, roles:p.roles||[]})),
      v: 'v1m'
    };
    return payload;
  }
  function shareLink(){
  const p = buildPayload();
  if(!p.id || !p.supervisor.num){ alert('Completa Nº OSI y selecciona un Supervisor.'); return; }
  const json = JSON.stringify(p);
  const d = b64u.enc(json);
  // base robusta (directorio actual)
  const base = new URL('.', location.href);           // p.ej. .../OSI_IPSA/
  const link = new URL('supervisor.html?d='+d, base); // .../OSI_IPSA/supervisor.html?d=...
  const text = `OSI ${p.id} — Instrucciones para hoy (${p.fecha})
Supervisor: ${p.supervisor.nombre||p.supervisor.num}
Abrir: ${link.href}`;
  window.open('https://wa.me/?text='+encodeURIComponent(text), '_blank');
}


  $('shareSupervisor').onclick=shareLink;
  $('navShare').onclick=shareLink;
  $('navPrint').onclick=()=>window.print();
  $('navConfig').onclick=()=>{ window.location.href='settings.html?v=v1m'; };

  // ---- importar y ver reporte del supervisor ----
  function getReports(){ return ls(REPORTS_KEY)||{} }
  function setReports(m){ ls(REPORTS_KEY,m) }
  function refreshReportStatus(){
    const id = ($('num')?.value||'').trim();
    const rep = getReports()[id];
    const st = $('reportStatus'), vr=$('viewReport'), cr=$('clearReport');
    if(rep){
      st.textContent = `Reporte del supervisor recibido (${new Date(rep.timestamp||Date.now()).toLocaleString()}).`;
      vr.style.display='inline-block'; cr.style.display='inline-block';
    } else {
      st.textContent = `Sin reporte importado aún.`;
      vr.style.display='none'; cr.style.display='none';
    }
  }
  $('importReport').addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const txt = await f.text();
      const rep = JSON.parse(txt);
      if(!rep || !rep.osiId){ alert('Archivo inválido'); return; }
      const map=getReports(); map[rep.osiId]=rep; setReports(map);
      refreshReportStatus();
      alert('Reporte importado correctamente.');
      e.target.value='';
    }catch(err){ alert('Error leyendo el archivo: '+err.message); }
  });
  $('clearReport').onclick=()=>{
    const id = ($('num')?.value||'').trim();
    if(!id) return;
    if(confirm('¿Eliminar el reporte importado para '+id+'?')){
      const map=getReports(); delete map[id]; setReports(map); refreshReportStatus();
    }
  };
  $('viewReport').onclick=()=>{
    const id = ($('num')?.value||'').trim();
    const rep = getReports()[id]; if(!rep) return alert('No hay reporte cargado.');
    const win = window.open('','_blank');
    const imgs = (rep.photos||[]).map(src=>`<img src="${src}" style="max-width:260px;max-height:260px;margin:6px;border:1px solid #ddd;border-radius:8px">`).join('');
    win.document.write(`
      <title>Reporte ${rep.osiId}</title>
      <body style="font-family:system-ui,Segoe UI,Roboto,Arial">
        <h2>Reporte del supervisor — ${rep.osiId}</h2>
        <p><b>Fecha:</b> ${rep.fecha} &nbsp; <b>Supervisor:</b> ${rep.supervisor?.nombre||rep.supervisor?.num||''}</p>
        <h3>Resumen (original)</h3>
        <pre style="white-space:pre-wrap">${rep.summary||''}</pre>
        <h3>Reporte de lo realizado</h3>
        <pre style="white-space:pre-wrap">${rep.done||''}</pre>
        <h3>Situaciones / Incidencias</h3>
        <pre style="white-space:pre-wrap">${rep.issues||''}</pre>
        <h3>Fotos</h3>
        <div>${imgs||'<i>Sin fotos</i>'}</div>
      </body>
    `);
    win.document.close();
  };

  // ---- init ----
  refreshEncSup(); renderMats(); showAsignados(); refreshReportStatus();
});

