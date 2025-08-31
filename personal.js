
document.addEventListener('DOMContentLoaded', () => {
  OSI_AUTH.init({ idleMs: 60000, heartbeatMs: 15000, endOnClose: true });

  const $ = id => document.getElementById(id);
  const getCat = () => { try { return JSON.parse(localStorage.getItem('osi-catalog')||'[]'); } catch(e){ return []; } };
  const setCat = (arr) => localStorage.setItem('osi-catalog', JSON.stringify(arr));

  function render(){
    const tb = $('tbody'); tb.innerHTML = '';
    const cat = getCat().slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||'')));
    cat.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input data-k="nombre" data-idx="${idx}" value="${p.nombre||''}"></td>
        <td>
          <select data-k="rol" data-idx="${idx}">
            <option ${p.rol==='Operario'?'selected':''}>Operario</option>
            <option ${p.rol==='Supervisor'?'selected':''}>Supervisor</option>
            <option ${p.rol==='Encargado'?'selected':''}>Encargado</option>
            <option ${p.rol==='Administración'?'selected':''}>Administración</option>
          </select>
        </td>
        <td style="text-align:center"><input type="checkbox" data-k="creadorOSI" data-idx="${idx}" ${p.creadorOSI? 'checked':''}></td>
        <td style="text-align:center"><input type="checkbox" data-k="activo" data-idx="${idx}" ${p.activo!==false? 'checked':''}></td>
        <td>
          <button data-act="dup" data-idx="${idx}">Duplicar</button>
          <button data-act="del" data-idx="${idx}">Eliminar</button>
        </td>
      `;
      tb.appendChild(tr);
    });
  }

  function add(){
    const nombre = $('nombre').value.trim();
    const rol = $('rol').value;
    const creador = $('creador').checked;
    const activo = $('activo').checked;
    if(!nombre) return alert('Escribe un nombre');
    const cat = getCat();
    cat.push({nombre, rol, creadorOSI: creador, activo});
    setCat(cat);
    $('nombre').value = ''; $('creador').checked = false; $('activo').checked = true; $('rol').value='Operario';
    render();
  }

  document.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    const idx = +e.target.dataset.idx;
    if(k===undefined || isNaN(idx)) return;
    const cat = getCat();
    if(!cat[idx]) return;
    if(e.target.type === 'checkbox'){
      cat[idx][k] = e.target.checked;
    } else {
      cat[idx][k] = e.target.value;
    }
    setCat(cat);
  });

  document.addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    const idx = +e.target.dataset.idx;
    if(act==='del'){
      const cat = getCat();
      if(!cat[idx]) return;
      if(!confirm('¿Eliminar a ' + (cat[idx].nombre||'') + '?')) return;
      cat.splice(idx,1); setCat(cat); render();
    } else if(act==='dup'){
      const cat = getCat(); if(!cat[idx]) return;
      const p = Object.assign({}, cat[idx], {nombre: (cat[idx].nombre||'') + ' (copia)'});
      cat.push(p); setCat(cat); render();
    }
  });

  // Si la sesión termina, podemos redirigir
  window.addEventListener('osi:session-ended', ()=>{
    alert('Sesión finalizada por inactividad.');
    location.href = 'index.html';
  });

  render();
});
