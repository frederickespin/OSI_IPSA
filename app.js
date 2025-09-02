document.addEventListener('DOMContentLoaded',()=>{
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  const TASKS_KEY='osi-tasks-v1';
  const MATS_KEY='osi-mats-v1';
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);

  // --- Roles base ---
  function ensureRoles(){
    let roles = ls(ROLES_KEY);
    if(!Array.isArray(roles) || roles.length===0){
      roles = ['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
    } else {
      CORE_ROLES.forEach(r=>{ if(!roles.includes(r)) roles.unshift(r); });
      if(!roles.includes('Mantenimiento')) roles.push('Mantenimiento');
      roles = Array.from(new Set(roles.map(r=>String(r).trim()).filter(Boolean)));
    }
    ls(ROLES_KEY, roles);
    try{ localStorage.setItem('osi-roles-ping', String(Date.now())); }catch(_){}
    return roles;
  }
  const getRoles=()=>ensureRoles();

  // --- Fecha del día y correlativo ---
  const today = ()=>{ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
  const setToday=()=>{ const t=today(); const f=$('fecha'); if(f){f.value=t; f.min=t; f.max=t;} };
  setToday(); setTimeout(setToday,100);

  const pad=(n,w)=>String(n).padStart(w,'0'); const seq=()=>parseInt(localStorage.getItem('osi-seq')||'3',10);
  if($('num')) $('num').value='OSI-'+pad(seq(),5);

  // --- Catálogo de personal ---
  function getCat(){ return ls(CAT_KEY)||[] }
  function setCat(a){ ls(CAT_KEY,a); try{localStorage.setItem('osi-cat-ping', String(Date.now()));}catch(_){ } }

  if(!ls(CAT_KEY)){
    setCat([
      {num:'E-010', nombre:'Ana Encargada', roles:['Encargado'], activo:true},
      {num:'S-020', nombre:'Samuel Supervisor', roles:['Supervisor'], activo:true},
      {num:'C-100', nombre:'Carlos Chofer', roles:['Chofer','Operario'], activo:true},
      {num:'E-200', nombre:'Elena Empacadora', roles:['Empacador','Operario'], activo:true},
      {num:'M-300', nombre:'Mario Mecánico', roles:['Mecánico','Operario'], activo:true},
      {num:'K-400', nombre:'Karla Carpintera', roles:['Carpintero','Operario'], activo:true},
      {num:'MT-500', nombre:'Miguel Mantenimiento', roles:['Mantenimiento','Operario'], activo:true}
    ]);
  }

  function byRole(role){ return getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role)); }
  function fillSelectByRole(selectId, role){
    const sel=$(selectId); if(!sel) return;
    const list = byRole(role);
    sel.innerHTML = '<option value="">—</option>' + list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){ fillSelectByRole('encargado','Encargado'); fillSelectByRole('supervisor','Supervisor'); }

  // --- Materiales (solo Ítem y Cantidad) ---
  function mats(){ return ls(MATS_KEY)||[] }
  function setMats(a){ ls(MATS_KEY,a) }
  function renderMats(){
    const tb=$('tbMat'); if(!tb) return; tb.innerHTML='';
    mats().forEach((m,i)=>{
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td><input class="tbl-input" data-m="${i}" data-k="item" value="${m.item||''}"></td>
        <td style="width:160px"><input class="tbl-input" data-m="${i}" data-k="cant" value="${m.cant||''}"></td>`;
      tb.appendChild(tr);
    });
  }
  const btnMatAdd=$('matAdd'); if(btnMatAdd){ btnMatAdd.onclick=()=>{ const a=mats(); a.push({item:'',cant:''}); setMats(a); renderMats(); }; }
  document.addEventListener('input',(e)=>{
    if(e.target.hasAttribute('data-m')){
      const i=+e.target.getAttribute('data-m'); const k=e.target.getAttribute('data-k');
      const a=mats(); if(!a[i]) return; a[i][k]=e.target.value; setMats(a);
    }
  });

  // --- Gestión / Selección en modal ---
  const modalGest=$('modalGestion');
  const empRolesSel=$('empRolesSel');
  const tb=$('tbPersonal');

  function fillRolesMulti(selEl, selected){
    const roles=getRoles();
    const set = new Set(selected||[]);
    selEl.innerHTML = roles.map(r=>`<option value="${r}" ${set.has(r)?'selected':''}>${r}</option>`).join('');
  }

  function renderTabla(filter=''){
    const cat=getCat();
    const q=(filter||'').toLowerCase();
    tb.innerHTML='';
    cat.forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const rolesBadges=(p.roles||[]).map(r=>`<span class="badge badge-role">${r}</span>`).join(' ');
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input class="sm selPick" type="checkbox" data-i="${i}" ${p.picked?'checked':''}></td>
        <td><input class="tbl-input" data-i="${i}" data-k="num" value="${p.num||''}"></td>
        <td><input class="tbl-input" data-i="${i}" data-k="nombre" value="${p.nombre||''}"></td>
        <td>${rolesBadges}<br><small class="sub">(edita roles al agregar)</small></td>
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>`;
      tb.appendChild(tr);
    });
  }

  $('navGestion').onclick=()=>{ modalGest.style.display='flex'; fillRolesMulti(empRolesSel, []); renderTabla(); };
  $('gCerrar').onclick=()=>{ modalGest.style.display='none'; };
  $('gAplicar').onclick=()=>{ modalGest.style.display='none'; showAsignados(); buildTaskCards(); };

  $('empAgregar').onclick=()=>{
    const num=$('empNum').value.trim(), nombre=$('empNombre').value.trim();
    const roles=[...empRolesSel.selectedOptions].map(o=>o.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo son obligatorios');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe un No. de empleado igual');
    cat.push({num,nombre,roles,activo:true}); setCat(cat);
    $('empNum').value=''; $('empNombre').value=''; [...empRolesSel.options].forEach(o=>o.selected=false);
    renderTabla(); refreshEncSup();
  };
  $('busca').addEventListener('input', (e)=>{ renderTabla(e.target.value||''); });

  document.addEventListener('change',(e)=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.classList.contains('selPick')){
      cat[idx].picked = e.target.checked; setCat(cat); return;
    }
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox'){ cat[idx][k]=e.target.checked; }
      else { cat[idx][k]=e.target.value; }
      setCat(cat);
    }
  });

  // --- Resumen de asignados en portada ---
  function showAsignados(){
    const sel = getCat().filter(p=>p.picked);
    const ul=$('asignadosLista'); const rs=$('asignadosResumen');
    ul.innerHTML = sel.map(p=>{
      const rol = (p.roles&&p.roles[0])? p.roles[0] : '—';
      return `<li>${p.num} — ${p.nombre} — <span class="badge badge-role">${rol}</span></li>`;
    }).join('');
    rs.textContent = sel.length? (sel.length+' seleccionado(s)'):'';
  }

  // --- Tareas por persona + evidencia fotográfica ---
  function getTaskMap(){ return ls(TASKS_KEY)||{} }
  function setTaskMap(m){ ls(TASKS_KEY,m) }

  function fileToDataURL(file, maxW=1280, cb){
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image(); img.onload=()=>{
        const w0=img.naturalWidth, h0=img.naturalHeight;
        let w=w0, h=h0;
        if(w>maxW){ h=Math.round(h0*maxW/w0); w=maxW; }
        const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
        const data=canvas.toDataURL('image/jpeg',0.8);
        cb(data);
      }; img.src=reader.result;
    };
    reader.readAsDataURL(file);
  }

  function buildTaskCards(){
    const wrap=$('tareasWrap'); if(!wrap) return; wrap.innerHTML='';
    const map=getTaskMap();
    getCat().filter(p=>p.picked).forEach(p=>{
      const key=p.num; const t = map[key] || {desc:'',ini:'',fin:'',photo:''};
      const card=document.createElement('div'); card.className='task-card';
      card.innerHTML=`
        <div class="top"><span class="badge">${p.num} — ${p.nombre}</span> ${(p.roles||[]).map(r=>`<span class="badge badge-role">${r}</span>`).join('')}</div>
        <textarea placeholder="Actividad / tarea específica para esta persona" data-num="${key}" data-k="desc">${t.desc||''}</textarea>
        <div class="grid3">
          <div class="field"><label>Inicio</label><input type="datetime-local" data-num="${key}" data-k="ini" value="${t.ini||''}"></div>
          <div class="field"><label>Fin</label><input type="datetime-local" data-num="${key}" data-k="fin" value="${t.fin||''}"></div>
          <div class="field"><label>Evidencia (foto)</label>
            <div class="photo-ctrls">
              ${t.photo? `<img src="${t.photo}" class="thumb" id="prev-${key}">` : `<img class="thumb" id="prev-${key}" style="display:none">`}
              <input type="file" accept="image/*" capture="environment" data-num="${key}" data-k="photoFile">
              <button class="btn" data-act="delPhoto" data-num="${key}">Quitar foto</button>
            </div>
          </div>
        </div>`;
      wrap.appendChild(card);
    });
  }

  document.addEventListener('input',(e)=>{
    if(e.target.hasAttribute('data-num') && e.target.hasAttribute('data-k')){
      const num=e.target.getAttribute('data-num'); const k=e.target.getAttribute('data-k');
      if(k==='photoFile'){ return; } // se maneja en change
      const map=getTaskMap(); map[num]=map[num]||{desc:'',ini:'',fin:'',photo:''}; map[num][k]=e.target.value; setTaskMap(map);
    }
  });

  document.addEventListener('change',(e)=>{
    if(e.target.getAttribute('data-k')==='photoFile' && e.target.files && e.target.files[0]){
      const num=e.target.getAttribute('data-num'); const file=e.target.files[0];
      fileToDataURL(file, 1280, (data)=>{
        const map=getTaskMap(); map[num]=map[num]||{}; map[num].photo=data; setTaskMap(map);
        const prev=document.getElementById('prev-'+num); if(prev){ prev.src=data; prev.style.display='block'; }
      });
    }
  });

  document.addEventListener('click',(e)=>{
    if(e.target.getAttribute('data-act')==='delPhoto'){
      const num=e.target.getAttribute('data-num'); const map=getTaskMap(); if(map[num]){ delete map[num].photo; setTaskMap(map); }
      const prev=document.getElementById('prev-'+num); if(prev){ prev.removeAttribute('src'); prev.style.display='none'; }
    }
  });

  // --- Barra inferior ---
  $('navGestion').onclick=()=>{ modalGest.style.display='flex'; fillRolesMulti(empRolesSel, []); renderTabla(); };
  $('gCerrar').onclick=()=>{ modalGest.style.display='none'; };
  $('gAplicar').onclick=()=>{ modalGest.style.display='none'; showAsignados(); buildTaskCards(); };

  $('navShare').onclick=()=>{ const txt=encodeURIComponent('OSI — gestión de personal (PWA)'); window.open('https://wa.me/?text='+txt,'_blank'); };
  $('navPrint').onclick=()=>window.print();
  $('navConfig').onclick=()=>{ window.location.href='settings.html?v=v1k'; };

  // Inicial
  refreshEncSup(); renderMats(); showAsignados(); buildTaskCards();
});
