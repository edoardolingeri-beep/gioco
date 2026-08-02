/**
 * Haptics.js — Vibrazione / feedback tattile.
 *
 * Usa il plugin nativo di Capacitor quando l'app gira su Android/iOS
 * (feedback fine, tipo "Taptic Engine"), altrimenti ricade su
 * `navigator.vibrate` nel browser. Se non c'è nulla, non fa niente.
 */

let Native = null;      // plugin @capacitor/haptics, caricato a runtime
let ImpactStyle = null;

export class Haptics {
  constructor() {
    this.enabled = true;
    this.last = 0;
    this._detect();
  }

  async _detect() {
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.() && cap.Plugins?.Haptics) {
      Native = cap.Plugins.Haptics;
      ImpactStyle = { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' };
    }
  }

  setEnabled(v) { this.enabled = v; }

  /**
   * @param {'light'|'medium'|'heavy'|'success'} kind
   * @param {number} minGapMs  evita raffiche fastidiose
   */
  fire(kind = 'light', minGapMs = 40) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.last < minGapMs) return;
    this.last = now;

    if (Native) {
      try {
        if (kind === 'success') Native.notification({ type: 'SUCCESS' });
        else Native.impact({ style: ImpactStyle[kind === 'heavy' ? 'Heavy' : kind === 'medium' ? 'Medium' : 'Light'] });
        return;
      } catch { /* ricade sul web */ }
    }
    if (navigator.vibrate) {
      const ms = kind === 'heavy' ? 34 : kind === 'medium' ? 18 : kind === 'success' ? 50 : 10;
      navigator.vibrate(ms);
    }
  }
}
