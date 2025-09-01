
(function(){
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  const $=id=>document.getElementById(id);
  const qsa=(sel,el=document)=>[...el.querySelectorAll(sel)];
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
  const ping=(k)=>{ try{ localStorage.setItem(k, String(Date.now())); }catch(_){} };

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
    ls(ROLES_KEY, roles); return roles;
  }
  function getRoles(){ return ensureRoles(); }
  function setRoles(a){ ls(ROLES_KEY, Array.from(new Set(a))); ping('osi-roles-ping'); }

  function renderRolesPills(){
    const wrap = document.getElementById('rolesList'); wrap.innerHTML='';
    getRoles().forEach((r,i)=>{
      const pill=document.createElement('div'); pill.className='role-pill';
      const isCore = CORE_ROLES.includes(r);
      pill.innerHTML=`<b>${r}</b> ${!isCore? '<button data-act="edit" data-i="'+i+'">✎</button> <button data-act="del" data-i="'+i+'" class="danger">🗑</button>' : '<span class="sub" style="color:#999;margin-left:6px">(fijo)</span>'}`;
      wrap.appendChild(pill);
    });
  }
  function addRole(name){
    name = String(name||'').trim();
    if(!name) return alert('Escribe un nombre de rol');
    const roles = getRoles();
    if(roles.includes(name)) return alert('Ese rol ya existe');
    roles.push(name); setRoles(roles); renderRolesPills(); renderRolesChoices();
  }
  function editRole(idx){
    const roles=getRoles();
    const old=roles[idx]; if(CORE_ROLES.includes(old)) return alert('Este rol es fijo');
    const name=prompt('Nuevo nombre para el rol:', old);
    if(!name) return;
    const n = name.trim(); if(!n) return alert('Nombre inválido');
    if(roles.includes(n)) return alert('Ese nombre ya existe');
    roles[idx]=n; setRoles(roles); renderRolesPills(); renderRolesChoices();
  }
  function delRole(idx){
    const roles=getRoles();
    const r=roles[idx]; if(CORE_ROLES.includes(r)) return alert('Este rol es fijo');
    if(!confirm('Eliminar rol "'+r+'"?')) return;
    roles.splice(idx,1); setRoles(roles); renderRolesPills(); renderRolesChoices();
  }
  document.getElementById('roleAdd').onclick=()=>addRole(document.getElementById('roleNew').value);
  document.getElementById('rolesList').addEventListener('click',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const act=e.target.getAttribute('data-act');
    if(act==='edit') editRole(parseInt(i,10));
    if(act==='del') delRole(parseInt(i,10));
  });

  // Personal
  function getCat(){ return ls(CAT_KEY)||[] }
  function setCat(a){ ls(CAT_KEY,a); ping('osi-cat-ping'); }

  function renderRolesChoices(){
    const roles=getRoles();
    const cont=document.getElementById('nRoles');
    cont.innerHTML = roles.map(r=>`<label class="role-pill"><input type="checkbox" class="role" value="${r}"> ${r}</label>`).join('');
  }

  function renderTabla(){
    const tb=document.getElementById('tb'); tb.innerHTML='';
    const roles=getRoles();
    getCat().forEach((p,i)=>{
      const roleCells = roles.map(r=>`<label style="display:inline-block;margin-right:8px"><input type="checkbox" data-i="${i}" data-role="${r}" ${(p.roles||[]).includes(r)?'checked':''}> ${r}</label>`).join(' ');
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td><input data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td><input data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td>${roleCells}</td>
        <td style="text-align:center"><input type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>
        <td><button data-act="dup" data-i="${i}">Duplicar</button> <button data-act="del" data-i="${i}" class="danger">Eliminar</button></td>`;
      tb.appendChild(tr);
    });
  }

  document.getElementById('add').onclick=()=>{
    const num=document.getElementById('nNum').value.trim(), nombre=document.getElementById('nNombre').value.trim();
    const roles=qsa('.role:checked',document.getElementById('nRoles')).map(el=>el.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo son obligatorios');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe un No. de empleado igual');
    cat.push({num,nombre,roles,activo:true}); setCat(cat); renderTabla();
    document.getElementById('nNum').value=''; document.getElementById('nNombre').value=''; qsa('.role:checked',document.getElementById('nRoles')).forEach(el=>el.checked=false);
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
  });

  document.addEventListener('click',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const act=e.target.getAttribute('data-act'); const cat=getCat(); const idx=parseInt(i,10);
    if(act==='del'){ if(!confirm('Eliminar a '+(cat[idx].num||'')+' — '+(cat[idx].nombre||'' )+'?')) return;
      cat.splice(idx,1); setCat(cat); renderTabla(); }
    if(act==='dup'){ const copy=Object.assign({},cat[idx],{num:(cat[idx].num||'')+'-copia'}); cat.push(copy); setCat(cat); renderTabla(); }
  });

  // Init
  ensureRoles(); renderRolesPills(); renderRolesChoices(); renderTabla();
})();