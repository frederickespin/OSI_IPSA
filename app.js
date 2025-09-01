
document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
  const todayLocal = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  $('#fecha').value = todayLocal();

  const pad=(n,w)=>String(n).padStart(w,'0');
  function getSeq(){return parseInt(localStorage.getItem('osi-seq')||'1',10)}
  function asignarNumero(){ $('#num').value='OSI-'+pad(getSeq(),5) }
  asignarNumero();

  function migrateIfNeeded(){
    const v2 = ls('osi-catalog-v2');
    if(v2 && Array.isArray(v2)) return;
    const v1 = ls('osi-catalog');
    if(!v1 || !Array.isArray(v1)) { ls('osi-catalog-v2', []); return; }
    const mapped = v1.map(p=>{
      const roles = new Set();
      if(p.rol) roles.add(p.rol);
      if(p.creadorOSI) roles.add('Encargado');
      if(!p.rol && !p.creadorOSI) roles.add('Operario');
      return { num: p.num || '', nombre: p.nombre || '', roles: Array.from(roles), activo: (p.activo!==false), picked: !!p.picked };
    });
    ls('osi-catalog-v2', mapped);
  }
  migrateIfNeeded();

  function getCat(){ return ls('osi-catalog-v2')||[] }
  function setCat(a){ ls('osi-catalog-v2', a) }

  function fillByRole(selectEl, role){
    const cat=getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role));
    selectEl.innerHTML = '<option value="">—</option>' + cat.map(p=>`<option value="${p.num||p.nombre}">${p.num? p.num+' — ':''}${p.nombre}</option>`).join('');
  }
  function refreshRoleSelects(){ fillByRole($('#encargado'), 'Encargado'); fillByRole($('#supervisor'), 'Supervisor'); }
  refreshRoleSelects();

  const modal=$('modalAsignar'), list=$('listChecks');
  function openSel(){ modal.style.display='flex'; renderChecks(); }
  function closeSel(){ modal.style.display='none'; }
  function renderChecks(){
    const cat=getCat().filter(p=>p.activo!==false && (p.roles||[]).includes('Operario'));
    list.innerHTML = cat.length? cat.map((p)=>`
      <label style="display:block;padding:6px 8px;border-bottom:1px solid #eee">
        <input type="checkbox" data-num="${p.num||''}" ${p.picked?'checked':''}>
        ${p.num? `<strong>${p.num}</strong> — `:''}${p.nombre} <span style="color:#667085">(${(p.roles||[]).join(', ')})</span>
      </label>`).join('') : '<div class="sub">No hay operarios activos. Gestiona el personal en Configuración.</div>';
  }
  function showAsignados(){
    const cat=getCat().filter(p=>p.picked);
    $('asignadosLista').innerHTML = cat.map(p=>`<li>${p.num? p.num+' — ':''}${p.nombre}</li>`).join('');
    $('asignadosResumen').textContent = cat.length? (cat.length+' persona(s) seleccionada(s)'):'';
  }
  $('btnAsignar').onclick=openSel; $('selCerrar').onclick=closeSel; $('selGuardar').onclick=()=>{ closeSel(); showAsignados(); };
  list.addEventListener('change',(e)=>{ const num=e.target.getAttribute('data-num'); if(num===null) return;
    const cat=getCat(); const idx = cat.findIndex(p=>(p.num||'')===num);
    if(idx>=0){ cat[idx].picked = e.target.checked; setCat(cat); }
  });
  showAsignados();

  function addMatRow(i, item='', qty='', note=''){ const tr=document.createElement('tr'); tr.innerHTML=`
    <td><input data-m='item' data-i='${i}' value='${item}'></td>
    <td style='width:120px'><input data-m='qty' data-i='${i}' value='${qty}'></td>
    <td><input data-m='note' data-i='${i}' value='${note}'></td>
    <td style='width:120px'><button data-m='del' data-i='${i}'>Eliminar</button></td>`; $('tbMat').appendChild(tr); }
  document.getElementById('addMat').onclick=()=>addMatRow(document.querySelectorAll('#tbMat tr').length);
  document.addEventListener('click',(e)=>{ if(e.target.getAttribute('data-m')==='del'){ const row=e.target.closest('tr'); if(row) row.remove(); }});

  function initFirma(){ const c=$('firma'); const ctx=c.getContext('2d'); let drawing=false, last=null;
    const pos=(e)=>{ const r=c.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:t.clientX-r.left,y:t.clientY-r.top}; };
    const start=(e)=>{ drawing=true; last=pos(e); };
    const move=(e)=>{ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.lineWidth=2; ctx.strokeStyle='#111'; ctx.stroke(); last=p; };
    const end=()=>{ drawing=false; };
    c.addEventListener('mousedown',start); c.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
    c.addEventListener('touchstart',start,{passive:true}); c.addEventListener('touchmove',move,{passive:true}); c.addEventListener('touchend',end);
    $('#clearFirma').onclick=()=>{ ctx.clearRect(0,0,c.width,c.height); };
    const resize=()=>{ const data=c.toDataURL(); c.width=c.clientWidth; c.height=c.clientHeight; const img=new Image(); img.onload=()=>{ ctx.drawImage(img,0,0,c.width,c.height); }; img.src=data; };
    new ResizeObserver(resize).observe(c);
  }
  initFirma();

  $('#btnImprimir').onclick=()=>window.print();
  $('#btnCompartir').onclick=()=>{
    const datos={num:$('#num').value, fecha:$('#fecha').value, area:$('#area').value, prio:$('#prio').value, lugar:$('#lugar').value, enc:$('#encargado').value, sup:$('#supervisor').value};
    const txt=`OSI ${datos.num}%0AFecha: ${datos.fecha}%0AEncargado: ${datos.enc}%0ASupervisor: ${datos.sup}%0AÁrea: ${datos.area}%0APrioridad: ${datos.prio}%0ALugar: ${datos.lugar}%0A---%0AInstrucciones:%0A`+encodeURIComponent($('#desc').value||'');
    window.open('https://wa.me/?text='+txt,'_blank');
  };

  function saveMat(){ const rows=[...document.querySelectorAll('#tbMat tr')]; return rows.map(tr=>({item: tr.querySelector('[data-m="item"]').value, qty: tr.querySelector('[data-m="qty"]').value, note: tr.querySelector('[data-m="note"]').value})) }
  $('#btnGuardar').onclick=()=>{
    const key='osi-'+$('#num').value;
    const data={
      fecha:$('#fecha').value,num:$('#num').value,encargado:$('#encargado').value,supervisor:$('#supervisor').value,
      area:$('#area').value,lugar:$('#lugar').value,prio:$('#prio').value,
      inicio:$('#inicio').value,fin:$('#fin').value,desc:$('#desc').value,mat:saveMat(),
      asignados:(getCat()||[]).filter(p=>p.picked)
    };
    ls(key,data); alert('Guardado local: '+key);
  };

  $('#force').onclick=async(e)=>{ e.preventDefault(); try{ if('caches'in window){const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k)));} if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister()));} }catch(_){}
    location.href='index.html?v=22s5&updated='+Date.now();
  };

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
  $('#asEnc').onclick=()=>role='encargado'; $('#asSup').onclick=()=>role='supervisor';
  $('#ok').onclick=async()=>{ const ok=await verify(role,$('#pin').value||''); if(!ok) return alert('PIN incorrecto'); OSI_AUTH.startSession(role,'',1/60); $('#login').style.display='none'; badge.textContent='ROL: '+role.toUpperCase(); };
  const s = OSI_AUTH.getSession(); if(!(s&&s.role)) $('#login').style.display='flex'; else badge.textContent='ROL: '+(s.role||'').toUpperCase();

  window.addEventListener('storage',(e)=>{ if(e.key==='osi-catalog-v2'){ refreshRoleSelects(); renderChecks(); showAsignados(); }});
});
