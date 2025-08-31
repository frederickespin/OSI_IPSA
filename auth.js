
// auth.js v9 — sesión con inactividad (1 min) + cierre opcional al cerrar el navegador
(function(global){
  const SESSION_KEY = 'osi-session';
  const LAST_ACTIVE_KEY = 'osi-last-active';
  const CH_NAME = 'osi-session-channel';

  let config = { idleMs: 60000, heartbeatMs: 15000, endOnClose: true };

  function now(){ return Date.now(); }

  function saveSession(s){
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }

  function getSession(){
    try{
      const raw = localStorage.getItem(SESSION_KEY);
      if(!raw) return null;
      const s = JSON.parse(raw);
      if(!s.expires || now() > s.expires){ endSession(); return null; }
      return s;
    }catch(_){ return null; }
  }

  function startSession(role, user, ttlMinutes){
    const ttl = (ttlMinutes && ttlMinutes>0)? ttlMinutes*60*1000 : config.idleMs;
    const s = { role, user: user||'', created: now(), expires: now()+ttl };
    saveSession(s);
    sessionStorage.setItem('osi-role', role||'');
    sessionStorage.setItem('osi-user', user||'');
    touch(); // registra actividad inmediata
    bc().postMessage({type:'session:update', payload:s});
    return s;
  }

  function updateUser(user){
    const s = getSession(); if(!s) return null;
    s.user = user||''; saveSession(s);
    sessionStorage.setItem('osi-user', s.user);
    bc().postMessage({type:'session:update', payload:s});
    return s;
  }

  function touch(){
    // Actualiza último activo y extiende expiración
    localStorage.setItem(LAST_ACTIVE_KEY, String(now()));
    const s = getSession();
    if(s){
      s.expires = now() + config.idleMs;
      saveSession(s);
      bc().postMessage({type:'session:update', payload:s});
    }
  }

  function refresh(ttlMinutes){
    const s = getSession(); if(!s) return null;
    s.expires = now() + (ttlMinutes? ttlMinutes*60*1000 : config.idleMs);
    saveSession(s);
    bc().postMessage({type:'session:update', payload:s});
    return s;
  }

  function endSession(){
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    sessionStorage.removeItem('osi-role');
    sessionStorage.removeItem('osi-user');
    bc().postMessage({type:'session:end'});
    // evento local para que la UI reaccione
    setTimeout(()=>{
      try{ global.dispatchEvent(new CustomEvent('osi:session-ended')); }catch(_){}
    }, 0);
  }

  function init(userConfig){
    config = Object.assign({}, config, userConfig||{});

    // Actividad del usuario
    const events = ['click','keydown','mousemove','touchstart','focus','visibilitychange'];
    events.forEach(ev => global.addEventListener(ev, () => {
      if(document.hidden) return;
      touch();
    }, {passive:true}));

    // Heartbeat (por si no hay eventos, 15s por defecto)
    setInterval(()=>{
      if(document.hidden) return;
      touch();
    }, Math.max(3000, config.heartbeatMs||15000));

    // Monitor de inactividad (cada 5s)
    setInterval(()=>{
      const s = getSession();
      if(!s) return;
      if(now() > (s.expires||0)){
        endSession();
      }
    }, 5000);

    // Cierre de navegador/pestaña
    if(config.endOnClose){
      global.addEventListener('beforeunload', () => {
        // "Suave": si hay más pestañas abiertas activas, el heartbeat de esas pestañas mantendrá la sesión.
        // Si esta es la última pestaña, la sesión vencerá por inactividad (1 min) o se elimina aquí.
        try{ endSession(); }catch(_){}
      });
    }
  }

  let _bc;
  function bc(){
    if(!_bc && 'BroadcastChannel' in global){
      _bc = new BroadcastChannel(CH_NAME);
      _bc.onmessage = (ev) => {
        if(ev.data && ev.data.type==='session:end'){
          // Mostrar inmediatamente login en este tab también
          try{ global.dispatchEvent(new CustomEvent('osi:session-ended')); }catch(_){}
        }
      };
    }
    return _bc || { postMessage: ()=>{} };
  }

  global.OSI_AUTH = { getSession, startSession, updateUser, refresh, endSession, init };
})(window);
