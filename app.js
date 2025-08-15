
document.addEventListener('DOMContentLoaded', () => {
  try {
    const $ = (id) => document.getElementById(id);

    const todayISO = () => new Date().toISOString().slice(0,10);
    const pad = (n, w) => String(n).padStart(w,'0');

    const getSeq = () => parseInt(localStorage.getItem('osi-seq')||'1',10);
    const setSeq = (n) => localStorage.setItem('osi-seq', String(n));
    const asignarNumero = () => { $('numeroOrden').value = 'OSI-' + pad(getSeq(), 5); };
    const nuevaOSI = () => { setSeq(getSeq()+1); limpiar(true); asignarNumero(); };

    const getCatalogo = () => { try { return JSON.parse(localStorage.getItem('osi-catalog')||'[]'); } catch(e){ return []; } };
    const setCatalogo = (arr) => localStorage.setItem('osi-catalog', JSON.stringify(arr));
    const actualizarDatalists = () => {
      const cat = getCatalogo();
      const dlPers = $('listaPersonal'), dlSup = $('listaSupervisores'), dlEnc = $('listaEncargados');
      dlPers.innerHTML = dlSup.innerHTML = dlEnc.innerHTML = '';
      const nombresUnicos = [...new Set(cat.map(p => p.nombre).filter(Boolean))];
      nombresUnicos.forEach(n => { const o = document.createElement('option'); o.value = n; dlPers.appendChild(o); });
      const sup = cat.filter(p => /supervisor|jefe|gerente/i.test(p.rol||''));
      const enc = cat.filter(p => /encargado|almac[eé]n/i.test(p.rol||''));
      [...new Set(sup.map(p=>p.nombre))].forEach(n=>{ const o=document.createElement('option');o.value=n;dlSup.appendChild(o); });
      [...new Set(enc.map(p=>p.nombre))].forEach(n=>{ const o=document.createElement('option');o.value=n;dlEnc.appendChild(o); });
    };
    const parseCSV = (text) => {
      const lines=text.split(/\r?\n/).filter(l=>l.trim().length); if(!lines.length) return [];
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
    };

    const tbody = $('tbody');
    const kpiActividades = $('kpiActividades');
    const kpiDuracion = $('kpiDuracion');

    const createRow = (data={}) => {
      data = Object.assign({tarea:'', desc:'', inicio:'', fin:'', empleados:'', materiales:''}, data);
      const tr = document.createElement('tr');
      tr.innerHTML = ''
        + '<td><input value="' + (data.tarea||'') + '" placeholder="Ej. Inventario bodega A"></td>'
        + '<td><input value="' + (data.desc||'') + '" placeholder="Instrucciones o alcance"></td>'
        + '<td><input type="time" value="' + (data.inicio||'') + '"></td>'
        + '<td><input type="time" value="' + (data.fin||'') + '"></td>'
        + '<td><input list="listaPersonal" value="' + (data.empleados||'') + '" placeholder="Nombres separados por coma"></td>'
        + '<td><input value="' + (data.materiales||'') + '" placeholder="Materiales/equipos"></td>'
        + '<td><button title="Eliminar" class="btnDel">✕</button></td>';
      tbody.appendChild(tr);
      tr.querySelector('.btnDel').addEventListener('click', () => { tr.remove(); updateKpis(); });
      updateKpis();
    };

    const updateKpis = () => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      kpiActividades.textContent = rows.length;
      let totalMin = 0;
      rows.forEach(r => {
        const i = r.children[2].querySelector('input').value;
        const f = r.children[3].querySelector('input').value;
        if(i && f){
          const [ih, im] = i.split(':').map(Number);
          const [fh, fm] = f.split(':').map(Number);
          const mins = (fh*60+fm) - (ih*60+im);
          if(mins>0) totalMin += mins;
        }
      });
      const hh = String(Math.floor(totalMin/60)).padStart(2,'0');
      const mm = String(totalMin%60).padStart(2,'0');
      kpiDuracion.textContent = hh + ':' + mm;
    };

    const inputFoto = $('fileFoto');
    const btnFoto = $('btnTomarFoto');
    const btnBorrarFotos = $('btnBorrarFotos');
    const preview = $('preview');
    let fotos = [];

    btnFoto.addEventListener('click', () => inputFoto.click());
    btnBorrarFotos.addEventListener('click', () => { fotos = []; renderFotos(); });

    inputFoto.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const dataUrl = await fileToCompressedDataURL(file, 1600, 0.85);
      fotos.push(dataUrl); renderFotos(); e.target.value = '';
    });

    const renderFotos = () => {
      preview.innerHTML = '';
      fotos.forEach((d,i) => {
        const img = document.createElement('img');
        img.src = d; img.title = 'Foto ' + (i+1);
        preview.appendChild(img);
      });
    };

    const fileToCompressedDataURL = (file, maxW, quality) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(){
        const img = new Image();
        img.onload = function(){
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if(w > maxW){ h = Math.round(h * (maxW/w)); w = maxW; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const collectData = () => {
      const rows = Array.from(tbody.querySelectorAll('tr')).map(r => ({
        tarea: r.children[0].querySelector('input').value.trim(),
        desc: r.children[1].querySelector('input').value.trim(),
        inicio: r.children[2].querySelector('input').value,
        fin: r.children[3].querySelector('input').value,
        empleados: r.children[4].querySelector('input').value.trim(),
        materiales: r.children[5].querySelector('input').value.trim(),
      }));
      return ({
        fechaEmision: $('fechaEmision').value,
        numeroOrden: $('numeroOrden').value.trim(),
        area: $('area').value,
        prioridad: $('prioridad').value,
        supervisor: $('supervisor').value.trim(),
        encargado: $('encargado').value.trim(),
        tipoTarea: $('tipoTarea').value,
        estado: $('estado').value,
        actividades: rows,
        firmaSupervisor: $('firmaSupervisor').value.trim(),
        firmaEncargado: $('firmaEncargado').value.trim(),
        observaciones: $('observaciones').value.trim(),
        fotos: fotos,
        kpis: { actividades: rows.length, duracionTotal: $('kpiDuracion').textContent }
      });
    };

    const guardarLocal = () => {
      const data = collectData();
      const key = 'osi-internal-' + (data.numeroOrden || 'temp');
      localStorage.setItem(key, JSON.stringify(data));
      alert('💾 Guardado offline como: ' + key);
    };

    const enviar = async () => {
      const data = collectData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (data.numeroOrden || 'orden') + '.json';
      a.click(); URL.revokeObjectURL(a.href);
      alert('📨 Datos preparados (JSON). Listo para integrar backend.');
    };

    const prefillFromURL = () => {
      const params = new URLSearchParams(location.search);
      if(params.get('payload')){
        try{
          const decoded = JSON.parse(atob(params.get('payload')));
          applyPrefill(decoded);
        }catch(e){ console.warn('Payload inválido'); }
      } else {
        const simple = {};
        for(const k of ['fecha','fechaEmision','osi','numeroOrden','area','prioridad','supervisor','encargado','tipoTarea','estado','observaciones']){
          if(params.get(k)) simple[k] = params.get(k);
        }
        applyPrefill(simple);
      }
    };

    const applyPrefill = (d) => {
      if(d.fecha) $('fechaEmision').value = d.fecha;
      if(d.fechaEmision) $('fechaEmision').value = d.fechaEmision;
      if(d.osi) $('numeroOrden').value = d.osi;
      if(d.numeroOrden) $('numeroOrden').value = d.numeroOrden;
      if(d.area) $('area').value = d.area;
      if(d.prioridad) $('prioridad').value = d.prioridad;
      if(d.supervisor) $('supervisor').value = d.supervisor;
      if(d.encargado) $('encargado').value = d.encargado;
      if(d.tipoTarea) $('tipoTarea').value = d.tipoTarea;
      if(d.estado) $('estado').value = d.estado;
      if(d.observaciones) $('observaciones').value = d.observaciones;
      if(Array.isArray(d.actividades)){ tbody.innerHTML=''; d.actividades.forEach(createRow); }
      updateKpis();
    };

    const buildShareURL = () => {
      const d = collectData();
      const payload = {
        numeroOrden: d.numeroOrden || undefined,
        fechaEmision: d.fechaEmision || undefined,
        area: d.area || undefined,
        prioridad: d.prioridad || undefined,
        supervisor: d.supervisor || undefined,
        encargado: d.encargado || undefined,
        tipoTarea: d.tipoTarea || undefined,
        estado: d.estado || undefined
      };
      const b64 = btoa(JSON.stringify(payload));
      const base = location.href.split('?')[0];
      return `${base}?payload=${encodeURIComponent(b64)}`;
    };

    const shareWhatsApp = () => {
      const link = buildShareURL();
      const d = collectData();
      const msg = `OSI: ${d.numeroOrden}\nÁrea: ${d.area}\nFecha: ${d.fechaEmision}\nPrioridad: ${d.prioridad}\nSupervisor: ${d.supervisor}\nLink: ${link}`;
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    };

    const shareSystem = async () => {
      const link = buildShareURL();
      const d = collectData();
      const text = `OSI: ${d.numeroOrden}\nÁrea: ${d.area}\nFecha: ${d.fechaEmision}\nPrioridad: ${d.prioridad}\nSupervisor: ${d.supervisor}\n${link}`;
      if(navigator.share){
        try{ await navigator.share({title: 'OSI ' + (d.numeroOrden||''), text, url: link}); }
        catch(e){ /* cancelado */ }
      } else {
        await navigator.clipboard.writeText(text);
        alert('🔗 Enlace copiado al portapapeles');
      }
    };

    const limpiar = (silencioso) => {
      document.querySelectorAll('input, textarea').forEach(el => { if(el.id !== 'numeroOrden') el.value=''; });
      $('fechaEmision').valueAsDate = new Date();
      tbody.innerHTML=''; createRow(); fotos=[]; renderFotos(); updateKpis();
      if(!silencioso) alert('Formulario limpio.');
    };

    $('btnAdd').addEventListener('click', () => createRow());
    $('btnGuardar').addEventListener('click', guardarLocal);
    $('btnEnviar').addEventListener('click', enviar);
    $('btnImprimir').addEventListener('click', () => window.print());
    $('btnNueva').addEventListener('click', () => nuevaOSI());
    $('btnLimpiar').addEventListener('click', () => limpiar());
    $('btnWhatsApp').addEventListener('click', () => shareWhatsApp());

    $('btnImportar').addEventListener('click', () => $('fileCSV').click());
    $('btnExportar').addEventListener('click', () => {
      const data = JSON.stringify(getCatalogo(), null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='catalogo_personal.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    $('btnLimpiarCat').addEventListener('click', () => {
      if(!confirm('¿Eliminar catálogo local de personal?')) return;
      localStorage.removeItem('osi-catalog'); actualizarDatalists(); alert('Catálogo eliminado.');
    });
    $('fileCSV').addEventListener('change', (e) => {
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=() => {
        try{
          const nuevos=parseCSV(reader.result); if(!nuevos.length) return alert('No se detectaron filas válidas.');
          const actual=getCatalogo(); const map=new Map(actual.map(p=>[String(p.nombre||'').toLowerCase(), p]));
          nuevos.forEach(p=> map.set(String(p.nombre||'').toLowerCase(), p));
          const merged=Array.from(map.values()).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)));
          setCatalogo(merged); actualizarDatalists(); alert('Catálogo actualizado: '+merged.length+' personas.');
        } catch(err){ alert('Error al importar CSV'); }
      };
      reader.readAsText(file); e.target.value='';
    });

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
    $('btnInstall').addEventListener('click', async () => {
      if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
      else alert('Si no ves el diálogo, usa "Agregar a la pantalla de inicio" del navegador.');
    });
    $('btnShareLink').addEventListener('click', shareSystem);

    $('fechaEmision').value = todayISO();
    asignarNumero();
    actualizarDatalists();
    createRow();
    prefillFromURL();
    updateKpis();

  } catch(err){
    alert('Error inicializando la app: ' + (err && err.message ? err.message : err));
    console.error(err);
  }
});
