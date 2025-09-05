(function(){
  const $=id=>document.getElementById(id);

  function b64uDec(s){ return decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/')))); }

  const params=new URLSearchParams(location.search);
  let payload=null;
  try{
    const d=params.get('d');
    if(d){ payload = JSON.parse(b64uDec(d)); }
  }catch(_){}
  if(!payload){
    document.body.innerHTML='<div style="padding:24px;font-family:system-ui">No se recibieron datos de la OSI. Solicita de nuevo el enlace al encargado.</div>';
    return;
  }

  function summarize(p){
    const perso = (p.asignados||[]).map(x=>`${x.num} — ${x.nombre} — ${((x.roles||[])[0]||'')}`).join('\n');
    const mats = (p.materiales||[]).map(m=>`• ${m.item} — ${m.cant||''}`).join('\n');
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
  const summaryText = summarize(payload);
  $('summary').textContent = summaryText;

  const photos=[];
  function fileToDataURL(file, maxW=1280, cb){
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image(); img.onload=()=>{
        const w0=img.naturalWidth, h0=img.naturalHeight;
        let w=w0, h=h0; if(w>maxW){ h=Math.round(h0*maxW/w0); w=maxW; }
        const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
        cb(canvas.toDataURL('image/jpeg',0.8));
      }; img.src=reader.result;
    };
    reader.readAsDataURL(file);
  }
  function renderThumbs(){
    const wrap=$('photosWrap'); wrap.innerHTML='';
    photos.forEach((src,i)=>{
      const img=document.createElement('img'); img.className='thumb'; img.src=src; img.title='Foto '+(i+1);
      wrap.appendChild(img);
    });
  }
  $('photoInput').addEventListener('change',(e)=>{
    const files=[...(e.target.files||[])].slice(0,8 - photos.length);
    if(files.length===0) return;
    let left=files.length;
    files.forEach(f=>{
      fileToDataURL(f,1280,(data)=>{ photos.push(data); renderThumbs(); if(--left===0){ e.target.value=''; }});
    });
  });

  function buildReport(){
    return {
      osiId: payload.id,
      fecha: payload.fecha,
      supervisor: payload.supervisor||{},
      timestamp: Date.now(),
      summary: summaryText,
      done: $('done').value||'',
      issues: $('issues').value||'',
      photos: photos
    };
  }
  function downloadJSON(obj, filename){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }
  $('exportJson').onclick=()=>{
    const rep=buildReport();
    downloadJSON(rep, (rep.osiId||'OSI')+'_reporte_supervisor.json');
    $('hint').textContent='Archivo descargado. Envíalo al encargado.';
  };

  $('shareReport').onclick=async ()=>{
    const rep=buildReport();
    const blob = new Blob([JSON.stringify(rep,null,2)], {type:'application/json'});
    const file = new File([blob], (rep.osiId||'OSI')+'_reporte_supervisor.json', {type:'application/json'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({title:'Reporte OSI '+(rep.osiId||''), text:'Adjunto reporte del supervisor.', files:[file]});
        $('hint').textContent='Reporte compartido desde el dispositivo.';
      }catch(_){}
    } else {
      downloadJSON(rep, file.name);
      $('hint').textContent='Tu navegador no permite compartir archivos directamente; se descargó el .json.';
    }
  };

  $('waText').onclick=()=>{
    const txt = `Supervisor — OSI ${payload.id}\n\nResumen:\n${summaryText}\n\nReporte:\n${$('done').value||''}\n\nIncidencias:\n${$('issues').value||''}`;
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
  };
})();
