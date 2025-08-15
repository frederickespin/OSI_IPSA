function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function pad(n,w){ return String(n).padStart(w,'0'); }

// Secuencia OSI
function getSeq(){ return parseInt(localStorage.getItem('osi-seq')||'1',10); }
function setSeq(n){ localStorage.setItem('osi-seq', String(n)); }
function asignarNumero(){ document.getElementById('numeroOrden').value='OSI-'+pad(getSeq(),5); }
function nuevaOSI(){ setSeq(getSeq()+1); limpiar(true); asignarNumero(); }

// Catálogo personal
function getCatalogo(){ try{return JSON.parse(localStorage.getItem('osi-catalog')||'[]')}catch(e){return []} }
function setCatalogo(a){ localStorage.setItem('osi-catalog', JSON.stringify(a)); }
function actualizarDatalists(){
  const cat=getCatalogo();
  const dlPers=document.getElementById('listaPersonal');
  const dlSup=document.getElementById('listaSupervisores');
  const dlEnc=document.getElementById('listaEncargados');
  dlPers.innerHTML=dlSup.innerHTML=dlEnc.innerHTML='';
  const nombres=[...new Set(cat.map(p=>p.nombre).filter(Boolean))];
  nombres.forEach(n=>{ const o=document.createElement('option');o.value=n;dlPers.appendChild(o); });
  const sup=cat.filter(p=>/supervisor|jefe|gerente/i.test(p.rol||''));
  const enc=cat.filter(p=>/encargado|almac[eé]n/i.test(p.rol||''));
  [...new Set(sup.map(p=>p.nombre))].forEach(n=>{const o=document.createElement('option');o.value=n;dlSup.appendChild(o);});
  [...new Set(enc.map(p=>p.nombre))].forEach(n=>{const o=document.createElement('option');o.value=n;dlEnc.appendChild(o);});
}
function parseCSV(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim().length);
  if(!lines.length) return [];
  const delim=(text.indexOf(';')>-1 && text.indexOf(',')===-1)?';':',';
  let headers=lines[0].split(delim).map(h=>h.trim().toLowerCase());
  let start=0; if(headers.includes('nombre')||headers.includes('rol')) start=1;
  const idxNombre=headers.indexOf('nombre'); const idxRol=headers.indexOf('rol');
  const out=[];
  for(let i=start;i<lines.length;i++){
    const cols=lines[i].split(delim);
    const nombre=(idxNombre>-1?cols[idxNombre]:cols[0]||'').trim();
    const rol=(idxRol>-1?cols[idxRol]:cols[1]||'').trim();
    if(nombre) out.push({nombre,rol});
  }
  return out;
}

// Tabla actividades y KPIs
const tbody=document.getElementById('tbody');
const kpiActividades=document.getElementById('kpiActividades');
const kpiDuracion=document.getElementById('kpiDuracion');
function createRow(d){
  d=d||{tarea:'',desc:'',inicio:'',fin:'',empleados:'',materiales:''};
  const tr=document.createElement('tr');
  tr.innerHTML=''
   +'<td><input value="'+(d.tarea||'')+'" placeholder="Ej. Inventario bodega A"></td>'
   +'<td><input value="'+(d.desc||'')+'" placeholder="Instrucciones o alcance"></td>'
   +'<td><input type="time" value="'+(d.inicio||'')+'"></td>'
   +'<td><input type="time" value="'+(d.fin||'')+'"></td>'
   +'<td><input list="listaPersonal" value="'+(d.empleados||'')+'" placeholder="Nombres separados por coma"></td>'
   +'<td><input value="'+(d.materiales||'')+'" placeholder="Materiales/equipos"></td>'
   +'<td><button title="Eliminar" onclick="this.closest(\\'tr\\').remove();updateKpis();">✕</button></td>';
  tbody.appendChild(tr); updateKpis();
}
function updateKpis(){
  const rows=[...tbody.querySelectorAll('tr')];
  kpiActividades.textContent=rows.length;
  let tot=0;
  rows.forEach(r=>{
    const i=r.children[2].querySelector('input').value;
    const f=r.children[3].querySelector('input').value;
    if(i&&f){
      const [ih,im]=i.split(':').map(Number); const [fh,fm]=f.split(':').map(Number);
      const mins=(fh*60+fm)-(ih*60+im); if(mins>0) tot+=mins;
    }
  });
  const hh=String(Math.floor(tot/60)).padStart(2,'0'); const mm=String(tot%60).padStart(2,'0');
  kpiDuracion.textContent=hh+':'+mm;
}

// Fotos
const inputFoto=document.getElementById('fileFoto');
const btnFoto=document.getElementById('btnTomarFoto');
const btnBorrarFotos=document.getElementById('btnBorrarFotos');
const preview=document.getElementById('preview');
let fotos=[];
btnFoto.addEventListener('click',()=>inputFoto.click());
btnBorrarFotos.addEventListener('click',()=>{fotos=[];renderFotos();});
inputFoto.addEventListener('change',async e=>{
  const file=e.target.files[0]; if(!file) return;
  const dataUrl=await fileToCompressedDataURL(file,1600,0.85);
  fotos.push(dataUrl); renderFotos(); e.target.value='';
});
function renderFotos(){ preview.innerHTML=''; fotos.forEach((d,i)=>{const img=document.createElement('img');img.src=d;img.title='Foto '+(i+1);preview.appendChild(img);}); }
function fileToCompressedDataURL(file,maxW,q){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{ const c=document.createElement('canvas'); let w=img.width,h=img.height; if(w>maxW){h=Math.round(h*(maxW/w));w=maxW;} c.width=w;c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); res(c.toDataURL('image/jpeg',q)); }; img.onerror=rej; img.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); }); }

// Datos + guardar/enviar
function collectData(){
  const rows=[...tbody.querySelectorAll('tr')].map(r=>({ 
    tarea:r.children[0].querySelector('input').value.trim(),
    desc:r.children[1].querySelector('input').value.trim(),
    inicio:r.children[2].querySelector('input').value,
    fin:r.children[3].querySelector('input').value,
    empleados:r.children[4].querySelector('input').value.trim(),
    materiales:r.children[5].querySelector('input').value.trim(),
  }));
  return {
    fechaEmision:document.getElementById('fechaEmision').value,
    numeroOrden:document.getElementById('numeroOrden').value.trim(),
    area:document.getElementById('area').value,
    prioridad:document.getElementById('prioridad').value,
    supervisor:document.getElementById('supervisor').value.trim(),
    encargado:document.getElementById('encargado').value.trim(),
    tipoTarea:document.getElementById('tipoTarea').value,
    estado:document.getElementById('estado').value,
    actividades:rows,
    firmaSupervisor:document.getElementById('firmaSupervisor').value.trim(),
    firmaEncargado:document.getElementById('firmaEncargado').value.trim(),
    observaciones:document.getElementById('observaciones').value.trim(),
    fotos:fotos,
    kpis:{actividades:rows.length,duracionTotal:document.getElementById('kpiDuracion').textContent}
  };
}
function guardarLocal(){ const data=collectData(); const key='osi-internal-'+(data.numeroOrden||'temp'); localStorage.setItem(key, JSON.stringify(data)); alert('💾 Guardado offline como: '+key); }
async function enviar(){
  const data=collectData();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(data.numeroOrden||'orden')+'.json'; a.click(); URL.revokeObjectURL(a.href);
  alert('📨 Datos preparados (JSON). Listo para integrar con backend.');
}

// Deep links
function prefillFromURL(){
  const p=new URLSearchParams(location.search);
  if(p.get('payload')){
    try{ const d=JSON.parse(atob(p.get('payload'))); applyPrefill(d); }catch(e){ console.warn('payload inválido'); }
  }else{
    const d={}; ['fecha','fechaEmision','osi','numeroOrden','area','prioridad','supervisor','encargado','tipoTarea','estado','observaciones'].forEach(k=>{ if(p.get(k)) d[k]=p.get(k); });
    applyPrefill(d);
  }
}
function applyPrefill(d){
  if(d.fecha) document.getElementById('fechaEmision').value=d.fecha;
  if(d.fechaEmision) document.getElementById('fechaEmision').value=d.fechaEmision;
  if(d.osi) document.getElementById('numeroOrden').value=d.osi;
  if(d.numeroOrden) document.getElementById('numeroOrden').value=d.numeroOrden;
  if(d.area) document.getElementById('area').value=d.area;
  if(d.prioridad) document.getElementById('prioridad').value=d.prioridad;
  if(d.supervisor) document.getElementById('supervisor').value=d.supervisor;
  if(d.encargado) document.getElementById('encargado').value=d.encargado;
  if(d.tipoTarea) document.getElementById('tipoTarea').value=d.tipoTarea;
  if(d.estado) document.getElementById('estado').value=d.estado;
  if(d.observaciones) document.getElementById('observaciones').value=d.observaciones;
  if(Array.isArray(d.actividades)){ tbody.innerHTML=''; d.actividades.forEach(createRow); }
  updateKpis();
}

// Compartir (WhatsApp / Web Share)
function buildShareURL(){
  const d=collectData();
  const payload={
    numeroOrden:d.numeroOrden||undefined,
    fechaEmision:d.fechaEmision||undefined,
    area:d.area||undefined,
    prioridad:d.prioridad||undefined,
    supervisor:d.supervisor||undefined,
    encargado:d.encargado||undefined,
    tipoTarea:d.tipoTarea||undefined,
    estado:d.estado||undefined
  };
  const b64=btoa(JSON.stringify(payload));
  const base=location.href.split('?')[0];
  return base+'?payload='+encodeURIComponent(b64);
}
function shareWhatsApp(){
  const link=buildShareURL();
  const d=collectData();
  const msg=`OSI: ${d.numeroOrden}\nÁrea: ${d.area}\nFecha: ${d.fechaEmision}\nPrioridad: ${d.prioridad}\nSupervisor: ${d.supervisor}\nLink: ${link}`;
  const url=`https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank');
}
async function shareSystem(){
  const link=buildShareURL();
  const d=collectData();
  const text=`OSI: ${d.numeroOrden}\nÁrea: ${d.area}\nFecha: ${d.fechaEmision}\nPrioridad: ${d.prioridad}\nSupervisor: ${d.supervisor}\n${link}`;
  if(navigator.share){ try{ await navigator.share({title:'OSI '+(d.numeroOrden||''), text, url:link}); }catch(e){} }
  else{ await navigator.clipboard.writeText(text); alert('🔗 Enlace copiado'); }
}

// Limpieza / init
function limpiar(silencioso){
  document.querySelectorAll('input, textarea').forEach(el=>{ if(el.id!=='numeroOrden') el.value=''; });
  document.getElementById('fechaEmision').valueAsDate=new Date();
  tbody.innerHTML=''; createRow(); fotos=[]; renderFotos(); updateKpis();
  if(!silencioso) alert('Formulario limpio.');
}

// Eventos UI
document.getElementById('btnAdd').addEventListener('click',()=>createRow());
document.getElementById('btnGuardar').addEventListener('click',guardarLocal);
document.getElementById('btnEnviar').addEventListener('click',enviar);
document.getElementById('btnImprimir').addEventListener('click',()=>window.print());
document.getElementById('btnNueva').addEventListener('click',()=>nuevaOSI());
document.getElementById('btnLimpiar').addEventListener('click',()=>limpiar());
document.getElementById('btnWhatsApp').addEventListener('click',()=>shareWhatsApp());
document.getElementById('btnImportar').addEventListener('click',()=>document.getElementById('fileCSV').click());
document.getElementById('btnExportar').addEventListener('click',()=>{
  const data=JSON.stringify(getCatalogo(),null,2);
  const blob=new Blob([data],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='catalogo_personal.json'; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById('btnLimpiarCat').addEventListener('click',()=>{
  if(!confirm('¿Eliminar catálogo local de personal?')) return;
  localStorage.removeItem('osi-catalog'); actualizarDatalists(); alert('Catálogo eliminado.');
});
document.getElementById('fileCSV').addEventListener('change',e=>{
  const file=e.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const nuevos=parseCSV(r.result); if(!nuevos.length) return alert('No se detectaron filas válidas.');
      const actual=getCatalogo(); const map=new Map(actual.map(p=>[String(p.nombre||'').toLowerCase(),p]));
      nuevos.forEach(p=>map.set(String(p.nombre||'').toLowerCase(),p));
      const merged=[...map.values()].sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)));
      setCatalogo(merged); actualizarDatalists(); alert('Catálogo actualizado: '+merged.length+' personas.');
    }catch(err){ alert('Error al importar CSV'); }
  };
  r.readAsText(file); e.target.value='';
});

// PWA install/share
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
document.getElementById('btnInstall').addEventListener('click',async()=>{
  if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; }
  else alert('Si no ves el diálogo, usa "Agregar a la pantalla de inicio" del navegador.');
});
document.getElementById('btnShareLink').addEventListener('click', async () => {
  const link=buildShareURL();
  if(navigator.share){ try{ await navigator.share({title:'OSI - Link', url:link}); }catch(e){} }
  else{ await navigator.clipboard.writeText(link); alert('🔗 Enlace copiado:\n'+link); }
});

// Init
document.getElementById('fechaEmision').value=todayISO();
asignarNumero(); actualizarDatalists(); createRow(); prefillFromURL(); updateKpis();