(function(){
  const HIST_KEY='osi-hist-v1';
  const DRAFT_PREFIX='osi-draft-';
  const REPORTS_KEY='osi-reports-v1';
  const CURR_KEY='osi-current-id';
  const $=id=>document.getElementById(id);

  const hist=()=>JSON.parse(localStorage.getItem(HIST_KEY)||'[]');
  const reports=()=>JSON.parse(localStorage.getItem(REPORTS_KEY)||'{}');

  function render(){
    const q=($('q').value||'').toLowerCase();
    const est=$('fEstado').value||'';
    const r=hist().filter(x=>{
      const s = `${x.id} ${x.encargado||''} ${x.supervisor||''}`.toLowerCase();
      return (!q || s.includes(q)) && (!est || x.estado===est);
    }).sort((a,b)=>String(b.id).localeCompare(String(a.id)));

    const tb=$('tb'); tb.innerHTML='';
    r.forEach(x=>{
      // Refrescar estado si hay reporte
      const rep=reports()[x.id]; const estado= rep ? 'Con reporte' : x.estado||'Borrador';
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${x.id}</td>
        <td>${x.fecha||''}</td>
        <td>${x.prioridad||''}</td>
        <td>${x.encargado||''}</td>
        <td>${x.supervisor||''}</td>
        <td style="text-align:center">${x.personal||0}</td>
        <td><span class="badge state">${estado}</span></td>
        <td>
          <button class="open btn-primary" data-id="${x.id}">Abrir</button>
          <button class="view btn" data-id="${x.id}">Ver reporte</button>
        </td>`;
      tb.appendChild(tr);
    });
  }

  document.getElementById('exportCSV').onclick=()=>{
    const rows=[['Nº OSI','Fecha','Prioridad','Encargado','Supervisor','Personal','Estado']];
    hist().forEach(x=>{
      const estado=(JSON.parse(localStorage.getItem(REPORTS_KEY)||'{}')[x.id]?'Con reporte':(x.estado||'Borrador'));
      rows.push([x.id,x.fecha||'',x.prioridad||'',x.encargado||'',x.supervisor||'',String(x.personal||0),estado]);
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download='historial_osi.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };

  document.getElementById('q').addEventListener('input',render);
  document.getElementById('fEstado').addEventListener('change',render);

  document.getElementById('tb').addEventListener('click',(e)=>{
    const id=e.target.getAttribute('data-id'); if(!id) return;
    if(e.target.classList.contains('open')){
      localStorage.setItem(CURR_KEY,id);
      location.href='index.html';
    }
    if(e.target.classList.contains('view')){
      const rep=(JSON.parse(localStorage.getItem(REPORTS_KEY)||'{}'))[id];
      if(!rep){ alert('No hay reporte para esta OSI.'); return; }
      const imgs=(rep.photos||[]).map(src=>`<img src="${src}" style="max-width:220px;max-height:220px;margin:6px;border:1px solid #ddd;border-radius:8px">`).join('');
      const w=window.open('','_blank'); w.document.write(`<title>Reporte ${id}</title><body style="font-family:system-ui,Segoe UI,Roboto,Arial">
        <h2>Reporte del supervisor — ${id}</h2>
        <p><b>Fecha:</b> ${rep.fecha}</p>
        <h3>Resumen</h3><pre style="white-space:pre-wrap">${rep.summary||''}</pre>
        <h3>Realisado</h3><pre style="white-space:pre-wrap">${rep.done||''}</pre>
        <h3>Incidencias</h3><pre style="white-space:pre-wrap">${rep.issues||''}</pre>
        <h3>Fotos</h3><div>${imgs||'<i>Sin fotos</i>'}</div>
      </body>`); w.document.close();
    }
  });

  render();
})();
