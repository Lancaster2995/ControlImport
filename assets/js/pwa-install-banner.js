(function(){
  var banner = document.getElementById('pwa-install-banner');
  var textEl = document.getElementById('pwa-install-banner-text');
  var installBtn = document.getElementById('pwa-install-btn');
  var dismissBtn = document.getElementById('pwa-install-dismiss');
  var deferredPrompt = null;
  var DISMISS_KEY = 'controldm_install_dismissed_at';

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
  function recentlyDismissed(){
    try{
      var t = localStorage.getItem(DISMISS_KEY);
      if(!t) return false;
      // no volver a mostrar antes de 7 días
      return (Date.now() - parseInt(t,10)) < 7*24*60*60*1000;
    }catch(e){ return false; }
  }
  function showBanner(){
    if(isStandalone() || recentlyDismissed()) return;
    banner.style.display = 'flex';
  }
  function hideBanner(){
    banner.style.display = 'none';
  }
  dismissBtn.addEventListener('click', function(){
    hideBanner();
    try{ localStorage.setItem(DISMISS_KEY, String(Date.now())); }catch(e){}
  });

  // Chrome / Edge / Android: se dispara cuando el navegador determina que la
  // PWA es instalable (manifest + SW con fetch + HTTPS).
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    installBtn.textContent = 'Instalar';
    installBtn.onclick = function(){
      hideBanner();
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function(){ deferredPrompt = null; });
    };
    showBanner();
  });

  window.addEventListener('appinstalled', function(){
    hideBanner();
    try{ localStorage.removeItem(DISMISS_KEY); }catch(e){}
  });

  // iOS Safari no soporta beforeinstallprompt: mostramos instrucciones manuales.
  var ua = window.navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  var isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  if(isIOS && isSafari && !isStandalone() && !recentlyDismissed()){
    textEl.textContent = 'Toca el botón Compartir y luego "Agregar a pantalla de inicio" para instalar la app.';
    installBtn.style.display = 'none';
    showBanner();
  }
})();
