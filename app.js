document.addEventListener('DOMContentLoaded',()=>{
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


// Barra inferior
$('navGestion').onclick=()=>{ modalGest.style.display='flex'; fillRolesMulti(empRolesSel, []); renderTabla(); };
$('gCerrar').onclick=()=>{ modalGest.style.display='none'; };
$('gAplicar').onclick=()=>{ modalGest.style.display='none'; showAsignados(); buildTaskCards(); };


$('navShare').onclick=()=>{ const txt=encodeURIComponent('OSI — gestión de personal (PWA)'); window.open('https://wa.me/?text='+txt,'_blank'); };
$('navPrint').onclick=()=>window.print();
$('navConfig').onclick=()=>{ window.location.href='settings.html?v=v1k'; };


// Inicial
refreshEncSup(); renderMats(); showAsignados(); buildTaskCards();
});