
(function(){
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
  const ping=(k)=>{ try{ localStorage.setItem(k, String(Date.now())); }catch(_){} };

  function ensureRoles(){
    let roles = ls(ROLES_KEY);
    if(!Array.isArray(roles) || roles.length===0){
      roles = ['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
    } else {
      CORE_ROLES.forEach(r=>{ if(!roles.includes(r)) roles.unshift(r); });
      if(!roles.includes('Mantenimiento')) roles.push('Mantenimiento');
      roles = Array.from(new Set(roles.map(r=>String(r).trim()).filter(Boolean)));
    }
    ls(ROLES_KEY, roles); return roles;
  }
  function getRoles(){ return ensureRoles(); }
  function setRoles(a){ ls(ROLES_KEY, Array.from(new Set(a))); ping('osi-roles-ping'); }

  function fillRolesMulti(selEl, selected){
    const roles=getRoles();
    const set = new Set(selected||[]);
    selEl.innerHTML = roles.map(r=>`<option value="${r}" ${set.has(r)?'selected':''}>${r}</option>`).join('');
  }

  function renderRolesTable(){
    const tb=document.getElementById('tbRoles'); tb.innerHTML='';
    getRoles().forEach((r,i)=>{
      const isCore = CORE_ROLES.includes(r);
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${r}</td>
        <td>${isCore? '<span class="sub" style="color:#999">Fijo</span>' :
          '<button data-act="edit" data-i="'+i+'">Renombrar</button> <button data-act="del" data-i="'+i+'" style="color:#b42318">Eliminar</button>'}</td>`;
      tb.appendChild(tr);
    });
  }
  function addRole(name){
    name = String(name||'').trim();
    if(!name) return alert('Escribe un nombre de rol');
    const roles = getRoles();
    if(roles.includes(name)) return alert('Ese rol ya existe');
    roles.push(name); setRoles(roles); renderRolesTable(); fillRolesMulti(document.getElementById('nRolesSel'), []);
  }
  function editRole(idx){
    const roles=getRoles();
    const old=roles[idx]; if(CORE_ROLES.includes(old)) return alert('Este rol es fijo');
    const name=prompt('Nuevo nombre para el rol:', old);
    if(!name) return;
    const n = name.trim(); if(!n) return alert('Nombre inválido');
    if(roles.includes(n)) return alert('Ese nombre ya existe');
    roles[idx]=n; setRoles(roles); renderRolesTable(); fillRolesMulti(document.getElementById('nRolesSel'), []);
  }
  function delRole(idx){
    const roles=getRoles();
    const r=roles[idx]; if(CORE_ROLES.includes(r)) return alert('Este rol es fijo');
    if(!confirm('Eliminar rol "'+r+'"?')) return;
    roles.splice(idx,1); setRoles(roles); renderRolesTable(); fillRolesMulti(document.getElementById('nRolesSel'), []);
  }
  document.addEventListener('click',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const act=e.target.getAttribute('data-act');
    if(act==='edit') editRole(parseInt(i,10));
    if(act==='del') delRole(parseInt(i,10));
  });
  document.getElementById('roleAdd').onclick=()=>addRole(document.getElementById('roleNew').value);

  function getCat(){ return ls(CAT_KEY)||[] }
  function setCat(a){ ls(CAT_KEY,a); ping('osi-cat-ping'); }

  function renderTabla(){
    const tb=document.getElementById('tb'); tb.innerHTML='';
    getCat().forEach((p,i)=>{
      const selId='prs-'+i;
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input type="checkbox" class="sm" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>
        <td><input data-i="${i}" data-k="num" value="${p.num||''}" class="tbl-input"></td>
        <td><input data-i="${i}" data-k="nombre" value="${p.nombre||''}" class="tbl-input"></td>
        <td><select multiple size="4" class="msel" data-i="${i}" data-k="roles" id="${selId}"></select></td>
        <td><button data-act="dup" data-i="${i}">Duplicar</button> <button data-act="del" data-i="${i}" style="color:#b42318">Eliminar</button></td>`;
      tb.appendChild(tr);
      fillRolesMulti(document.getElementById(selId), p.roles||[]);
    });
  }

  document.getElementById('add').onclick=()=>{
    const num=document.getElementById('nNum').value.trim(), nombre=document.getElementById('nNombre').value.trim();
    const roles=[...document.getElementById('nRolesSel').selectedOptions].map(o=>o.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo son obligatorios');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe un No. de empleado igual');
    cat.push({num,nombre,roles,activo:true}); setCat(cat); renderTabla();
    document.getElementById('nNum').value=''; document.getElementById('nNombre').value=''; [...document.getElementById('nRolesSel').options].forEach(o=>o.selected=false);
  };

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
  });

  renderRolesTable();
  renderTabla();
  fillRolesMulti(document.getElementById('nRolesSel'), []);
})();