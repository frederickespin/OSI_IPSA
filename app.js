
document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  // === Fecha automática robusta ===
  const todayStr = ()=>{ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
  const setToday = ()=>{ const t=todayStr(); const f=$('#fecha'); f.value=t; f.setAttribute('min',t); f.setAttribute('max',t); };
  setToday(); ['change','input','blur','focus'].forEach(ev=>$('#fecha').addEventListener(ev, setToday));
  setTimeout(setToday, 150);

  // === Numeración ===
  const pad=(n,w)=>String(n).padStart(w,'0');
  function getSeq(){return parseInt(localStorage.getItem('osi-seq')||'1',10)}
  function asignarNumero(){ $('#num').value='OSI-'+pad(getSeq(),5) }
  asignarNumero();

  // === Catálogo v2 (seed si vacío) ===
  function getCat(){ return ls('osi-catalog-v2')||[] }
  function setCat(a){ ls('osi-catalog-v2', a) }
  if(!ls('osi-catalog-v2')){
    setCat([
      {num:'E-0001', nombre:'Ana Encargada', roles:['Encargado'], activo:true},
      {num:'S-0001', nombre:'Samuel Supervisor', roles:['Supervisor'], activo:true},
      {num:'O-0001', nombre:'Olga Operaria', roles:['Operario'], activo:true},
    ]);
  }

  // === Notificación cruzada ===
  const notify=()=>{ if('BroadcastChannel' in window){ try{const bc=new BroadcastChannel('osi'); bc.postMessage('cat-updated'); bc.close(); }catch(_){}} try{localStorage.setItem('osi-cat-ping', String(Date.now()));}catch(_){} };
  const bc=('BroadcastChannel' in window)? new BroadcastChannel('osi') : null;
  if(bc){ bc.onmessage=(ev)=>{ if(ev && ev.data==='cat-updated'){ refreshAll(); } }; }
  window.addEventListener('storage',(e)=>{ if(e.key==='osi-cat-ping'){ refreshAll(); }});

  // === Selects por rol ===
  function fillByRole(selectEl, role){
    const cat=getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role));
    selectEl.innerHTML = '<option value="">—</option>' + cat.map(p=>`<option value="${p.num||p.nombre}">${p.num? p.num+' — ':''}${p.nombre}</option>`).join('');
  }
  function refreshRoleSelects(){ fillByRole($('#encargado'), 'Encargado'); fillByRole($('#supervisor'), 'Supervisor'); }
  function renderChecks(){
    const list=$('listChecks');
    const cat=getCat().filter(p=>p.activo!==false && (p.roles||[]).includes('Operario'));
    list.innerHTML = cat.length? cat.map((p)=>`
      <label style="display:block;padding:6px 8px;border-bottom:1px solid #eee">
        <input type="checkbox" data-num="${p.num||''}" ${p.picked?'checked':''}>
        ${p.num? `<strong>${p.num}</strong> — `:''}${p.nombre} <span style="color:#667085">(${(p.roles||[]).join(', ')})</span>
      </label>`).join('') : '<div class="sub">No hay operarios activos. Usa “➕ Añadir personal”.</div>';
  }
  function showAsignados(){
    const cat=getCat().filter(p=>p.picked);
    $('asignadosLista').innerHTML = cat.map(p=>`<li>${p.num? p.num+' — ':''}${p.nombre}</li>`).join('');
    $('asignadosResumen').textContent = cat.length? (cat.length+' persona(s) seleccionada(s)'):'';
  }
  function refreshAll(){ refreshRoleSelects(); renderChecks(); showAsignados(); }
  refreshAll();

  // === Modal selección de operarios ===
  const modal=$('modalAsignar');
  $('btnAsignar').onclick=()=>{ modal.style.display='flex'; renderChecks(); };
  $('selCerrar').onclick=()=>{ modal.style.display='none'; };
  $('selGuardar').onclick=()=>{ modal.style.display='none'; showAsignados(); };
  document.getElementById('listChecks').addEventListener('change',(e)=>{
    const num=e.target.getAttribute('data-num'); if(num===null) return;
    const cat=getCat(); const idx = cat.findIndex(p=>(p.num||'')===num);
    if(idx>=0){ cat[idx].picked = e.target.checked; setCat(cat); }
  });

  // === Modal rápido de alta/edición ===
  const qm=$('modalQuickPersonal'), qTb=$('qTb');
  function qRender(){
    const cat=getCat();
    qTb.innerHTML='';
    cat.forEach((p,i)=>{
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
      qTb.appendChild(tr);
    });
  }
  $('btnQuickAdd').onclick=()=>{ qm.style.display='flex'; qRender(); };
  $('qCerrar').onclick=()=>{ qm.style.display='none'; };

  $('qAgregar').onclick=()=>{
    const num=$('qNum').value.trim(), nombre=$('qNombre').value.trim();
    const roles=[...document.querySelectorAll('.qRole:checked')].map(el=>el.value);
    if(!num || !nombre || roles.length===0){ alert('Número, Nombre y al menos un Rol son obligatorios'); return; }
    const cat=getCat(); if(cat.some(p=>(p.num||'')===num)){ alert('Ya existe un empleado con ese número'); return; }
    cat.push({num, nombre, roles, activo:true, picked:false});
    setCat(cat); qRender(); refreshAll();
    $('qNum').value=''; $('qNombre').value=''; document.querySelectorAll('.qRole:checked').forEach(el=>el.checked=false);
  };

  document.addEventListener('change',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox') cat[idx][k]=e.target.checked; else cat[idx][k]=e.target.value;
      setCat(cat); refreshAll();
    } else if(e.target.hasAttribute('data-role')){
      const role=e.target.getAttribute('data-role');
      const roles = new Set(cat[idx].roles||[]);
      if(e.target.checked) roles.add(role); else roles.delete(role);
      cat[idx].roles = Array.from(roles);
      setCat(cat); refreshAll();
    }
  });

  document.addEventListener('click',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const act=e.target.getAttribute('data-act'); const cat=getCat(); const idx=parseInt(i,10);
    if(act==='del'){ if(!confirm('Eliminar a '+(cat[idx].num? cat[idx].num+' — ':'')+(cat[idx].nombre||'')+'?')) return;
      cat.splice(idx,1); setCat(cat); qRender(); refreshAll(); }
    if(act==='dup'){ const copy=Object.assign({},cat[idx],{num:(cat[idx].num||'')+'-copia'}); cat.push(copy); setCat(cat); qRender(); refreshAll(); }
  });

  // === Materiales ===
  function addMatRow(i, item='', qty='', note=''){ const tr=document.createElement('tr'); tr.innerHTML=`
    <td><input data-m='item' data-i='${i}' value='${item}'></td>
    <td style='width:120px'><input data-m='qty' data-i='${i}' value='${qty}'></td>
    <td><input data-m='note' data-i='${i}' value='${note}'></td>
    <td style='width:120px'><button data-m='del' data-i='${i}'>Eliminar</button></td>`; document.getElementById('tbMat').appendChild(tr); }
  document.getElementById('addMat').onclick=()=>addMatRow(document.querySelectorAll('#tbMat tr').length);
  document.addEventListener('click',(e)=>{ if(e.target.getAttribute('data-m')==='del'){ const row=e.target.closest('tr'); if(row) row.remove(); }});

  // === Firma ===
  function initFirma(){ const c=$('firma'); const ctx=c.getContext('2d'); let drawing=false, last=null;
    const pos=(e)=>{ const r=c.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:t.clientX-r.left,y:t.clientY-r.top}; };
    const start=(e)=>{ drawing=true; last=pos(e); };
    const move=(e)=>{ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.lineWidth=2; ctx.strokeStyle='#111'; ctx.stroke(); last=p; };
    const end=()=>{ drawing=false; };
    c.addEventListener('mousedown',start); c.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
    c.addEventListener('touchstart',start,{passive:true}); c.addEventListener('touchmove',move,{passive:true}); c.addEventListener('touchend',end);
    document.getElementById('clearFirma').onclick=()=>{ ctx.clearRect(0,0,c.width,c.height); };
    const resize=()=>{ const data=c.toDataURL(); c.width=c.clientWidth; c.height=c.clientHeight; const img=new Image(); img.onload=()=>{ ctx.drawImage(img,0,0,c.width,c.height); }; img.src=data; };
    new ResizeObserver(resize).observe(c);
  }
  initFirma();

  // === Compartir / Imprimir / Guardar ===
  document.getElementById('btnImprimir').onclick=()=>window.print();
  document.getElementById('btnCompartir').onclick=()=>{
    const datos={num:$('#num').value, fecha:$('#fecha').value, area:$('#area').value, prio:$('#prio').value, lugar:$('#lugar').value, enc:$('#encargado').value, sup:$('#supervisor').value};
    const txt=`OSI ${datos.num}%0AFecha: ${datos.fecha}%0AEncargado: ${datos.enc}%0ASupervisor: ${datos.sup}%0AÁrea: ${datos.area}%0APrioridad: ${datos.prio}%0ALugar: ${datos.lugar}%0A---%0AInstrucciones:%0A`+encodeURIComponent($('#desc').value||'');
    window.open('https://wa.me/?text='+txt,'_blank');
  };

  function saveMat(){ const rows=[...document.querySelectorAll('#tbMat tr')]; return rows.map(tr=>({item: tr.querySelector('[data-m="item"]').value, qty: tr.querySelector('[data-m="qty"]').value, note: tr.querySelector('[data-m="note"]').value})) }
  document.getElementById('btnGuardar').onclick=()=>{
    const key='osi-'+$('#num').value;
    const data={
      fecha:$('#fecha').value,num:$('#num').value,encargado:$('#encargado').value,supervisor:$('#supervisor').value,
      area:$('#area').value,lugar:$('#lugar').value,prio:$('#prio').value,
      inicio:$('#inicio').value,fin:$('#fin').value,desc:$('#desc').value,mat:saveMat(),
      asignados:(getCat()||[]).filter(p=>p.picked)
    };
    ls(key,data); alert('Guardado local: '+key);
  };

  // === Forzar refresco caché ===
  document.getElementById('force').onclick=async(e)=>{ e.preventDefault(); try{ if('caches'in window){const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k)));} if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister()));} }catch(_){}
    location.href='index.html?v=22s7&updated='+Date.now();
  };

  // === Login (PIN) ===
  const enc=(s)=>new TextEncoder().encode(s);
  function pbkdf2(pin,salt,it){return crypto.subtle.importKey('raw',enc(pin),'PBKDF2',false,['deriveBits']).then(k=>crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:it},k,256));}
  const loadPins=()=>{const raw=localStorage.getItem('osi-pins'); if(raw) return JSON.parse(raw);
    const init={encargado:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null},
                supervisor:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null}};
    return Promise.all([pbkdf2('1111',new Uint8Array(init.encargado.salt),init.encargado.iterations),
                        pbkdf2('2222',new Uint8Array(init.supervisor.salt),init.supervisor.iterations)]).then(([hE,hS])=>{init.encargado.hash=Array.from(new Uint8Array(hE));init.supervisor.hash=Array.from(new Uint8Array(hS));localStorage.setItem('osi-pins',JSON.stringify(init));return init;})};
  async function verify(role,pin){const pins=await loadPins(); const m=pins[role]; const bits=await pbkdf2(pin,new Uint8Array(m.salt),m.iterations); return JSON.stringify(Array.from(new Uint8Array(bits)))===JSON.stringify(m.hash);}
  OSI_AUTH.init({ idleMs:60000, heartbeatMs:15000, endOnClose:true });
  let role='encargado'; const badge=$('badgeRol');
  document.getElementById('asEnc').onclick=()=>role='encargado'; document.getElementById('asSup').onclick=()=>role='supervisor';
  document.getElementById('ok').onclick=async()=>{ const ok=await verify(role,$('#pin').value||''); if(!ok) return alert('PIN incorrecto'); OSI_AUTH.startSession(role,'',1/60); document.getElementById('login').style.display='none'; badge.textContent='ROL: '+role.toUpperCase(); };
  const s = OSI_AUTH.getSession(); if(!(s&&s.role)) document.getElementById('login').style.display='flex'; else badge.textContent='ROL: '+(s.role||'').toUpperCase();
});
