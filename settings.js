
(function(){
  const ROLES_MASTER = ['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario'];
  const CAT_KEY='osi-personal-v1';
  const $=id=>document.getElementById(id);
  const qsa=(sel,el=document)=>[...el.querySelectorAll(sel)];
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  function getCat(){ return ls(CAT_KEY)||[] }
  function setCat(a){ ls(CAT_KEY,a); notify(); }
  function notify(){ try{ localStorage.setItem('osi-cat-ping', String(Date.now())); }catch(_){} }

  function renderRoles(container){
    container.innerHTML = ROLES_MASTER.map(r=>`<label class="role-chip"><input type="checkbox" class="role" value="${r}"> ${r}</label>`).join('');
  }
  renderRoles(document.getElementById('nRoles'));

  function renderTabla(){
    const tb=document.getElementById('tb'); tb.innerHTML='';
    getCat().forEach((p,i)=>{
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td><input data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td><input data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td>${ROLES_MASTER.map(r=>`<label><input type="checkbox" data-i="${i}" data-role="${r}" ${ (p.roles||[]).includes(r)?'checked':'' }> ${r}</label>`).join(' ')}</td>
        <td style="text-align:center"><input type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>
        <td><button data-act="dup" data-i="${i}">Duplicar</button> <button data-act="del" data-i="${i}">Eliminar</button></td>`;
      tb.appendChild(tr);
    });
  }
  renderTabla();

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

  document.getElementById('exp').onclick=()=>{
    const blob=new Blob([JSON.stringify(getCat(), null, 2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='personal_osi.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  };
  document.getElementById('imp').onclick=()=>{
    const f=document.getElementById('impFile').files[0]; if(!f) return alert('Selecciona un archivo JSON');
    const reader=new FileReader(); reader.onload=()=>{
      try{ const data=JSON.parse(reader.result); if(!Array.isArray(data)) throw new Error('JSON inválido');
        setCat(data); renderTabla(); alert('Importado correctamente'); }catch(err){ alert('Error al importar: '+err.message); }
    }; reader.readAsText(f);
  };
})();
