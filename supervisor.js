
  
/* OSI IPSA - Supervisor (build iosfix4) */
(function(){
  /* ======= CONFIG ======= */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpHs5Soi5PoqhIq0io63S2xyA7a73YvbVXDVvX5lSbKEyi0D4WgZXc93GoJFcU2JwAVA/exec'; // <-- URL /exec
  const OSI_TOKEN  = '09oilmh78uyt65rfvcd326eswfnbcdawq16543890lkoijyhgtrfde';          // <-- Igual al TOKEN de GA
  const $ = id => document.getElementById(id);

  // Inactividad 5 min
  const IDLE_MS = 5 * 60 * 1000; let idleTimer=null;
  function resetIdle(){ if(idleTimer) clearTimeout(idleTimer); idleTimer=setTimeout(()=>{ alert('Sesión inactiva. Regresa desde el enlace del Encargado.'); location.replace('index.html'); }, IDLE_MS); }
  ['click','keydown','mousemove','touchstart','scroll'].forEach(e=>document.addEventListener(e,resetIdle,{passive:true})); resetIdle();

  // Decodificador robusto (iOS primero ?d=, respaldo #d=)
  function b64uToStr(s){
    s=(s||'').replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
    try{ return decodeURIComponent(escape(atob(s))); }
    catch(_){ const pad=s.length%4?4-(s.length%4):0; return decodeURIComponent(escape(atob(s+'='.repeat(pad)))); }
  }
  function getParamD(){
    const qs=new URLSearchParams(location.search); let d=qs.get('d'); if(d) return d;
    if(location.hash){ const h=location.hash.charAt(0)==='#'?location.hash.slice(1):location.hash; const hs=new URLSearchParams(h); d=hs.get('d')||h; if(d) return d; }
    return null;
  }
  function getPayloadFromURL(){ const d=getParamD(); if(!d) return null; try{ return JSON.parse(b64uToStr(d)); }catch(_){ return null; } }
  const payload=getPayloadFromURL();
  if(!payload){ document.body.innerHTML='<div style="padding:24px;font-family:system-ui">No se recibieron datos de la OSI. Solicita de nuevo el enlace al encargado.</div>'; return; }

  // Nº OSI arriba
  const osiTop=$('osiTopId'); if(osiTop) osiTop.textContent=payload.id||'';

  // Resumen
  function summarize(p){
    const perso=(p.asignados||[]).map(x=>`${x.num} — ${x.nombre} — ${((x.roles||[])[0]||'')}`).join('\n');
    const mats=(p.materiales||[]).map(m=>`• ${m.item} — ${m.cant||''}`).join('\n');
    return `OSI: ${p.id}
Fecha: ${p.fecha}
Prioridad: ${p.prioridad}
Encargado: ${p.encargado?.nombre||p.encargado?.num||''}
Supervisor: ${p.supervisor?.nombre||p.supervisor?.num||''}
Horario: ${p.iniHora||'—'} a ${p.finHora||'—'}

Instrucciones:
${p.desc||''}

Personal asignado:
${perso||'—'}

Materiales/Herramientas:
${mats||'—'}`;
  }
  const summaryText=summarize(payload);
  $('summary') && ($('summary').textContent=summaryText);

  // Fotos (comprimir)
  const photos=[];
  function fileToDataURL(file,maxW=1024,cb){
    const r=new FileReader();
    r.onload=()=>{ const img=new Image(); img.onload=()=>{
      let w=img.naturalWidth,h=img.naturalHeight; if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
      const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
      cb(c.toDataURL('image/jpeg',0.75));
    }; img.src=r.result; }; r.readAsDataURL(file);
  }
  function renderThumbs(){ const wrap=$('photosWrap'); if(!wrap) return; wrap.innerHTML=''; photos.forEach(src=>{ const i=document.createElement('img'); i.className='thumb'; i.src=src; wrap.appendChild(i); }); }
  const photoInput=$('photoInput'), cameraBtn=$('cameraBtn'); if(cameraBtn&&photoInput){ cameraBtn.addEventListener('click',()=>photoInput.click()); }
  photoInput?.addEventListener('change',e=>{
    const files=[...(e.target.files||[])].slice(0,8-photos.length); if(!files.length) return; let left=files.length;
    files.forEach(f=>fileToDataURL(f,1024,(d)=>{ photos.push(d); renderThumbs(); if(--left===0) e.target.value=''; }));
  });

  // Reporte
  function buildReport(){ return { osiId:payload.id, fecha:payload.fecha, supervisor:payload.supervisor||{}, iniHora:payload.iniHora||'', finHora:payload.finHora||'', asignados:payload.asignados||[], timestamp:Date.now(), summary:summaryText, done:($('done')?.value||''), issues:($('issues')?.value||''), photos }; }
  function downloadJSON(obj,filename){ const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800); }

  // Enviar a la nube
  $('shareReport')?.addEventListener('click', async ()=>{
    const rep=buildReport();
    try{
      const res=await fetch(SCRIPT_URL+'?token='+encodeURIComponent(OSI_TOKEN),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({...rep,token:OSI_TOKEN})});
      const j=await res.json();
      if(j.ok){ $('hint')&&($('hint').textContent='✅ Reporte enviado a la nube. El Encargado puede “Sincronizar desde la nube”.'); return; }
      throw new Error(j.error||'Error desconocido');
    }catch(err){
      $('hint')&&($('hint').textContent='No se pudo enviar a la nube ('+err.message+'). Se descargará el archivo .json para WhatsApp.');
      downloadJSON(rep,(rep.osiId||'OSI')+'_reporte_supervisor.json');
    }
  });

  // Exportar/WhatsApp
  $('exportJson')?.addEventListener('click',()=>{ const rep=buildReport(); downloadJSON(rep,(rep.osiId||'OSI')+'_reporte_supervisor.json'); $('hint')&&($('hint').textContent='Archivo descargado. Envíalo como “Documento”.'); });
  $('waText')?.addEventListener('click',()=>{
    const txt=`Supervisor — OSI ${payload.id}\n\nResumen:\n${summaryText}\n\nReporte:\n${$('done')?.value||''}\n\nIncidencias:\n${$('issues')?.value||''}\n\n(IMPORTANTE: adjunta también el archivo .json para incluir fotos)`;
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
  });
})();
