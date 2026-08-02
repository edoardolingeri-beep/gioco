/**
 * native.js — Ponte con la piattaforma nativa (Capacitor).
 *
 * Il gioco è una vera app Android/iOS: qui configuriamo tutto ciò che nel
 * browser non esiste — barra di stato, splash screen, blocco della rotazione,
 * gestione del tasto Indietro, pausa quando l'app va in background.
 *
 * Ogni chiamata è opzionale: se il modulo gira in un browser (per lo sviluppo)
 * questi blocchi vengono semplicemente saltati.
 */

/** True quando siamo dentro l'app nativa e non in un browser. */
export function isNative() {
  return !!window.Capacitor?.isNativePlatform?.();
}

export function platform() {
  return window.Capacitor?.getPlatform?.() ?? 'web';
}

const P = () => window.Capacitor?.Plugins ?? {};

export async function initNative() {
  if (!isNative()) {
    document.body.classList.add('is-web');
    return;
  }
  document.body.classList.add('is-native', 'is-' + platform());

  const { StatusBar, SplashScreen, ScreenOrientation, App, NavigationBar } = P();

  try {
    // Schermo intero: la barra di stato scompare dentro il gioco.
    await StatusBar?.setOverlaysWebView({ overlay: true });
    await StatusBar?.hide();
  } catch { /* non disponibile su questa piattaforma */ }

  try {
    await NavigationBar?.hide();
  } catch { /* plugin opzionale */ }

  try {
    await ScreenOrientation?.lock({ orientation: 'portrait' });
  } catch { /* alcuni tablet non lo permettono */ }

  try {
    // Il tasto Indietro di Android non deve chiudere l'app di colpo.
    App?.addListener('backButton', ({ canGoBack }) => {
      const sheet = document.getElementById('hud-sheet');
      if (sheet && !sheet.hidden) { sheet.hidden = true; return; }
      if (!canGoBack) window.game?.save();
      P().App?.minimizeApp?.();
    });

    // Salvataggio garantito quando l'utente esce dall'app.
    App?.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) window.game?.save();
    });
  } catch { /* ignora */ }

  try {
    await SplashScreen?.hide();
  } catch { /* ignora */ }
}
