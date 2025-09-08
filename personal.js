(function(){
  const ROLES_KEY='osi-roles-master-v1', CAT_KEY='osi-personal-v1';
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  function roles(){ let r=ls(ROLES_KEY); if(!Array.isArray(r)||!r.length) r=['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento']; ls(ROLES_KEY,[...new Set(r)]); return ls(ROLES_KEY); }
  function cat(){ return ls(CAT_KEY)||[] } function setCat(a){ ls(CAT_KEY,a) }

  function fillRoles(sel, selected){ const set=new Set(selected||[]); sel.innerHTML=roles().map(x=>`<option value="${x}" ${set.has(x)?'selected':''}>${x}</option>`).join(''); }
  function render(filter=''){
    const q=(filter||'').toLowerCase(); const t=$('tb'); t.innerHTML='';
    cat().forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>
        <td class="emp"><span class="code">${p.num}</span> <input class="empName" data-i="${i}" data-k="nombre" value="${p.nombre||''}" style="padding:8px;border:1px solid #e6e7ec;border-radius:10px"></td>
        <td class="roles">${(p.roles||[]).map(r=>`<span class="code" style="background:#f0f6ff;border-color:#dbe7ff">${r}</span>`).join(' ')}</td>
        <td><button class="badge edit" data-i="${i}" type="button">Editar roles</button> <button class="badge del" data-i="${i}" type="button">Eliminar</button></td>`;
      t.appendChild(tr);
    });
  }

  fillRoles($('roles'),[]);
  $('add').onclick=()=>{
    const num=$('num').value.trim(), nom=$('nom').value.trim(); const rs=[...$('roles').selectedOptions].map(o=>o.value);
    if(!num||!nom||rs.length===0) return alert('Completa No., Nombre y al menos un rol.');
    const c=cat(); if(c.some(x=>x.num===num)) return alert('No. ya existe');
    c.push({num, nombre:nom, roles:rs, activo:true});
    setCat(c); $('num').value=''; $('nom').value=''; [...$('roles').options].forEach(o=>o.selected=false); render();
  };
  $('q').oninput=e=>render(e.target.value);

  document.addEventListener('click',e=>{
    if(e.target.classList.contains('del')){
      const i=+e.target.dataset.i; const c=cat(); c.splice(i,1); setCat(c); render($('q').value);
    }else if(e.target.classList.contains('edit')){
      const i=+e.target.dataset.i; const c=cat(); const cur=new Set(c[i].roles||[]); const opts=roles().map(r=>`${cur.has(r)?'☑':'☐'} ${r}`).join('\n');
      const pick=prompt('Roles actuales (marca manualmente y separa por comas):\n'+opts, (c[i].roles||[]).join(', '));
      if(pick!==null){ c[i].roles=pick.split(',').map(s=>s.trim()).filter(Boolean); setCat(c); render($('q').value); }
    }
  });
  document.addEventListener('input',e=>{
    const i=e.target.dataset.i; const k=e.target.dataset.k; if(i===undefined||!k) return;
    const c=cat(); if(!c[i]) return;
    if(e.target.type==='checkbox') c[i][k]=e.target.checked; else c[i][k]=e.target.value;
    setCat(c);
  });

  render();
})();
