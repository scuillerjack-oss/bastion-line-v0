// Priorité absolue V1 (cahier des charges V1, section 3) : "la présence
// d'un manifest, d'un service worker ou de tests automatisés verts ne
// constitue plus une preuve suffisante". Ce module n'essaie donc pas de
// FORCER une installation -- il détecte l'état réel (déjà installé,
// navigateur intégré structurellement incapable d'installer, ou vraie
// invite native disponible) et fournit un chemin concret pour chaque cas,
// jamais une simple supposition.

// Android WebView (le "navigateur intégré" d'une app tierce -- ChatGPT,
// Claude, etc.) ajoute un jeton "wv" dans son user-agent, absent de Chrome
// pour Android lui-même. C'est une convention documentée de longue date
// (Chromium l'ajoute volontairement pour permettre ce genre de détection),
// pas une supposition : cf. la section "Identifying WebView" de la doc
// Android officielle sur les user-agents WebView.
export function detectEmbeddedAndroidWebView(userAgent) {
  return /android/i.test(userAgent) && /;\s*wv\)/i.test(userAgent);
}

export function isIOS(userAgent) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function isStandaloneDisplay(win) {
  return (
    (win.matchMedia && win.matchMedia("(display-mode: standalone)").matches) ||
    win.navigator.standalone === true // Safari iOS historique
  );
}

// Construit un lien "intent://" forçant Chrome à ouvrir la page actuelle,
// même depuis une WebView tierce -- mécanisme standard Android, pas un
// contournement fragile : de nombreux sites l'utilisent pour échapper aux
// navigateurs intégrés d'apps tierces.
export function buildOpenInChromeIntentUrl(win) {
  const withoutScheme = win.location.href.replace(/^https?:\/\//, "");
  return `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
}

export function createInstallController(win = window) {
  let deferredPrompt = null;
  let installed = false;

  win.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    deferredPrompt = ev;
  });
  win.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
  });

  return {
    getState() {
      const ua = win.navigator.userAgent;
      return {
        standalone: installed || isStandaloneDisplay(win),
        embeddedWebView: detectEmbeddedAndroidWebView(ua),
        isIOS: isIOS(ua),
        promptAvailable: deferredPrompt !== null,
      };
    },
    async promptInstall() {
      if (!deferredPrompt) return { outcome: "unavailable" };
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return choice;
    },
    openInChrome() {
      win.location.href = buildOpenInChromeIntentUrl(win);
    },
  };
}
