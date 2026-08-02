/**
 * Renderer.js — Disegno su canvas 2D.
 *
 * Funzionamento:
 *  1. `begin()` pulisce e prepara il frame;
 *  2. i sistemi accodano comandi con `sprite()` / `shadow()`;
 *  3. `flush()` ordina i comandi per profondità (algoritmo del pittore)
 *     e li disegna: prima tutte le ombre, poi tutte le sprite.
 *
 * I comandi sono oggetti riciclati da un pool: zero allocazioni per frame.
 */

import { CFG } from '../data/config.js';
import { SIN_P, projectY, depthOf } from './Projection.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.dpr = 1;
    this.w = 0; this.h = 0;

    // pool di comandi di disegno
    this._cmds = [];
    this._n = 0;
    this._shadows = [];
    this._ns = 0;

    this.stats = { sprites: 0, shadows: 0 };
  }

  resize(cssW, cssH, quality = 1) {
    const dpr = Math.min(window.devicePixelRatio || 1, CFG.render.maxDPR) * quality;
    this.dpr = dpr;
    this.w = Math.round(cssW * dpr);
    this.h = Math.round(cssH * dpr);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'low';
  }

  begin(cam) {
    this.cam = cam;
    this._n = 0;
    this._ns = 0;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Comando riciclato dal pool. */
  _cmd() {
    let c = this._cmds[this._n];
    if (!c) this._cmds[this._n] = c = {};
    this._n++;
    return c;
  }

  /**
   * Accoda una sprite posizionata nel mondo.
   * @param {object} sp   sprite cotta { canvas, ax, ay, w, h }
   * @param {number} x @param {number} y @param {number} z  posizione mondo
   * @param {object} o    opzioni: { scale, alpha, rot, pivotY, depth, clipTop,
   *                                 flipX, tint, tintAlpha, sxOff, syOff }
   */
  sprite(sp, x, y, z, o) {
    const c = this._cmd();
    c.sp = sp;
    c.x = x; c.y = y; c.z = z;
    c.depth = o?.depth ?? depthOf(0, z);
    c.scale = o?.scale ?? 1;
    c.alpha = o?.alpha ?? 1;
    c.rot = o?.rot ?? 0;
    c.pivotY = o?.pivotY ?? 0;     // 0 = ruota attorno all'ancora
    c.clipTop = o?.clipTop ?? 0;   // 0..1: porzione superiore da nascondere
    c.flipX = o?.flipX ?? false;
    c.sxOff = o?.sxOff ?? 0;
    c.syOff = o?.syOff ?? 0;
    c.squash = o?.squash ?? 1;
    return c;
  }

  /** Accoda un'ombra ellittica al suolo. */
  shadow(x, z, radius, alpha = 1, yLift = 0) {
    let c = this._shadows[this._ns];
    if (!c) this._shadows[this._ns] = c = {};
    this._ns++;
    c.x = x; c.z = z; c.r = radius; c.a = alpha; c.yLift = yLift;
  }

  /**
   * Disegna il frame accodato.
   * @param {object} shadowSprite sprite dell'ombra condivisa
   */
  flush(shadowSprite) {
    const ctx = this.ctx;
    const cam = this.cam;
    const ppu = cam.ppu;

    /* --- ombre (tutte sotto a tutto) --- */
    if (shadowSprite) {
      ctx.globalAlpha = 1;
      for (let i = 0; i < this._ns; i++) {
        const s = this._shadows[i];
        const sx = s.x * ppu - cam.sx;
        const sy = (s.z * SIN_P - s.yLift * 0) * ppu - cam.sy;
        const rw = s.r * ppu;
        const rh = rw * SIN_P;
        ctx.globalAlpha = CFG.render.shadowAlpha * s.a;
        ctx.drawImage(shadowSprite.canvas, sx - rw, sy - rh, rw * 2, rh * 2);
      }
      ctx.globalAlpha = 1;
    }

    /* --- sprite ordinate per profondità --- */
    const cmds = this._cmds;
    const n = this._n;
    // Array di ordinamento riusato: copiamo i riferimenti e ordiniamo in
    // place, senza allocare un nuovo array ad ogni frame.
    const view = this._sorted || (this._sorted = []);
    if (view.length !== n) view.length = n;
    for (let i = 0; i < n; i++) view[i] = cmds[i];
    view.sort(cmpDepth);

    for (let i = 0; i < n; i++) {
      const c = view[i];
      const sp = c.sp;
      if (!sp) continue;
      const sx = c.x * ppu - cam.sx + c.sxOff;
      const sy = projectY(c.y, c.z) * ppu - cam.sy + c.syOff;

      // scala: le sprite sono cotte a bakePPU, qui le adattiamo allo zoom.
      // Nel caso normale vale esattamente 1 → percorso veloce.
      let k = (ppu / (sp.ppu ?? CFG.render.bakePPU)) * c.scale;
      if (k > 0.998 && k < 1.002) k = 1;

      if (c.alpha !== 1) ctx.globalAlpha = c.alpha;

      if (c.rot || c.flipX || c.squash !== 1 || k !== 1) {
        ctx.save();
        ctx.translate(sx, sy);
        if (c.rot) {
          // il pivot di rotazione è alla base della sprite (piedi/tronco)
          ctx.translate(0, -c.pivotY);
          ctx.rotate(c.rot);
          ctx.translate(0, c.pivotY);
        }
        ctx.scale(c.flipX ? -k : k, k * c.squash);
        this._blit(ctx, sp, c.clipTop);
        ctx.restore();
      } else {
        ctx.translate(sx, sy);
        this._blit(ctx, sp, c.clipTop);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      if (c.alpha !== 1) ctx.globalAlpha = 1;
    }

    this.stats.sprites = n;
    this.stats.shadows = this._ns;
  }

  /** Blit alla posizione corrente della trasformazione (ancora in 0,0). */
  _blit(ctx, sp, clipTop) {
    if (clipTop > 0) {
      // Mostra solo la parte bassa della sprite: usato per l'animazione di
      // costruzione, in cui l'edificio "emerge" dal terreno.
      const hidden = Math.floor(sp.h * clipTop);
      const shown = sp.h - hidden;
      if (shown <= 0) return;
      ctx.drawImage(sp.canvas, 0, hidden, sp.w, shown, -sp.ax, -sp.ay + hidden, sp.w, shown);
    } else {
      ctx.drawImage(sp.canvas, -sp.ax, -sp.ay);
    }
  }

  /** Rettangolo/testo in coordinate schermo (per debug). */
  debugText(str, x, y) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `${12 * this.dpr}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(str, x, y);
  }
}

function cmpDepth(a, b) { return a.depth - b.depth; }
