(function(){
  const ROLES_KEY='osi-roles-master-v1';
  const CORE=['Encargado','Supervisor'];
  const tb=document.getElementById('tbRoles');

  function roles(){ return JSON.parse(localStorage.getItem(ROLES_KEY)||'[]'); }
  function setRoles(arr){ localStorage.setItem(ROLES_KEY, JSON.stringify(arr)); }

  function ensureDefaults(){
    let r=roles();
    if(!Array.isArray(r)||r.length===0){ r=['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento']; }
    CORE.forEach(x=>{ if(!r.includes(x)) r.unshift(x); });
    setRoles([...new Set(r)]);
  }

  function render(){
    ensureDefaults();
    const r=roles();
    tb.innerHTML='';
    r.forEach(role=>{
      const tr=document.createElement('tr');
      if(CORE.includes(role)){
        tr.innerHTML=`<td><span class="badge">${role}</span></td><td class="small">Fijo</td>`;
      }else{
        tr.innerHTML=`<td><input data-role="${role}" class="edit" value="${role}"></td>
                       <td><button class="btn btn-primary ren" data-role="${role}">Renombrar</button>
                           <button class="btn del" data-role="${role}">Eliminar</button></td>`;
      }
      tb.appendChild(tr);
    });
  }

  document.getElementById('btnAddRole').onclick=()=>{
    const val=(document.getElementById('newRole').value||'').trim();
    if(!val) return;
    const r=roles(); if(r.includes(val)) return alert('Ya existe ese rol.');
    setRoles([...r,val]); document.getElementById('newRole').value=''; render();
  };

  tb.addEventListener('click',e=>{
    if(e.target.classList.contains('del')){
      const role=e.target.getAttribute('data-role');
      if(confirm('Eliminar rol "'+role+'"?')){ setRoles(roles().filter(x=>x!==role)); render(); }
    }
    if(e.target.classList.contains('ren')){
      const old=e.target.getAttribute('data-role');
      const inp=tb.querySelector('input.edit[data-role="'+old+'"]');
      const val=(inp?.value||'').trim(); if(!val) return;
      const arr=roles().map(x=>x===old?val:x); setRoles([...new Set(arr)]); render();
    }
  });

  // PIN
  document.getElementById('btnChange').onclick=()=>{
    const old=document.getElementById('oldPin').value.trim();
    const a=document.getElementById('newPin1').value.trim();
    const b=document.getElementById('newPin2').value.trim();
    if(old!==localStorage.getItem('enc-pin')) return alert('PIN actual incorrecto.');
    if(a.length<4 || a.length>6 || !/^\d+$/.test(a)) return alert('El nuevo PIN debe tener 4–6 dígitos.');
    if(a!==b) return alert('Los PIN no coinciden.');
    localStorage.setItem('enc-pin', a);
    alert('PIN actualizado.');
    document.getElementById('oldPin').value=document.getElementById('newPin1').value=document.getElementById('newPin2').value='';
  };

  document.getElementById('logout').onclick=()=>{ sessionStorage.removeItem('enc-session'); location.href='login.html'; };

  render();
})();

