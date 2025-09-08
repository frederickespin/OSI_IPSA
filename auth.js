// Autenticación simple para Encargados (PIN local) - build iphone_ok
(function(){
  const PIN_KEY='enc-pin-v1';           // PIN guardado (por defecto 1234)
  const SESSION_KEY='enc-session';      // bandera de sesión iniciada
  const $=id=>document.getElementById(id);

  function getPin(){ return localStorage.getItem(PIN_KEY) || '1234'; }
  function setPin(p){ localStorage.setItem(PIN_KEY, String(p||'').trim()); }
  function isLogged(){ return !!sessionStorage.getItem(SESSION_KEY); }
  function login(){ sessionStorage.setItem(SESSION_KEY,'1'); }
  function logout(){ sessionStorage.removeItem(SESSION_KEY); }

  // Exponer mínimamente
  window.OSI_AUTH={getPin,setPin,isLogged,login,logout};

  // Si estamos en index/personal/settings/historial y no hay sesión -> a login
  const path = (location.pathname||'').toLowerCase();
  const protectedPages = ['index.html','personal.html','settings.html','historial.html','/',''];
  const isProtected = protectedPages.some(p => path.endsWith(p));
  if(isProtected && !isLogged()){
    // permitir bypass si venimos de desarrollo ?skipAuth=1
    if(new URLSearchParams(location.search).get('skipAuth')!=='1'){
      location.replace('login.html');
    }
  }
})();
