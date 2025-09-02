document.addEventListener('DOMContentLoaded',()=>{
const ROLES_KEY='osi-roles-master-v1';
const CAT_KEY='osi-personal-v1';
const CORE_ROLES=['Encargado','Supervisor'];
const TASKS_KEY='osi-tasks-v1';
const MATS_KEY='osi-mats-v1';
const $=id=>document.getElementById(id);
const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);


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
try{ localStorage.setItem('osi-roles-ping', String(Date.now())); }catch(_){ }
return roles;
}
const getRoles=()=>ensureRoles();


const today = ()=>{ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
const setToday=()=>{ const t=today(); const f=$('fecha'); if(f){f.value=t; f.min=t; f.max=t;} };
setToday(); setTimeout(setToday,100);


const pad=(n,w)=>String(n).padStart(w,'0'); const seq=()=>parseInt(localStorage.getItem('osi-seq')||'3',10);
if($('num')) $('num').value='OSI-'+pad(seq(),5);


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


// ----- Materiales (solo Ítem y Cantidad) -----
function mats(){ return ls(MATS_KEY)||[] }
function setMats(a){ ls(MATS_KEY,a) }
function renderMats(){
const tb=$('tbMat'); if(!tb) return; tb.innerHTML='';
mats().forEach((m,i)=>{
});