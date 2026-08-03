/**
 * River.js — Il fiume che taglia la mappa (Fase 3).
 *
 * Non è solo scenografia: è un CONFINE. A nord del fiume si trovano le vene
 * di ferro, e finché non costruisci il ponte non puoi arrivarci. È il modo in
 * cui il gioco introduce una nuova risorsa facendola sembrare una conquista
 * invece che l'ennesimo oggetto raccoglibile.
 *
 * Il corso non è dritto: serpeggia con due sinusoidi sovrapposte, così la
 * riva sembra naturale pur restando descrivibile da una funzione (niente
 * mesh, niente collisioni complesse: basta valutare `centerAt(x)`).
 */

import { CFG } from '../data/config.js';
import { SIN_P, projectY } from '../render/Projection.js';
import { PAL } from '../data/palette.js';
import { rgbToCss } from '../core/MathUtils.js';

export class River {
  constructor() {
    const C = CFG.river;
    this.baseZ = C.baseZ;
    this.halfWidth = C.width / 2;
    this.amp1 = C.amp1;
    this.amp2 = C.amp2;
    /** Varchi attraversabili (i ponti): [{x0, x1}] */
    this.gaps = [];
    this.time = 0;
  }

  /** Coordinata Z del centro del fiume a una data X. */
  centerAt(x) {
    return this.baseZ
      + Math.sin(x * 0.055) * this.amp1
      + Math.sin(x * 0.017 + 1.7) * this.amp2;
  }

  /** True se il punto è dentro l'acqua (esclusi i ponti). */
  contains(x, z) {
    const c = this.centerAt(x);
    if (Math.abs(z - c) > this.halfWidth) return false;
    for (const g of this.gaps) {
      if (x >= g.x0 && x <= g.x1) return false;
    }
    return true;
  }

  /** True se il punto è "oltre" il fiume (la sponda nord, quella del ferro). */
  isBeyond(x, z) {
    return z < this.centerAt(x) - this.halfWidth;
  }

  /** Apre un varco: chiamato quando il ponte viene completato. */
  openGap(x, halfWidth) {
    this.gaps.push({ x0: x - halfWidth, x1: x + halfWidth });
  }

  /**
   * Respinge un'entità fuori dall'acqua.
   * Ritorna true se l'ha effettivamente spostata.
   */
  push(e) {
    if (!this.contains(e.x, e.z)) return false;
    const c = this.centerAt(e.x);
    const margin = this.halfWidth + e.radius;
    // esce dal lato da cui è arrivata
    e.z = e.z < c ? c - margin : c + margin;
    return true;
  }

  update(dt) { this.time += dt; }

  /* ---------------------------------------------------------------- draw */

  /**
   * Disegna il fiume in coordinate schermo.
   *
   * Poiché il corso è una funzione di X, basta percorrere lo schermo da
   * sinistra a destra campionando `centerAt`: un solo path per la riva e uno
   * per l'acqua, indipendentemente dalla lunghezza del fiume.
   */
  draw(ctx, cam, view) {
    const ppu = cam.ppu;
    const b = cam.worldBounds(6);

    // se il fiume non è inquadrato non disegniamo nulla
    const cMin = this.centerAt(b.x0) - this.halfWidth - 2;
    const cMax = this.centerAt(b.x1) + this.halfWidth + 2;
    if (cMax < b.z0 || cMin > b.z1) {
      // controllo grossolano: campioniamo qualche punto in più
      let visible = false;
      for (let x = b.x0; x <= b.x1 && !visible; x += 6) {
        const c = this.centerAt(x);
        if (c + this.halfWidth + 2 > b.z0 && c - this.halfWidth - 2 < b.z1) visible = true;
      }
      if (!visible) return;
    }

    const step = 1.2;
    const sx = (x) => x * ppu - cam.sx;
    const sy = (z) => projectY(0, z) * ppu - cam.sy;

    /** Costruisce il path della fascia [center-w, center+w]. */
    const band = (w) => {
      ctx.beginPath();
      for (let x = b.x0; x <= b.x1 + step; x += step) {
        const z = this.centerAt(x) - w;
        if (x === b.x0) ctx.moveTo(sx(x), sy(z)); else ctx.lineTo(sx(x), sy(z));
      }
      for (let x = b.x1 + step; x >= b.x0; x -= step) {
        ctx.lineTo(sx(x), sy(this.centerAt(x) + w));
      }
      ctx.closePath();
    };

    // 1. sponde di sabbia
    band(this.halfWidth + 0.55);
    ctx.fillStyle = rgbToCss(PAL.sand);
    ctx.fill();

    // 2. acqua profonda
    band(this.halfWidth);
    const grad = ctx.createLinearGradient(0, sy(this.baseZ - this.halfWidth), 0, sy(this.baseZ + this.halfWidth));
    grad.addColorStop(0, rgbToCss(PAL.waterB));
    grad.addColorStop(0.5, rgbToCss(PAL.waterA));
    grad.addColorStop(1, rgbToCss(PAL.waterB));
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. riflessi che scorrono lungo la corrente
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, 2.4 * (ppu / 88));
    for (let k = 0; k < 3; k++) {
      const off = ((this.time * (0.5 + k * 0.22)) % 8) - 4;
      const wob = (k - 1) * 0.55;
      ctx.beginPath();
      for (let x = b.x0; x <= b.x1 + step; x += step) {
        const z = this.centerAt(x + off * 2) + wob
          + Math.sin(x * 0.6 + this.time * 1.4 + k) * 0.16;
        if (x === b.x0) ctx.moveTo(sx(x), sy(z)); else ctx.lineTo(sx(x), sy(z));
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // 4. i varchi dei ponti: l'acqua ci passa sotto, quindi non tocchiamo
    //    nulla — ci pensa la sprite del ponte, disegnata con le entità.
    void view;
  }
}
