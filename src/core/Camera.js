/**
 * Camera.js — Camera 2.5D che insegue il giocatore.
 *
 * Espone `sx`/`sy`: l'offset in PIXEL da sottrarre alle coordinate schermo
 * proiettate. Include smorzamento morbido, anticipo sul movimento
 * (look-ahead) e scuotimento per il feedback degli impatti.
 */

import { CFG, idealPPU } from '../data/config.js';
import { SIN_P, projectY } from '../render/Projection.js';
import { damp, clamp } from '../core/MathUtils.js';
import { fxRand } from '../core/Rand.js';

export class Camera {
  constructor() {
    this.x = 0; this.z = 0;          // centro in coordinate di mondo
    this.ax = 0; this.az = 0;        // anticipo corrente
    this.ppu = CFG.render.basePPU;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.shake = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.sx = 0; this.sy = 0;
    this.view = { w: 1, h: 1 };
  }

  /** Ricalcola i pixel-per-unità in base alla dimensione del viewport. */
  resize(w, h, dpr) {
    this.view.w = w; this.view.h = h;
    // Vogliamo mostrare all'incirca `targetViewWidth` unità di mondo in
    // larghezza, ma senza scendere sotto una leggibilità minima.
    // Non superiamo MAI la scala di cottura delle sprite: in questo modo il
    // fattore di scala del blit resta 1 e il disegno usa il percorso veloce
    // (nessun ricampionamento, nessun save/restore del contesto).
    this.basePPU = Math.min(idealPPU(w / dpr, dpr), CFG.render.bakePPU);
    this.ppu = this.basePPU * this.zoom;
  }

  /** Salta immediatamente sul bersaglio (all'avvio o dopo un teletrasporto). */
  snapTo(x, z) {
    this.x = x; this.z = z;
    this.ax = 0; this.az = 0;
    this._recalc();
  }

  addShake(amount) {
    this.shake = Math.min(1.4, this.shake + amount);
  }

  /**
   * @param {number} dt
   * @param {{x:number,z:number,vx:number,vz:number}} target
   */
  update(dt, target) {
    const c = CFG.camera;
    // anticipo proporzionale alla velocità
    const spd = Math.hypot(target.vx, target.vz) || 0;
    const k = spd > 0.1 ? c.lookAhead / Math.max(1, CFG.player.speed) : 0;
    this.ax = damp(this.ax, target.vx * k, c.lookAheadDamp, dt);
    this.az = damp(this.az, target.vz * k, c.lookAheadDamp, dt);

    this.x = damp(this.x, target.x + this.ax, c.follow, dt);
    this.z = damp(this.z, target.z + this.az, c.follow, dt);

    this.zoom = damp(this.zoom, this.zoomTarget, 5, dt);
    this.ppu = this.basePPU * this.zoom;

    // scuotimento con decadimento esponenziale
    if (this.shake > 0.0005) {
      const s = this.shake * this.shake * 11 * this.ppu / CFG.render.basePPU;
      this.shakeX = fxRand.sym(s);
      this.shakeY = fxRand.sym(s * SIN_P);
      this.shake = damp(this.shake, 0, CFG.camera.shakeDecay, dt);
    } else {
      this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    }

    this._recalc();
  }

  _recalc() {
    // Offset tale che il centro camera finisca al centro del viewport.
    this.sx = this.x * this.ppu - this.view.w / 2 + this.shakeX;
    this.sy = this.z * SIN_P * this.ppu - this.view.h / 2 + this.shakeY;
  }

  /** Rettangolo di mondo visibile (con margine), per il culling. */
  worldBounds(margin = 4) {
    const halfW = this.view.w / 2 / this.ppu;
    const halfZ = this.view.h / 2 / (this.ppu * SIN_P);
    return {
      x0: this.x - halfW - margin,
      x1: this.x + halfW + margin,
      // il margine su Z va più generoso: gli oggetti alti sporgono dall'alto
      z0: this.z - halfZ - margin * 2.5,
      z1: this.z + halfZ + margin,
    };
  }

  /** Da mondo a pixel schermo. */
  toScreenX(x) { return x * this.ppu - this.sx; }
  toScreenY(y, z) { return projectY(y, z) * this.ppu - this.sy; }
}
