
 // app_vfix4.js — build fix4 (corrige 1..9)
document.addEventListener('DOMContentLoaded', () => {

 * ========= CONFIG ========= */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpHs5Soi5PoqhIq0io63S2xyA7a73YvbVXDVvX5lSbKEyi0D4WgZXc93GoJFcU2JwAVA/exec'; // <-- Pega tu URL /exec
  const OSI_TOKEN  = '09oilmh78uyt65rfvcd326eswfnbcdawq16543890lkoijyhgtrfde';          // <-- Mismo TOKEN del GAS


  /* ===== Utilidades ===== */
  const $=id=>document.getElementById(id);
  const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
  const pad=(n,w)=>String(n).padStart(w,'0');

  /* ===== Fecha del día (iOS-safe) ===== */
  const today = ()=> {
    const d=new Date();
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  const setToday=()=>{ const f=$('fecha'); if(f){ const t=today(); f.value=t; f.min=t; f.max=t; } };

  /* ===== OSI correlativo visible ===== */
  const SEQ_KEY='osi-seq';
  const currentSeq=()=> parseInt(localStorage.getItem(SEQ_KEY)||'0',10);
  const formatId=n=>'OSI-'+pad(n,5);
  const showNext=()=>{ const n=currentSeq()+1; $('num').value=formatId(n); };
  const bumpSeqFromVisible=()=>{
    const m=$('num').value.match(/^OSI-(\d+)$/); if(m){ const n=+m[1]; if(n>currentSeq()) localStorage.setItem(SEQ_KEY,String(n)); }
  };

  /* ===== Roles / Personal (semilla + filtros) ===== */
  const ROLES_KEY='osi-roles-master-v1';
  const CAT_KEY='osi-personal-v1';
  const CORE_ROLES=['Encargado','Supervisor'];
  function ensureRoles(){
    let roles=ls(ROLES_KEY);
    if(!Array.isArray(roles)||!roles.length) roles=['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
    CORE_ROLES.forEach(r=>{ if(!roles.includes(r)) roles.unshift(r); });
    ls(ROLES_KEY,[...new Set(roles)]);
    return ls(ROLES_KEY);
  }
  if(!ls(CAT_KEY)){
    ls(CAT_KEY,[
      {num:'E-010',nombre:'Ana Encargada',roles:['Encargado'],activo:true},
      {num:'S-020',nombre:'Samuel Supervisor',roles:['Supervisor'],activo:true},
      {num:'C-100',nombre:'Carlos',roles:['Chofer','Operario'],activo:true},
      {num:'E-200',nombre:'Elena',roles:['Empacador','Operario'],activo:true},
      {num:'M-300',nombre:'Mario',roles:['Mecánico','Operario'],activo:true},
      {num:'K-400',nombre:'Karla',roles:['Carpintero','Operario'],activo:true}
    ]);
  }
  const getCat=()=>ls(CAT_KEY)||[];
  const setCat=a=>ls(CAT_KEY,a);

  function optionsByRole(role){
    const list=getCat().filter(p=>p.activo!==false && (p.roles||[]).includes(role));
    return '<option value="">—</option>'+list.map(p=>`<option value="${p.num}">${p.num} — ${p.nombre}</option>`).join('');
  }
  function refreshEncSup(){
    $('encargado').innerHTML=optionsByRole('Encargado');
    $('supervisor').innerHTML=optionsByRole('Supervisor');
  }

  /* ===== Materiales (Ítem + Cantidad) ===== */
  const MATS_KEY='osi-mats-v1';
  const mats=()=>ls(MATS_KEY)||[];
  const setMats=a=>ls(MATS_KEY,a);
  function ensureOneMat(){ if(mats().length===0) setMats([{item:'',cant:''}]); }
  function renderMats(){
    ensureOneMat();
    const tb=$('tbMat'); tb.innerHTML='';
    mats().forEach((m,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td><input class="tbl-input" data-m="${i}" data-k="item" value="${m.item||''}" placeholder="Ítem"></td>
        <td style="width:160px"><input class="tbl-input" data-m="${i}" data-k="cant" value="${m.cant||''}" placeholder="Cantidad"></td>`;
      tb.appendChild(tr);
    });
  }
  $('matAdd').addEventListener('click',()=>{ const a=mats(); a.push({item:'',cant:''}); setMats(a); renderMats(); });

  document.addEventListener('input',e=>{
    if(e.target.hasAttribute('data-m')){
      const i=+e.target.getAttribute('data-m'); const k=e.target.getAttribute('data-k');
      const a=mats(); if(!a[i]) return; a[i][k]=e.target.value; setMats(a);
    }
  });

  /* ===== Selector de personal (modal interno) ===== */
  const modal=$('modalGestion'), tb=$('tbPersonal'), rolesSel=$('empRolesSel');
  function fillRolesMulti(sel, selected){ const roles=ensureRoles(); const set=new Set(selected||[]); sel.innerHTML=roles.map(r=>`<option value="${r}" ${set.has(r)?'selected':''}>${r}</option>`).join(''); }
  function renderTabla(filter=''){
    const q=(filter||'').toLowerCase(); tb.innerHTML='';
    getCat().forEach((p,i)=>{
      if(q && !(`${p.num} ${p.nombre} ${(p.roles||[]).join(' ')}`.toLowerCase().includes(q))) return;
      const rolesBadges=(p.roles||[]).map(r=>`<span class="badge badge-role">${r}</span>`).join(' ');
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td style="text-align:center"><input class="sm selPick" type="checkbox" data-i="${i}" ${p.picked?'checked':''}></td>
        <td class="empCell"><span class="empCode">${p.num}</span> <input class="tbl-input empName" data-i="${i}" data-k="nombre" value="${p.nombre||''}" style="max-width:240px"></td>
        <td class="col-roles">${rolesBadges}<br><small class="sub">(edita roles al agregar)</small></td>
        <td style="text-align:center"><input class="sm" type="checkbox" data-i="${i}" data-k="activo" ${p.activo!==false?'checked':''}></td>`;
      tb.appendChild(tr);
    });
  }
  $('navGestion').addEventListener('click',()=>{ modal.style.display='flex'; fillRolesMulti(rolesSel,[]); renderTabla(); });
  $('gCerrar').addEventListener('click',()=>{ modal.style.display='none'; });
  $('gAplicar').addEventListener('click',()=>{ modal.style.display='none'; showAsignados(); });

  $('empAgregar').addEventListener('click',()=>{
    const num=$('empNum').value.trim(), nombre=$('empNombre').value.trim();
    const roles=[...rolesSel.selectedOptions].map(o=>o.value);
    if(!num||!nombre||roles.length===0) return alert('Número, Nombre y al menos un Cargo');
    const cat=getCat(); if(cat.some(p=>p.num===num)) return alert('Ya existe ese No.');
    cat.push({num,nombre,roles,activo:true}); setCat(cat);
    $('empNum').value=''; $('empNombre').value=''; [...rolesSel.options].forEach(o=>o.selected=false);
    renderTabla(); refreshEncSup();
  });
  $('busca').addEventListener('input',e=>renderTabla(e.target.value||''));
  document.addEventListener('change',e=>{
    const i=e.target.getAttribute('data-i'); if(i===null) return;
    const cat=getCat(); const idx=parseInt(i,10); if(!cat[idx]) return;
    if(e.target.classList.contains('selPick')){ cat[idx].picked=e.target.checked; setCat(cat); return; }
    if(e.target.hasAttribute('data-k')){
      const k=e.target.getAttribute('data-k');
      if(e.target.type==='checkbox') cat[idx][k]=e.target.checked; else cat[idx][k]=e.target.value;
      setCat(cat);
    }
  });
  function showAsignados(){
    const sel=getCat().filter(p=>p.picked);
    const ul=$('asignadosLista'), rs=$('asignadosResumen');
    ul.innerHTML = sel.map(p=>{
      const rol=(p.roles&&p.roles[0])?p.roles[0]:'—';
      return `<li>${p.num} — ${p.nombre} — <span class="badge badge-role">${rol}</span></li>`;
    }).join('');
    rs.textContent = sel.length? (sel.length+' seleccionado(s)'):'';
  }

  /* ===== Copiar / Compartir ===== */
  const toast=(m)=>{ const t=$('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500); };
  const b64u={enc:s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
  function buildPayload(){
    const getName=num=>{ const p=getCat().find(x=>x.num===num); return p? p.nombre:''; };
    return {
      id: $('num').value, fecha:$('fecha').value, prioridad:$('prioridad').value,
      iniHora:$('iniHora').value, finHora:$('finHora').value, desc:$('desc').value,
      encargado:{num:$('encargado').value, nombre:getName($('encargado').value)},
      supervisor:{num:$('supervisor').value, nombre:getName($('supervisor').value)},
      materiales: mats().filter(m=>(m.item||'').trim()),
      asignados: getCat().filter(p=>p.picked).map(p=>({num:p.num,nombre:p.nombre,roles:p.roles||[]})),
      v:'fix4'
    };
  }
  function supURL(p){ const d=b64u.enc(JSON.stringify(p)); const base=new URL('.',location.href); return new URL('supervisor.html?d='+d, base).href; }
  $('navCopy').addEventListener('click',async()=>{
    bumpSeqFromVisible();
    const url=supURL(buildPayload());
    try{ await navigator.clipboard.writeText(url); toast('Enlace copiado'); }catch(_){ alert(url); }
  });
  $('navShare').addEventListener('click',()=>{
    bumpSeqFromVisible();
    const p=buildPayload(); const url=supURL(p);
    const text=`OSI ${p.id} — instrucciones de hoy (${p.fecha})\nSupervisor: ${p.supervisor.nombre||p.supervisor.num}\n${url}`;
    if(navigator.share){ navigator.share({title:`OSI ${p.id}`, text, url}).catch(()=>{}); }
    else { window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank'); }
  });

  /* ===== Nueva OSI (reseteo seguro) ===== */
  function newOSI(){
    const next=currentSeq()+1; localStorage.setItem(SEQ_KEY,String(next));
    setToday(); showNext();
    $('prioridad').value='Baja'; $('iniHora').value=''; $('finHora').value=''; $('desc').value='';
    $('encargado').value=''; $('supervisor').value='';
    setMats([{item:'',cant:''}]); renderMats();
    setCat(getCat().map(p=>({...p,picked:false}))); showAsignados();
    toast('Nueva OSI preparada');
  }
  $('newOsiBtn').addEventListener('click',newOSI);

  /* ===== INIT ===== */
  ensureRoles(); setToday(); showNext(); refreshEncSup(); renderMats(); showAsignados();
});

