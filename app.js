
document.addEventListener('DOMContentLoaded',()=>{
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  const $=id=>document.getElementById(id);
  const qsa=(sel,el=document)=>[...el.querySelectorAll(sel)];
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

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

  const today = ()=>{ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
  const setToday=()=>{ const t=today(); const f=$('fecha'); if(f){f.value=t; f.min=t; f.max=t;} };
  setToday(); setTimeout(setToday,100);

  const pad=(n,w)=>String(n).padStart(w,'0'); const seq=()=>parseInt(localStorage.getItem('osi-seq')||'1',10);
  if($('num')) $('num').value='OSI-'+pad(seq(),5);

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
    sel.innerHTML = '<option value=\"\">—</option>' + list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){ fillSelectByRole('encargado','Encargado'); fillSelectByRole('supervisor','Supervisor'); }

  const modalSel=$('modalAsignar');
  const filtroRoles=$('filtroRoles');
  const tbChecks=$('tbChecks');
  const buscaOper=$('buscaOper');

  function fillFiltroRoles(){
    const roles=getRoles().filter(r=>!CORE_ROLES.includes(r));
    filtroRoles.innerHTML = roles.map(r=>`<option value="${r}" selected>${r}</option>`).join('');
  }
  function getFiltroRolesSet(){ return new Set([...filtroRoles.selectedOptions].map(o=>o.value)); }
  function renderCheckTable(){
    const filtros = getFiltroRolesSet();
    const q = (buscaOper?.value||'').toLowerCase();
    const cand = getCat().filter(p=>
      p.activo!==false &&
      (p.roles||[]).some(r=>filtros.has(r)) &&
      (!q || (`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q)))
    );
    tbChecks.innerHTML = cand.length? cand.map(p=>`<tr>
      <td style="text-align:center"><input type="checkbox" class="sm" data-num="${p.num}" ${p.picked?'checked':''}></td>
      <td>${p.num}</td><td>${p.nombre}</td><td>${(p.roles||[]).map(r=>'<span class="badge badge-primary">'+r+'</span>').join(' ')}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="sub" style="padding:8px">No hay personal con los criterios seleccionados.</td></tr>';
  }
  $('btnAsignar').onclick=()=>{ modalSel.style.display='flex'; fillFiltroRoles(); renderCheckTable(); buscaOper.value=''; };
  $('selCerrar').onclick=()=>{ modalSel.style.display='none'; };
  $('selGuardar').onclick=()=>{ modalSel.style.display='none'; showAsignados(); };
  filtroRoles.addEventListener('change', renderCheckTable);
  buscaOper.addEventListener('input', renderCheckTable);
  tbChecks.addEventListener('change',(e)=>{
    const num=e.target.getAttribute('data-num'); if(!num) return;
    const cat=getCat(); const i=cat.findIndex(p=>p.num===num); if(i<0) return;
    cat[i].picked = e.target.checked; setCat(cat);
  });

  function showAsignados(){
    const sel = getCat().filter(p=>p.picked);
    const ul=$('asignadosLista'); if(ul) ul.innerHTML = sel.map(p=>`<li>${p.num} — ${p.nombre}</li>`).join('');
    const rs=$('asignadosResumen'); if(rs) rs.textContent = sel.length? (sel.length+' seleccionado(s)'):'';
  }

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
    const q=filter.toLowerCase();
    tb.innerHTML='';
    cat.forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const selId='ms-'+i;
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>
        <td><input class="tbl-input" data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td><input class="tbl-input" data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td><select multiple size="4" class="msel" data-i="${i}" data-k="roles" id="${selId}"></select></td>
        <td><button class="btn" data-act="dup" data-i="${i}">Duplicar</button> <button class="btn btn-danger" data-act="del" data-i="${i}">Eliminar</button></td>`;
      tb.appendChild(tr);
      fillRolesMulti(document.getElementById(selId), p.roles||[]);
    });
  }

  $('btnGestion').onclick=()=>{ modalGest.style.display='flex'; fillRolesMulti(empRolesSel, []); renderTabla(); };
  $('gCerrar').onclick=()=>{ modalGest.style.display='none'; };
  $('empAgregar').onclick=()=>{
    const num=$('empNum').value.trim(), nombre=$('empNombre').value.trim();
    const roles=[...empRolesSel.selectedOptions].map(o=>o.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo son obligatorios');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe un No. de empleado igual');
    cat.push({num,nombre,roles,activo:true}); setCat(cat);
    $('empNum').value=''; $('empNombre').value=''; [...empRolesSel.options].forEach(o=>o.selected=false);
    renderTabla(); refreshEncSup(); renderCheckTable(); showAsignados();
  };
  $('busca').addEventListener('input', (e)=>{ renderTabla(e.target.value||''); });

  document.addEventListener('change',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.tagName==='SELECT' && e.target.multiple && k==='roles'){
        const vals=[...e.target.selectedOptions].map(o=>o.value);
        cat[idx].roles = vals;
      } else if(e.target.type==='checkbox'){
        cat[idx][k]=e.target.checked;
      } else {
        cat[idx][k]=e.target.value;
      }
      setCat(cat);
    }
    renderTabla($('busca').value||''); refreshEncSup(); renderCheckTable(); showAsignados();
  });

  $('btnImprimir').onclick=()=>window.print();
  $('btnCompartir').onclick=()=>{
    const txt=encodeURIComponent('OSI — gestión de personal (PWA)');
    window.open('https://wa.me/?text='+txt,'_blank');
  };

  window.addEventListener('storage', (e)=>{
    if(e.key==='osi-roles-ping'){ fillRolesMulti(empRolesSel, [...empRolesSel.selectedOptions].map(o=>o.value)); renderTabla($('busca').value||''); fillFiltroRoles(); renderCheckTable(); }
    if(e.key==='osi-cat-ping'){ renderTabla($('busca').value||''); refreshEncSup(); renderCheckTable(); showAsignados(); }
  });

  refreshEncSup();
});
