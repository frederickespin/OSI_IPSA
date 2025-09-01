
document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const today=()=>new Date().toISOString().slice(0,10);
  const pad=(n,w)=>String(n).padStart(w,'0');
  const enc=(s)=>new TextEncoder().encode(s);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  // PIN hashing PBKDF2
  const loadPins=()=>{const raw=localStorage.getItem('osi-pins'); if(raw) return JSON.parse(raw);
    const init={encargado:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null},
                supervisor:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null}};
    return Promise.all([pbkdf2('1111',new Uint8Array(init.encargado.salt),init.encargado.iterations),
                        pbkdf2('2222',new Uint8Array(init.supervisor.salt),init.supervisor.iterations)]).then(([hE,hS])=>{init.encargado.hash=Array.from(new Uint8Array(hE));init.supervisor.hash=Array.from(new Uint8Array(hS));localStorage.setItem('osi-pins',JSON.stringify(init));return init;})};
  function pbkdf2(pin,salt,it){return crypto.subtle.importKey('raw',enc(pin),'PBKDF2',false,['deriveBits']).then(k=>crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:it},k,256));}
  async function verify(role,pin){const pins=await loadPins(); const m=pins[role]; const bits=await pbkdf2(pin,new Uint8Array(m.salt),m.iterations); return JSON.stringify(Array.from(new Uint8Array(bits)))===JSON.stringify(m.hash);}

  // Numeración
  function getSeq(){return parseInt(localStorage.getItem('osi-seq')||'1',10)}
  function setSeq(n){localStorage.setItem('osi-seq',String(n))}
  function asignarNumero(){ $('#num').value='OSI-'+pad(getSeq(),5) }

  // Catálogo de personal
  function getCat(){return ls('osi-catalog')||[]}
  function setCat(arr){ls('osi-catalog',arr)}
  function upsertEncargadoSelect(){ const sel=$('encargado'); const cat=getCat().filter(p=>p.creadorOSI&&p.activo!==false);
    sel.innerHTML='<option value="">—</option>'+cat.map(p=>`<option>${p.nombre}</option>`).join(''); }
  function renderPersonalTable(){ const tbody=$('tbPersonal'); if(!tbody) return; tbody.innerHTML=''; const cat=getCat();
    cat.forEach((p,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`
      <td style='text-align:center'><input type='checkbox' data-act='pick' data-i='${i}' ${p.picked? 'checked':''}></td>
      <td><input data-k='nombre' data-i='${i}' value='${p.nombre||''}'></td>
      <td><select data-k='rol' data-i='${i}'>
            <option ${p.rol==='Operario'?'selected':''}>Operario</option>
            <option ${p.rol==='Supervisor'?'selected':''}>Supervisor</option>
            <option ${p.rol==='Encargado'?'selected':''}>Encargado</option>
            <option ${p.rol==='Administración'?'selected':''}>Administración</option>
          </select></td>
      <td style='text-align:center'><input type='checkbox' data-k='creadorOSI' data-i='${i}' ${p.creadorOSI? 'checked':''}></td>
      <td style='text-align:center'><input type='checkbox' data-k='activo' data-i='${i}' ${p.activo!==false? 'checked':''}></td>
      <td><button data-act='dup' data-i='${i}'>Duplicar</button> <button data-act='del' data-i='${i}'>Eliminar</button></td>`;
      tbody.appendChild(tr); });
  }
  function openPersonal(){ const m=$('modalPersonal'); if(!m) return; m.style.display='flex'; renderPersonalTable(); upsertEncargadoSelect(); }
  function closePersonal(){ const m=$('modalPersonal'); if(!m) return; m.style.display='none'; renderPersonalTable(); upsertEncargadoSelect(); showAsignados(); }

  // Asignados
  function showAsignados(){ const cat=getCat().filter(p=>p.picked); const list=$('asignadosLista'); if(list) list.innerHTML=cat.map(p=>`<li>${p.nombre} — ${p.rol}</li>`).join(''); const res=$('asignadosResumen'); if(res) res.textContent = cat.length? (cat.length+' persona(s) seleccionada(s)'):''; }

  // Materiales
  function addMatRow(i, item='', qty='', note=''){ const tr=document.createElement('tr'); tr.innerHTML=`
    <td><input data-m='item' data-i='${i}' value='${item}'></td>
    <td style='width:120px'><input data-m='qty' data-i='${i}' value='${qty}'></td>
    <td><input data-m='note' data-i='${i}' value='${note}'></td>
    <td style='width:120px'><button data-m='del' data-i='${i}'>Eliminar</button></td>`; $('tbMat').appendChild(tr); }
  function saveMat(){ const rows=[...document.querySelectorAll('#tbMat tr')]; return rows.map(tr=>({item: tr.querySelector('[data-m="item"]').value,
      qty: tr.querySelector('[data-m="qty"]').value, note: tr.querySelector('[data-m="note"]').value})) }
  function loadMat(list){ $('tbMat').innerHTML=''; (list||[]).forEach((r,i)=>addMatRow(i,r.item||'',r.qty||'',r.note||'')); }

  // Firma
  function initFirma(){ const c=$('firma'); const ctx=c.getContext('2d'); let drawing=false, last=null;
    function pos(e){ const r=c.getBoundingClientRect(); const t = (e.touches? e.touches[0]: e); return {x: t.clientX - r.left, y: t.clientY - r.top}; }
    function start(e){ drawing=true; last=pos(e); }
    function move(e){ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.lineWidth=2; ctx.strokeStyle='#111'; ctx.stroke(); last=p; }
    function end(){ drawing=false; }
    c.addEventListener('mousedown',start); c.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
    c.addEventListener('touchstart',start,{passive:true}); c.addEventListener('touchmove',move,{passive:true}); c.addEventListener('touchend',end);
    $('clearFirma').onclick=()=>{ ctx.clearRect(0,0,c.width,c.height); };
    const resize=()=>{ const data=c.toDataURL(); c.width=c.clientWidth; c.height=c.clientHeight; const img=new Image(); img.onload=()=>{ ctx.drawImage(img,0,0,c.width,c.height); }; img.src=data; };
    new ResizeObserver(resize).observe(c);
  }

  // Compartir WhatsApp
  function shareWA(){ const datos={num:$('#num').value, fecha:$('#fecha').value, area:$('#area').value, prio:$('#prio').value, lugar:$('#lugar').value};
    const txt=`OSI ${datos.num}%0AFecha: ${datos.fecha}%0AÁrea: ${datos.area}%0APrioridad: ${datos.prio}%0ALugar: ${datos.lugar}%0A---%0AInstrucciones:%0A`+encodeURIComponent($('#desc').value||'');
    window.open('https://wa.me/?text='+txt,'_blank'); }

  // Guardar local (solo Encargado)
  function guardar(){ const key='osi-'+$('#num').value; const data={fecha:$('#fecha').value,num:$('#num').value,encargado:$('#encargado').value,area:$('#area').value,lugar:$('#lugar').value,prio:$('#prio').value,
      inicio:$('#inicio').value,fin:$('#fin').value,desc:$('#desc').value,mat:saveMat(),asignados:getCat().filter(p=>p.picked)}; ls(key,data); alert('Guardado local: '+key); }

  // Cache reset
  async function forceRefresh(){ try{ if('caches'in window){const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k)));} if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister()));} }catch(_){}
    location.href='index.html?v=22s3&updated='+Date.now(); }

  // Aplicar permisos por rol (supervisor no puede guardar ni editar campos principales)
  function applyRolePermissions(role){
    const isSup = role==='supervisor';
    const editableIds = ['fecha','encargado','area','lugar','prio','inicio','fin','desc'];
    editableIds.forEach(id=>{ const el=$('#'+id); if(el){ el.disabled = isSup; }});
    const btnGuardar = $('#btnGuardar'); if (btnGuardar) btnGuardar.style.display = isSup ? 'none' : '';
    const addMat = $('#addMat'); if (addMat) addMat.disabled = isSup;
    // Material inputs
    [...document.querySelectorAll('[data-m]')].forEach(el=>el.disabled = isSup);
  }

  // Init
  $('#fecha').value=today(); asignarNumero(); initFirma();
  $('#btnImprimir').onclick=()=>window.print();
  $('#btnCompartir').onclick=shareWA;
  $('#btnGuardar').onclick=guardar;
  $('#force').onclick=(e)=>{e.preventDefault(); forceRefresh();};
  $('#addMat').onclick=()=>addMatRow(document.querySelectorAll('#tbMat tr').length);

  // Personal modal
  $('#btnAsignar').onclick=openPersonal;
  const pc = document.getElementById('pCerrar'); if(pc) pc.onclick=closePersonal;
  const pa = document.getElementById('pAgregar'); if(pa) pa.onclick=()=>{ const nombre=$('#pNombre').value.trim(); if(!nombre) return alert('Escribe un nombre');
    const cat=getCat(); cat.push({nombre,rol:$('#pRol').value,creadorOSI:$('#pCreador').checked,activo:true,picked:false}); setCat(cat);
    $('#pNombre').value=''; $('#pCreador').checked=false; $('#pRol').value='Operario'; renderPersonalTable(); upsertEncargadoSelect(); };

  document.addEventListener('click',(e)=>{ const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    const act=e.target.getAttribute('data-act'); const k=e.target.getAttribute('data-k');
    if(e.target.type==='checkbox' && k){ cat[idx][k]=e.target.checked; setCat(cat); upsertEncargadoSelect(); return; }
    if(k && e.target.tagName==='INPUT'){ cat[idx][k]=e.target.value; setCat(cat); return; }
    if(k && e.target.tagName==='SELECT'){ cat[idx][k]=e.target.value; setCat(cat); return; }
    if(act==='del'){ if(!confirm('Eliminar a '+(cat[idx].nombre||'')+'?')) return; cat.splice(idx,1); setCat(cat); renderPersonalTable(); upsertEncargadoSelect(); showAsignados(); return; }
    if(act==='dup'){ cat.push(Object.assign({},cat[idx],{nombre:(cat[idx].nombre||'')+' (copia)'})); setCat(cat); renderPersonalTable(); return; }
    if(act==='pick'){ cat[idx].picked = e.target.checked; setCat(cat); showAsignados(); return; }
  });

  if(!getCat()) setCat([]); renderPersonalTable(); upsertEncargadoSelect(); showAsignados();

  // Roles / login
  let role='encargado'; const badge=$('badgeRol');
  $('#asEnc').onclick=()=>role='encargado'; $('#asSup').onclick=()=>role='supervisor';
  $('#ok').onclick=async()=>{ const pin=$('#pin').value||''; const ok=await verify(role,pin); if(!ok) return alert('PIN incorrecto'); OSI_AUTH.startSession(role,'',1/60); $('#login').style.display='none'; badge.textContent='ROL: '+role.toUpperCase(); applyRolePermissions(role); };
  const s = OSI_AUTH.getSession(); if(!(s&&s.role)) $('#login').style.display='flex'; else { badge.textContent='ROL: '+(s.role||'').toUpperCase(); applyRolePermissions(s.role); }

  // Abrir personal automáticamente si viene ?open=personal
  const params = new URLSearchParams(location.search); if(params.get('open')==='personal') openPersonal();
});
