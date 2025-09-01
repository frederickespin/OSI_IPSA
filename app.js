
document.addEventListener('DOMContentLoaded',()=>{
  const ROLES_MASTER = ['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario'];
  const $=id=>document.getElementById(id);
  const qsa=(sel,el=document)=>[...el.querySelectorAll(sel)];
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
  const CAT_KEY='osi-personal-v1';

  // === Fecha automática (hoy) ===
  const today = ()=>{ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
  const setToday=()=>{ const t=today(); const f=$('fecha'); f.value=t; f.min=t; f.max=t; };
  setToday(); ['change','input','blur','focus'].forEach(ev=>$('fecha').addEventListener(ev,setToday));
  setTimeout(setToday,150);

  // === Numeración demo ===
  const pad=(n,w)=>String(n).padStart(w,'0'); const seq=()=>parseInt(localStorage.getItem('osi-seq')||'1',10);
  $('num').value='OSI-'+pad(seq(),5);

  // === Catálogo ===
  function getCat(){ return ls(CAT_KEY)||[] }
  function setCat(a){ ls(CAT_KEY,a); notify(); }
  function ensureSeed(){
    if(!ls(CAT_KEY)) setCat([
      {num:'E-010', nombre:'Ana Encargada', roles:['Encargado'], activo:true},
      {num:'S-020', nombre:'Samuel Supervisor', roles:['Supervisor'], activo:true},
      {num:'C-100', nombre:'Carlos Chofer', roles:['Chofer','Operario'], activo:true},
      {num:'E-200', nombre:'Elena Empacadora', roles:['Empacador','Operario'], activo:true},
      {num:'M-300', nombre:'Mario Mecánico', roles:['Mecánico','Operario'], activo:true},
      {num:'K-400', nombre:'Karla Carpintera', roles:['Carpintero','Operario'], activo:true}
    ]);
  }
  function notify(){
    try{ localStorage.setItem('osi-cat-ping', String(Date.now())); }catch(_){}
  }
  ensureSeed();

  // === Helpers de filtrado ===
  const byRole=(role)=>getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role));

  function fillSelectByRole(selectId, role){
    const sel=$(selectId); if(!sel) return;
    const list = byRole(role);
    sel.innerHTML = '<option value=\"\">—</option>' + list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){
    fillSelectByRole('encargado','Encargado');
    fillSelectByRole('supervisor','Supervisor');
  }
  refreshEncSup();

  // === Modal Selección de Operarios con filtro por cargo ===
  const modalSel=$('modalAsignar');
  const chips=$('chipsRoles');
  const listChecks=$('listChecks');
  let filtrosOperario = new Set(['Chofer','Empacador','Mecánico','Carpintero','Operario']); // por defecto muestra todos operarios

  function renderChips(){
    chips.innerHTML = ROLES_MASTER.filter(r=>r!=='Encargado' && r!=='Supervisor').map(r=>{
      const on= filtrosOperario.has(r);
      return `<button data-chip="${r}" style="border-radius:999px; padding:6px 10px; ${on? 'background:#0d6efd;color:#fff;border-color:#0d6efd' : 'background:#fff;color:#111;border-color:#e4e7ec'}">${on?'✓ ':''}${r}</button>`;
    }).join('');
  }
  function renderCheckList(){
    const cand = getCat().filter(p=>p.activo!==false && (p.roles||[]).some(r=>filtrosOperario.has(r)));
    listChecks.innerHTML = cand.length? cand.map(p=>`<label style="display:block;padding:6px 8px;border-bottom:1px solid #eee">
      <input type="checkbox" data-num="${p.num}" ${p.picked?'checked':''}>
      <strong>${p.num}</strong> — ${p.nombre} <span style="color:#667085">(${(p.roles||[]).join(', ')})</span>
    </label>`).join('') : '<div class="sub">No hay personal con los cargos seleccionados.</div>';
  }
  function showAsignados(){
    const sel = getCat().filter(p=>p.picked);
    $('asignadosLista').innerHTML = sel.map(p=>`<li>${p.num} — ${p.nombre}</li>`).join('');
    $('asignadosResumen').textContent = sel.length? (sel.length+' persona(s) seleccionada(s)'):'';
  }

  $('btnAsignar').onclick=()=>{ modalSel.style.display='flex'; renderChips(); renderCheckList(); };
  $('selCerrar').onclick=()=>{ modalSel.style.display='none'; };
  $('selGuardar').onclick=()=>{ modalSel.style.display='none'; showAsignados(); };
  chips.addEventListener('click',(e)=>{
    const r=e.target.getAttribute('data-chip'); if(!r) return;
    if(filtrosOperario.has(r)) filtrosOperario.delete(r); else filtrosOperario.add(r);
    renderChips(); renderCheckList();
  });
  listChecks.addEventListener('change',(e)=>{
    const num=e.target.getAttribute('data-num'); if(!num) return;
    const cat=getCat(); const i=cat.findIndex(p=>p.num===num); if(i<0) return;
    cat[i].picked = e.target.checked; setCat(cat);
  });

  // === Modal Gestión rápida ===
  const modalGest=$('modalGestion');
  const empRoles=$('empRoles');
  const tb=$('tbPersonal');
  function rolesInputs(container){
    container.innerHTML = ROLES_MASTER.map(r=>`<label style="display:inline-block;margin-right:8px"><input type="checkbox" class="role" value="${r}"> ${r}</label>`).join('');
  }
  rolesInputs(empRoles);

  function renderTabla(){
    const cat=getCat();
    tb.innerHTML='';
    cat.forEach((p,i)=>{
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td><input data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td><input data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td>${ROLES_MASTER.map(r=>`<label><input type="checkbox" data-i="${i}" data-role="${r}" ${ (p.roles||[]).includes(r)?'checked':'' }> ${r}</label>`).join(' ')}</td>
        <td style="text-align:center"><input type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>
        <td><button data-act="dup" data-i="${i}">Duplicar</button> <button data-act="del" data-i="${i}">Eliminar</button></td>`;
      tb.appendChild(tr);
    });
  }

  $('btnGestion').onclick=()=>{ modalGest.style.display='flex'; renderTabla(); };
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
    renderTabla(); refreshEncSup(); renderCheckList(); showAsignados();
  });

  document.addEventListener('click',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const act=e.target.getAttribute('data-act'); const cat=getCat(); const idx=parseInt(i,10);
    if(act==='del'){ if(!confirm('Eliminar a '+(cat[idx].num||'')+' — '+(cat[idx].nombre||'' )+'?')) return;
      cat.splice(idx,1); setCat(cat); renderTabla(); refreshEncSup(); renderCheckList(); showAsignados(); }
    if(act==='dup'){ const copy=Object.assign({},cat[idx],{num:(cat[idx].num||'')+'-copia'}); cat.push(copy); setCat(cat); renderTabla(); }
  });

  // === Compartir / Imprimir ===
  $('btnImprimir').onclick=()=>window.print();
  $('btnCompartir').onclick=()=>{
    const txt=encodeURIComponent('Formulario OSI — demo de registro y filtros por cargo');
    window.open('https://wa.me/?text='+txt,'_blank');
  };
});
