/**
 * Loop.js — Ciclo di gioco su requestAnimationFrame.
 *
 * - dt limitato: dopo un blocco (o il ritorno da background) il gioco non
 *   "salta" in avanti;
 * - media mobile degli FPS per il pannello di debug;
 * - si mette automaticamente in pausa quando l'app va in secondo piano,
 *   fondamentale sui telefoni per non sprecare batteria.
 */

export class Loop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.last = 0;
    this.fps = 60;
    this._raf = null;
    this._tick = this._tick.bind(this);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else this.resume();
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  pause() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this.onPause?.();
  }

  resume() {
    if (this.running) return;
    this.last = performance.now();
    this.running = true;
    this._raf = requestAnimationFrame(this._tick);
    this.onResume?.();
  }

  _tick(now) {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    // clamp: mai più di ~3 frame di ritardo in un colpo solo
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;

    this.fps += ((1 / Math.max(dt, 1e-4)) - this.fps) * 0.06;

    this.update(dt);
    this.render(dt);

    this._raf = requestAnimationFrame(this._tick);
  }
}
