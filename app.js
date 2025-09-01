
document.addEventListener('DOMContentLoaded',()=>{
  const ROLES_KEY='osi-roles-master-v1';          // Lista de roles dinámica
  const CAT_KEY='osi-personal-v1';                // Catálogo de personal
  const CORE_ROLES=['Encargado','Supervisor'];    // Selects fijos
  const $=id=>document.getElementById(id);
  const qsa=(sel,el=document)=>[...el.querySelectorAll(sel)];
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  // Roles
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

  // Fecha automática
  const today = ()=>{ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
  const setToday=()=>{ const t=today(); const f=$('fecha'); f.value=t; f.min=t; f.max=t; };
  setToday(); ['change','input','blur','focus'].forEach(ev=>$('fecha').addEventListener(ev,setToday));
  setTimeout(setToday,120);

  // Numeración demo
  const pad=(n,w)=>String(n).padStart(w,'0'); const seq=()=>parseInt(localStorage.getItem('osi-seq')||'1',10);
  $('num').value='OSI-'+pad(seq(),5);

  // Catálogo
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

  // Selects por rol (Encargado/Supervisor)
  function byRole(role){ return getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role)); }
  function fillSelectByRole(selectId, role){
    const sel=$(selectId); if(!sel) return;
    const list = byRole(role);
    sel.innerHTML = '<option value=\"\">—</option>' + list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){ fillSelectByRole('encargado','Encargado'); fillSelectByRole('supervisor','Supervisor'); }

  // Modal Operarios con filtros dinámicos + búsqueda
  const modalSel=$('modalAsignar');
  const chips=$('chipsRoles');
  const listChecks=$('listChecks');
  const buscaOper=$('buscaOper');
  let filtros = new Set();

  function refreshChips(){
    const roles = getRoles().filter(r=>!CORE_ROLES.includes(r));
    if(filtros.size===0) roles.forEach(r=>filtros.add(r));
    chips.innerHTML = roles.map(r=>{
      const on=filtros.has(r);
      return `<span class="chip ${on?'on':''}" data-chip="${r}">${on?'✓ ':''}${r}</span>`;
    }).join('');
  }
  function renderCheckList(){
    const q = (buscaOper.value||'').toLowerCase();
    const cand = getCat().filter(p=>
      p.activo!==false &&
      (p.roles||[]).some(r=>filtros.has(r)) &&
      (!q || (`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q)))
    );
    listChecks.innerHTML = cand.length? cand.map(p=>`<label style="display:block;padding:8px 10px;border-bottom:1px solid #eee">
      <input type="checkbox" data-num="${p.num}" ${p.picked?'checked':''}>
      <strong>${p.num}</strong> — ${p.nombre} <span style="color:#667085">(${(p.roles||[]).join(', ')})</span>
    </label>`).join('') : '<div class="sub">No hay personal con los criterios seleccionados.</div>';
  }
  function showAsignados(){
    const sel = getCat().filter(p=>p.picked);
    $('asignadosLista').innerHTML = sel.map(p=>`<li>${p.num} — ${p.nombre}</li>`).join('');
    $('asignadosResumen').textContent = sel.length? (sel.length+' persona(s) seleccionada(s)'):'';
  }

  $('btnAsignar').onclick=()=>{ modalSel.style.display='flex'; refreshChips(); renderCheckList(); buscaOper.value=''; };
  $('selCerrar').onclick=()=>{ modalSel.style.display='none'; };
  $('selGuardar').onclick=()=>{ modalSel.style.display='none'; showAsignados(); };
  chips.addEventListener('click',(e)=>{
    const chip=e.target.closest('[data-chip]'); if(!chip) return;
    const r=chip.getAttribute('data-chip');
    if(filtros.has(r)) filtros.delete(r); else filtros.add(r);
    refreshChips(); renderCheckList();
  });
  buscaOper.addEventListener('input', renderCheckList);
  listChecks.addEventListener('change',(e)=>{
    const num=e.target.getAttribute('data-num'); if(!num) return;
    const cat=getCat(); const i=cat.findIndex(p=>p.num===num); if(i<0) return;
    cat[i].picked = e.target.checked; setCat(cat);
  });

  // Modal Gestión rápida (UI + búsqueda)
  const modalGest=$('modalGestion');
  const empRoles=$('empRoles');
  const tb=$('tbPersonal');
  function renderRolesInputs(container){
    const roles=getRoles();
    container.innerHTML = roles.map(r=>`<label style="display:inline-block;margin:4px 8px 4px 0"><input type="checkbox" class="role" value="${r}"> ${r}</label>`).join('');
  }
  function renderTabla(filter=''){
    const cat=getCat();
    const roles=getRoles();
    const q=filter.toLowerCase();
    tb.innerHTML='';
    cat.forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const rolesCells = roles.map(r=>`<label style="display:inline-block;margin-right:8px"><input type="checkbox" data-i="${i}" data-role="${r}" ${(p.roles||[]).includes(r)?'checked':''}> ${r}</label>`).join(' ');
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="padding:8px"><input data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td style="padding:8px"><input data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td style="padding:8px">${rolesCells}</td>
        <td style="padding:8px;text-align:center"><input type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>
        <td style="padding:8px"><button data-act="dup" data-i="${i}">Duplicar</button> <button data-act="del" data-i="${i}" class="danger">Eliminar</button></td>`;
      tb.appendChild(tr);
    });
  }

  $('btnGestion').onclick=()=>{ modalGest.style.display='flex'; renderRolesInputs(empRoles); renderTabla(); };
  $('gCerrar').onclick=()=>{ modalGest.style.display='none'; };
  $('empAgregar').onclick=()=>{
    const num=$('empNum').value.trim(), nombre=$('empNombre').value.trim();
    const roles=qsa('.role:checked', empRoles).map(el=>el.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo son obligatorios');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe un No. de empleado igual');
    cat.push({num,nombre,roles,activo:true}); setCat(cat);
    $('empNum').value=''; $('empNombre').value=''; qsa('.role:checked', empRoles).forEach(el=>el.checked=false);
    renderTabla(); refreshEncSup(); renderCheckList(); showAsignados();
  };
  $('busca').addEventListener('input', (e)=>{ renderTabla(e.target.value||''); });

  document.addEventListener('change',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox') cat[idx][k]=e.target.checked; else cat[idx][k]=e.target.value;
      setCat(cat);
    } else if(e.target.hasAttribute('data-role')){
      const role=e.target.getAttribute('data-role');
      const roles=new Set(cat[idx].roles||[]);
      if(e.target.checked) roles.add(role); else roles.delete(role);
      cat[idx].roles=[...roles]; setCat(cat);
    }
    renderTabla($('busca').value||''); refreshEncSup(); renderCheckList(); showAsignados();
  });

  // Compartir / Imprimir
  $('btnImprimir').onclick=()=>window.print();
  $('btnCompartir').onclick=()=>{
    const txt=encodeURIComponent('OSI — roles dinámicos: formulario de prueba');
    window.open('https://wa.me/?text='+txt,'_blank');
  };

  // Sync cuando cambien los roles/personal en Configuración
  window.addEventListener('storage', (e)=>{
    if(e.key==='osi-roles-ping'){ renderRolesInputs(empRoles); refreshChips(); renderCheckList(); renderTabla($('busca').value||''); }
    if(e.key==='osi-cat-ping'){ renderTabla($('busca').value||''); refreshEncSup(); renderCheckList(); showAsignados(); }
  });

  // Carga inicial
  refreshEncSup();
});
