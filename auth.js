
(function(global){
  const SESSION_KEY = 'osi-session';
  const LAST_ACTIVE_KEY = 'osi-last-active';
  let cfg = { idleMs: 60000, heartbeatMs: 15000, endOnClose: true };
  const now = () => Date.now();
  const save = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  function getSession(){
    try{ const raw = localStorage.getItem(SESSION_KEY); if(!raw) return null;
      const s = JSON.parse(raw); if(!s.expires || now()>s.expires){ endSession(); return null; } return s;
    }catch(_){ return null; }
  }
  function startSession(role, user, ttlMin){
    const ttl = (ttlMin && ttlMin>0)? ttlMin*60*1000 : cfg.idleMs;
    const s = { role, user: user||'', created: now(), expires: now()+ttl };
    save(s); sessionStorage.setItem('osi-role', role||''); sessionStorage.setItem('osi-user', user||''); touch(); return s;
  }
  function updateUser(user){ const s = getSession(); if(!s) return null; s.user=user||''; save(s); sessionStorage.setItem('osi-user', s.user); return s; }
  function touch(){ localStorage.setItem(LAST_ACTIVE_KEY, String(now())); const s=getSession(); if(s){ s.expires = now()+cfg.idleMs; save(s);} }
  function endSession(){ localStorage.removeItem(SESSION_KEY); localStorage.removeItem(LAST_ACTIVE_KEY); sessionStorage.removeItem('osi-role'); sessionStorage.removeItem('osi-user'); try{ global.dispatchEvent(new CustomEvent('osi:session-ended')); }catch(_){ } }
  function init(userCfg){
    cfg = Object.assign({}, cfg, userCfg||{});
    ['click','keydown','mousemove','touchstart','focus','visibilitychange','scroll'].forEach(ev=>global.addEventListener(ev, ()=>{ if(!document.hidden) touch(); }, {passive:true}));
    setInterval(()=>{ const s=getSession(); if(s && now() > (s.expires||0)) endSession(); }, 5000);
    if(cfg.endOnClose){ global.addEventListener('beforeunload', ()=>{ try{ endSession(); }catch(_){ } }); }
  }
  global.OSI_AUTH = { getSession, startSession, updateUser, touch, endSession, init };
})(window);
