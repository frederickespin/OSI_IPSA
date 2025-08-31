
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

  function ensureSession(){const s=OSI_AUTH.getSession(); if(s&&s.role){document.getElementById('login').style.display='none';} else {document.getElementById('login').style.display='flex';}}
  document.getElementById('fecha').value=today();
  document.getElementById('num').value='OSI-'+pad(parseInt(localStorage.getItem('osi-seq')||'1',10),5);

  let role='encargado';
  document.getElementById('asEnc').onclick=()=>role='encargado';
  document.getElementById('asSup').onclick=()=>role='supervisor';
  document.getElementById('ok').onclick=async()=>{const ok=await verify(role, document.getElementById('pin').value||''); if(!ok) return alert('PIN incorrecto'); OSI_AUTH.startSession(role,'',1/60); document.getElementById('login').style.display='none';};

  document.getElementById('btnImprimir').onclick=()=>window.print();
  document.getElementById('btnGuardar').onclick=()=>alert('Guardado local');

  OSI_AUTH.init({idleMs:60000,heartbeatMs:15000,endOnClose:true});
  ensureSession();
  window.addEventListener('osi:session-ended',()=>{alert('Sesión finalizada (build 9r2).'); document.getElementById('login').style.display='flex';});
});
