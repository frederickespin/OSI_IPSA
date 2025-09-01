
document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const today=()=>new Date().toISOString().slice(0,10);
  const pad=(n,w)=>String(n).padStart(w,'0');
  const enc=(s)=>new TextEncoder().encode(s);

  const loadPins=()=>{const raw=localStorage.getItem('osi-pins'); if(raw) return JSON.parse(raw);
    const init={encargado:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null},
                supervisor:{salt:Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations:120000,hash:null}};
    return Promise.all([pbkdf2('1111',new Uint8Array(init.encargado.salt),init.encargado.iterations),
                        pbkdf2('2222',new Uint8Array(init.supervisor.salt),init.supervisor.iterations)]).then(([hE,hS])=>{
      init.encargado.hash=Array.from(new Uint8Array(hE)); init.supervisor.hash=Array.from(new Uint8Array(hS));
      localStorage.setItem('osi-pins',JSON.stringify(init)); return init; });
  };
  function pbkdf2(pin,salt,it){return crypto.subtle.importKey('raw',enc(pin),'PBKDF2',false,['deriveBits']).then(k=>crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:it},k,256));}
  async function verify(role,pin){const pins=await loadPins(); const m=pins[role]; const bits=await pbkdf2(pin,new Uint8Array(m.salt),m.iterations); return JSON.stringify(Array.from(new Uint8Array(bits)))===JSON.stringify(m.hash);}

  // UI init
  $('fecha').value=today();
  $('num').value='OSI-'+pad(parseInt(localStorage.getItem('osi-seq')||'1',10),5);

  // Acceso
  let role='encargado';
  $('asEnc').onclick=()=>role='encargado'; $('asSup').onclick=()=>role='supervisor';
  $('ok').onclick=async()=>{const ok=await verify(role,$('pin').value||''); if(!ok) return alert('PIN incorrecto'); OSI_AUTH.startSession(role,'',1/60); $('login').style.display='none';};

  // Forzar actualización caché
  document.getElementById('force').onclick=async(e)=>{e.preventDefault(); try{if('caches'in window){const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k)));} if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister()));}}catch(_){}
    location.href='index.html?v=22r&updated='+Date.now(); };

  // Botones
  document.getElementById('btnImprimir').onclick=()=>window.print();
  document.getElementById('btnGuardar').onclick=()=>{const key='osi-'+$('num').value; localStorage.setItem(key, JSON.stringify({f:$('fecha').value,a:$('area').value,p:$('prio').value})); alert('Guardado local: '+key);};

  // Mostrar login si no hay sesión
  const s = OSI_AUTH.getSession(); if(!(s&&s.role)) document.getElementById('login').style.display='flex';
  window.addEventListener('osi:session-ended',()=>{alert('Sesión finalizada (v22r)'); document.getElementById('login').style.display='flex';});
});
