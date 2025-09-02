(function(){
const ROLES_KEY='osi-roles-master-v1';
const CORE_ROLES=['Encargado','Supervisor'];
const $=id=>document.getElementById(id);
const ls=(k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||'null'):(localStorage.setItem(k,JSON.stringify(v)),v);
const ping=(k)=>{ try{ localStorage.setItem(k, String(Date.now())); }catch(_){} };


function ensureRoles(){
let roles = ls(ROLES_KEY);
if(!Array.isArray(roles) || roles.length===0){
roles = ['Encargado','Supervisor','Chofer','Empacador','Mecánico','Carpintero','Operario','Mantenimiento'];
} else {
CORE_ROLES.forEach(r=>{ if(!roles.includes(r)) roles.unshift(r); });
if(!roles.includes('Mantenimiento')) roles.push('Mantenimiento');
roles = Array.from(new Set(roles.map(r=>String(r).trim()).filter(Boolean)));
}
ls(ROLES_KEY, roles); return roles;
}
function getRoles(){ return ensureRoles(); }
function setRoles(a){ ls(ROLES_KEY, Array.from(new Set(a))); ping('osi-roles-ping'); }


function renderRolesTable(){
const tb=document.getElementById('tbRoles'); tb.innerHTML='';
getRoles().forEach((r,i)=>{
const isCore = CORE_ROLES.includes(r);
const tr=document.createElement('tr');
tr.innerHTML = `<td>${r}</td>
<td>${isCore? '<span class="sub" style="color:#999">Fijo</span>' :
'<button data-act="edit" data-i="'+i+'">Renombrar</button> <button data-act="del" data-i="'+i+'" style="color:#b42318">Eliminar</button>'}</td>`;
tb.appendChild(tr);
});
}
function addRole(name){
name = String(name||'').trim();
if(!name) return alert('Escribe un nombre de rol');
const roles = getRoles();
if(roles.includes(name)) return alert('Ese rol ya existe');
roles.push(name); setRoles(roles); renderRolesTable();
}
function editRole(idx){
const roles=getRoles();
const old=roles[idx]; if(CORE_ROLES.includes(old)) return alert('Este rol es fijo');
const name=prompt('Nuevo nombre para el rol:', old);
if(!name) return; const n=name.trim(); if(!n) return;
if(roles.includes(n)) return alert('Ese nombre ya existe');
roles[idx]=n; setRoles(roles); renderRolesTable();
}
function delRole(idx){
const roles=getRoles();
const r=roles[idx]; if(CORE_ROLES.includes(r)) return alert('Este rol es fijo');
if(!confirm('Eliminar rol "'+r+'"?')) return;
roles.splice(idx,1); setRoles(roles); renderRolesTable();
}
document.addEventListener('click',(e)=>{
const i=e.target.getAttribute('data-i'); if(i===null) return;
const act=e.target.getAttribute('data-act');
if(act==='edit') editRole(parseInt(i,10));
if(act==='del') delRole(parseInt(i,10));
});
document.getElementById('roleAdd').onclick=()=>addRole(document.getElementById('roleNew').value);


renderRolesTable();
})();