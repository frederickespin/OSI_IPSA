// auth.js  — fix3: sin bucle en login y rutas protegidas correctas
(function () {
  const PIN_KEY = 'enc-pin-v1';      // PIN guardado (por defecto 1234)
  const SESSION_KEY = 'enc-session'; // bandera de sesión

  function getPin()  { return localStorage.getItem(PIN_KEY) || '1234'; }
  function setPin(p) { localStorage.setItem(PIN_KEY, String(p || '').trim()); }
  function isLogged(){ return !!sessionStorage.getItem(SESSION_KEY); }
  function login()   { sessionStorage.setItem(SESSION_KEY, '1'); }
  function logout()  { sessionStorage.removeItem(SESSION_KEY); }

  // Exponer API mínima
  window.OSI_AUTH = { getPin, setPin, isLogged, login, logout };

  // ---- Protección de rutas sin bucles ----
  // Tomamos SOLO el último segmento (index.html, login.html, etc.)
  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  const isLogin = page === 'login.html';

  // Consideramos protegidas: index, personal, settings, historial y la raíz (segmento vacío)
  const protectedSet = new Set(['', 'index.html', 'personal.html', 'settings.html', 'historial.html']);
  const isProtected = protectedSet.has(page);

  // Si es protegida y no hay sesión, redirige a login (permitiendo override con ?skipAuth=1)
  if (isProtected && !isLogin && !isLogged()) {
    const qs = new URLSearchParams(location.search);
    if (qs.get('skipAuth') !== '1') {
      location.replace('login.html');
    }
  }
})();
