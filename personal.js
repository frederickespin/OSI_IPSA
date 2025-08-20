
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const getCat = () => { try { return JSON.parse(localStorage.getItem('osi-catalog')||'[]'); } catch(e){ return []; } };
  const setCat = (arr) => localStorage.setItem('osi-catalog', JSON.stringify(arr));
  const render = () => {
    const ul = $('lista'); ul.innerHTML = '';
    const cat = getCat().slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)));
    cat.forEach((p, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <input type="checkbox" ${p.activo!==false?'checked':''} data-idx="${idx}">
        <div style="flex:1 1 0">
          <div><strong>${p.nombre||''}</strong></div>
          <div class="muted">${p.rol||''}</div>
        </div>
        <button data-del="${idx}">Eliminar</button>
      `;
      ul.appendChild(li);
    });
  };
  const add = () => {
    const nombre = $('nombre').value.trim();
    const rol = $('rol').value;
    if(!nombre) return alert('Escribe un nombre');
    const cat = getCat(); cat.push({nombre, rol, activo:true});
    setCat(cat); $('nombre').value=''; render();
  };
  $('btnAgregar').addEventListener('click', add);
  $('lista').addEventListener('change', (e) => {
    if(e.target.matches('input[type="checkbox"]')){
      const idx = +e.target.dataset.idx;
      const cat = getCat(); if(!cat[idx]) return;
      cat[idx].activo = e.target.checked; setCat(cat);
    }
  });
  $('lista').addEventListener('click', (e) => {
    if(e.target.dataset.del){
      const idx = +e.target.dataset.del;
      const cat = getCat(); if(!cat[idx]) return;
      if(!confirm('¿Eliminar a ' + (cat[idx].nombre||'') + '?')) return;
      cat.splice(idx,1); setCat(cat); render();
    }
  });
  $('btnEliminarSel').addEventListener('click', () => {
    const cat = getCat().filter(p=>p.activo!==true); setCat(cat); render();
  });
  $('btnMarcarTodos').addEventListener('click', () => {
    const cat = getCat().map(p=>Object.assign(p,{activo:true})); setCat(cat); render();
  });
  $('btnDesmarcarTodos').addEventListener('click', () => {
    const cat = getCat().map(p=>Object.assign(p,{activo:false})); setCat(cat); render();
  });
  render();
});
