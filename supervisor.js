(function(){
  const $=id=>document.getElementById(id);

  // ⬇️ Pega aquí tu URL y token
  const SCRIPT_URL = https://script.google.com/macros/s/AKfycbwpHs5Soi5PoqhIq0io63S2xyA7a73YvbVXDVvX5lSbKEyi0D4WgZXc93GoJFcU2JwAVA/exec;
  const OSI_TOKEN  = AKfycbwpHs5Soi5PoqhIq0io63S2xyA7a73YvbVXDVvX5lSbKEyi0D4WgZXc93GoJFcU2JwAVA;

  function b64uDec(s){ return decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/')))); }
  function getPayloadFromURL(){
    const qs=new URLSearchParams(location.search);
    let d=qs.get('d');
    if(!d && location.hash){
      const h=location.hash.startsWith('#')? location.hash.slice(1) : location.hash;
      const hs=new URLSearchParams(h);
      d=hs.get('d') || h;
    }
    if(!d) return null;
    try{ return JSON.parse(b64uDec(d)); }catch(_){ return null; }
  }
  const payload=getPayloadFromURL();
  if(!payload){
    document.body.innerHTML='<div style="padding:24px;font-family:system-ui">No se recibieron datos de la OSI. Solicita de nuevo el enlace al encargado.</div>';
    return;
  }

  function summarize(p){
    const perso=(p.asignados||[]).map(x=>`${x.num} — ${x.nombre} — ${((x.roles||[])[0]||'')}`).join('\n');
    const mats=(p.materiales||[]).map(m=>`• ${m.item} — ${m.cant||''}`).join('\n');
    return (
`OSI: ${p.id}
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
${mats||'—'}`
    );
  }
  const summaryText=summarize(payload);
  $('summary').textContent=summaryText;

  // Fotos (comprime a 1024 px máx, calidad 75%)
  const photos=[];
  function fileToDataURL(file,maxW=1024,cb){
    const r=new FileReader();
    r.onload=()=>{ const img=new Image(); img.onload=()=>{
      let w=img.naturalWidth,h=img.naturalHeight; if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
      const c=document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,w,h);
      cb(c.toDataURL('image/jpeg',0.75));
    }; img.src=r.result; }; r.readAsDataURL(file);
  }
  function renderThumbs(){ const wrap=$('photosWrap'); wrap.innerHTML=''; photos.forEach(src=>{ const i=document.createElement('img'); i.className='thumb'; i.src=src; wrap.appendChild(i); }); }
  $('photoInput').addEventListener('change',e=>{
    const files=[...(e.target.files||[])].slice(0,8-photos.length); if(files.length===0) return;
    let left=files.length; files.forEach(f=>fileToDataURL(f,1024,(d)=>{ photos.push(d); renderThumbs(); if(--left===0) e.target.value=''; }));
  });

  function buildReport(){
    return { osiId:payload.id, fecha:payload.fecha, supervisor:payload.supervisor||{}, timestamp:Date.now(),
             summary:summaryText, done:($('done').value||''), issues:($('issues').value||''), photos };
  }
  function downloadJSON(obj, filename){
    const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  // Enviar a la nube (POST text/plain para evitar preflight)
  $('shareReport').onclick = async ()=>{
    const rep = buildReport();
    try{
      const res = await fetch(SCRIPT_URL + '?token=' + encodeURIComponent(OSI_TOKEN), {
        method:'POST',
        headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({...rep, token: OSI_TOKEN})
      });
      const j = await res.json();
      if (j.ok){
        $('hint').textContent = '✅ Reporte enviado a la nube. El Encargado puede “Sincronizar desde la nube”.';
        return;
      }
      throw new Error(j.error || 'Error desconocido');
    }catch(err){
      $('hint').textContent = 'No se pudo enviar a la nube ('+err.message+'). Se descargará el archivo para enviarlo por WhatsApp como “Documento”.';
      downloadJSON(rep,(rep.osiId||'OSI')+'_reporte_supervisor.json');
    }
  };

  // Descarga local (respaldo)
  $('exportJson').onclick=()=>{ const rep=buildReport(); downloadJSON(rep,(rep.osiId||'OSI')+'_reporte_supervisor.json'); $('hint').textContent='Archivo descargado. Envíalo al Encargado como “Documento”.'; };

  // Texto por WhatsApp (sin fotos)
  $('waText').onclick=()=>{ const txt=`Supervisor — OSI ${payload.id}\n\nResumen:\n${summaryText}\n\nReporte:\n${$('done').value||''}\n\nIncidencias:\n${$('issues').value||''}\n\n(IMPORTANTE: adjunta también el archivo .json para incluir fotos)`; window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); };
})();
