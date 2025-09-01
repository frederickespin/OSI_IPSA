
(function(){
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault(); deferredPrompt=e;});
  const $ = (id) => document.getElementById(id);
  $('#btnInstall').onclick = async () => {
    if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; }
    else alert('Si no ves el cuadro, usa “Agregar a la pantalla de inicio”.');
  };
  $('#btnShareLink').onclick = async () => {
    const link = location.origin + location.pathname.replace('settings.html','index.html') + '?v=22s7';
    if(navigator.share){ try{ await navigator.share({title:'OSI', text:'Formulario OSI', url: link}); }catch(_){}} else { await navigator.clipboard.writeText(link); alert('🔗 Enlace copiado'); }
  };

  function enc(s){ return new TextEncoder().encode(s); }
  function pbkdf2(pin,salt,it){
    return crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits'])
      .then(key => crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations: it }, key, 256));
  }
  async function updatePins(){
    const e = $('#pinEnc').value.trim();
    const s = $('#pinSup').value.trim();
    if(!e && !s){ alert('Escribe al menos un PIN'); return; }
    let meta = JSON.parse(localStorage.getItem('osi-pins')||'null');
    if(!meta){
      meta = {encargado:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null},
              supervisor:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null}};
    }
    if(e){
      const saltE = new Uint8Array(crypto.getRandomValues(new Uint8Array(16)));
      const bitsE = await pbkdf2(e, saltE, meta.encargado.iterations);
      meta.encargado.salt = Array.from(saltE);
      meta.encargado.hash = Array.from(new Uint8Array(bitsE));
    }
    if(s){
      const saltS = new Uint8Array(crypto.getRandomValues(new Uint8Array(16)));
      const bitsS = await pbkdf2(s, saltS, meta.supervisor.iterations);
      meta.supervisor.salt = Array.from(saltS);
      meta.supervisor.hash = Array.from(new Uint8Array(bitsS));
    }
    localStorage.setItem('osi-pins', JSON.stringify(meta));
    alert('PIN(es) actualizado(s).');
    $('#pinEnc').value = ''; $('#pinSup').value = '';
  }
  $('#btnUpdatePins').onclick = updatePins;

  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
  function getCat(){ return ls('osi-catalog-v2')||[] }
  function setCat(a){ ls('osi-catalog-v2', a); notify(); }

  function notify(){
    if('BroadcastChannel' in window){ try{ const bc=new BroadcastChannel('osi'); bc.postMessage('cat-updated'); bc.close(); }catch(_){ } }
    try{ localStorage.setItem('osi-cat-ping', String(Date.now())); }catch(_){}
  }

  function render(){
    const tbody = document.getElementById('tbPersonal'); tbody.innerHTML='';
    getCat().forEach((p,i)=>{
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td><input data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td><input data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td>
          <label><input type="checkbox" data-i="${i}" data-role="Encargado" ${ (p.roles||[]).includes('Encargado')? 'checked':'' }> Encargado</label>
          <label><input type="checkbox" data-i="${i}" data-role="Supervisor" ${ (p.roles||[]).includes('Supervisor')? 'checked':'' }> Supervisor</label>
          <label><input type="checkbox" data-i="${i}" data-role="Operario" ${ (p.roles||[]).includes('Operario')? 'checked':'' }> Operario</label>
          <label><input type="checkbox" data-i="${i}" data-role="Administración" ${ (p.roles||[]).includes('Administración')? 'checked':'' }> Administración</label>
        </td>
        <td style="text-align:center"><input type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false? 'checked':''}></td>
        <td><button data-act="dup" data-i="${i}">Duplicar</button> <button data-act="del" data-i="${i}">Eliminar</button></td>`;
      tbody.appendChild(tr);
    });
  }

  const modal = document.getElementById('modalPersonal');
  document.getElementById('btnManage').onclick = ()=>{ modal.style.display='flex'; render(); };
  document.getElementById('pCerrar').onclick = ()=>{ modal.style.display='none'; };

  document.getElementById('empAgregar').onclick = ()=>{
    const num = document.getElementById('empNum').value.trim();
    const nombre = document.getElementById('empNombre').value.trim();
    const roles = [...document.querySelectorAll('.role:checked')].map(el=>el.value);
    if(!num || !nombre || roles.length===0){ alert('Número, Nombre y al menos un Rol son obligatorios'); return; }
    const cat=getCat();
    if(cat.some(p=> (p.num||'')===num )){ alert('Ya existe un empleado con ese número'); return; }
    cat.push({num, nombre, roles, activo:true, picked:false});
    setCat(cat);
    document.getElementById('empNum').value=''; document.getElementById('empNombre').value=''; document.querySelectorAll('.role:checked').forEach(el=>el.checked=false);
    render();
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
      const roles = new Set(cat[idx].roles||[]);
      if(e.target.checked) roles.add(role); else roles.delete(role);
      cat[idx].roles = Array.from(roles);
      setCat(cat);
    }
  });

  document.addEventListener('click',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const act=e.target.getAttribute('data-act'); const cat=getCat(); const idx=parseInt(i,10);
    if(act==='del'){ if(!confirm('Eliminar a '+(cat[idx].num? cat[idx].num+' — ':'')+(cat[idx].nombre||'')+'?')) return;
      cat.splice(idx,1); setCat(cat); render(); }
    if(act==='dup'){ const copy=Object.assign({},cat[idx],{num:(cat[idx].num||'')+'-copia'}); cat.push(copy); setCat(cat); render(); }
  });

  document.getElementById('btnExport').onclick=()=>{
    const blob=new Blob([JSON.stringify(getCat(), null, 2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='personal_osi.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  };
  document.getElementById('btnImport').onclick=()=>{
    const f=document.getElementById('fileImport').files[0]; if(!f) return alert('Selecciona un archivo JSON');
    const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(!Array.isArray(data)) throw new Error('JSON inválido');
      setCat(data); render(); alert('Importado correctamente.'); }catch(err){ alert('Error al importar: '+err.message); } }; reader.readAsText(f);
  };
})();
