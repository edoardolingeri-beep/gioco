/**
 * Terrain.js — Il terreno.
 *
 * Il suolo è disegnato come un pattern ripetuto pre-generato: costa un solo
 * `fillRect` per frame indipendentemente dalle dimensioni della mappa.
 * Sopra ci vanno le "decalcomanie" (radure, sentieri) disegnate come ellissi
 * schiacciate secondo la proiezione.
 */

import { SIN_P } from '../render/Projection.js';
import { makeCanvas } from '../render/SpriteBaker.js';
import { PAL } from '../data/palette.js';
import { Rand } from '../core/Rand.js';
import { rgbToCss, mixRGB } from '../core/MathUtils.js';

/** Dimensione in unità di mondo di una piastrella del pattern. */
const TILE_UNITS = 6;

export class Terrain {
  /**
   * @param {number} ppu pixel per unità (alla risoluzione fisica del canvas)
   * @param {number} seed
   */
  constructor(ppu, seed) {
    this.ppu = ppu;
    this.seed = seed;
    this.decals = [];
    this._buildPattern();
  }

  /** Genera la piastrella d'erba: base + macchie irregolari sfumate. */
  _buildPattern() {
    const w = Math.max(64, Math.round(TILE_UNITS * this.ppu));
    const h = Math.max(64, Math.round(TILE_UNITS * this.ppu * SIN_P));
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const rnd = new Rand(this.seed);

    ctx.fillStyle = rgbToCss(PAL.grass);
    ctx.fillRect(0, 0, w, h);

    // macchie di colore: disegnate con wrap-around per essere ripetibili
    const blob = (cx, cy, r, col, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = rgbToCss(col);
      for (const ox of [-w, 0, w]) {
        for (const oy of [-h, 0, h]) {
          ctx.beginPath();
          ctx.ellipse(cx + ox, cy + oy, r, r * SIN_P, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    // Macchie piccole e poco contrastate: devono suggerire varietà senza
    // trasformarsi in "bolle" riconoscibili quando la piastrella si ripete.
    for (let i = 0; i < 80; i++) {
      const col = rnd.chance(0.5)
        ? mixRGB(PAL.grass, PAL.grassDark, rnd.range(0.35, 0.9))
        : mixRGB(PAL.grass, PAL.grassLight, rnd.range(0.3, 0.8));
      blob(rnd.range(0, w), rnd.range(0, h), rnd.range(w * 0.015, w * 0.055), col, rnd.range(0.1, 0.22));
    }
    // punteggiatura fine (rumore ad alta frequenza)
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = rnd.chance(0.5) ? rgbToCss(PAL.grassDark) : rgbToCss(PAL.grassLight);
      const s = rnd.range(1, 2.4);
      ctx.fillRect(rnd.range(0, w), rnd.range(0, h), s, s * SIN_P);
    }
    ctx.globalAlpha = 1;

    this.tile = c;
    this.tileW = w;
    this.tileH = h;
    this.pattern = null; // creato al primo uso col contesto giusto
    this._buildBlob();
  }

  /**
   * Piccola sprite circolare sfumata e "frastagliata": una sola immagine
   * riusata (scalata e ruotata) per ogni decalcomania di terra.
   */
  _buildBlob() {
    const S = 128;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    const rnd = new Rand(this.seed ^ 0x51ed);
    // bordo irregolare
    ctx.beginPath();
    const pts = 14;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = (S / 2) * (0.74 + Math.sin(a * 3 + rnd.next()) * 0.06 + rnd.range(-0.05, 0.05));
      const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.78, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fill();
    this.blobMask = c;
    this.blobCache = new Map();
  }

  /**
   * Restituisce (con cache) la macchia colorata richiesta.
   * @param {string} style 'soil' = terra uniforme, 'cobble' = lastricato
   */
  _blob(color, style = 'soil') {
    const key = style + color.join(',');
    let c = this.blobCache.get(key);
    if (c) return c;

    const S = this.blobMask.width;
    c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.drawImage(this.blobMask, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = rgbToCss(color);
    ctx.fillRect(0, 0, S, S);

    if (style === 'cobble') {
      // Ciottoli irregolari ritagliati dentro la macchia: è ciò che
      // trasforma una chiazza grigia in una strada lastricata riconoscibile.
      const rnd = new Rand(this.seed ^ 0xc0bb1e);
      ctx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 42; i++) {
        const cx = rnd.range(S * 0.1, S * 0.9);
        const cy = rnd.range(S * 0.15, S * 0.85);
        const rr = rnd.range(S * 0.045, S * 0.085);
        const sides = rnd.int(5, 7);
        ctx.beginPath();
        for (let k = 0; k <= sides; k++) {
          const a = (k / sides) * Math.PI * 2;
          const r2 = rr * rnd.range(0.78, 1.12);
          const x = cx + Math.cos(a) * r2, y = cy + Math.sin(a) * r2 * SIN_P;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = rgbToCss(rnd.chance(0.5)
          ? mixRGB(color, PAL.cobbleL, rnd.range(0.25, 0.7))
          : mixRGB(color, PAL.cobbleD, rnd.range(0.25, 0.7)));
        ctx.fill();
      }
    }

    this.blobCache.set(key, c);
    return c;
  }

  /**
   * Aggiunge una macchia di terra battuta (radura, sentiero).
   * @param {number} x @param {number} z @param {number} r raggio in unità
   */
  addDecal(x, z, r, color = PAL.dirt, alpha = 0.85, style = 'soil') {
    this.decals.push({ x, z, r, color, alpha, style });
    this._decalDirty = true;
  }

  /** Crea un sentiero fatto di macchie sovrapposte tra due punti. */
  /**
   * Sentiero fatto di macchie sovrapposte.
   * `step` di default è proporzionale alla larghezza: le macchie si toccano
   * appena, invece di accavallarsi (ogni sovrapposizione è area ridisegnata,
   * ed è esattamente ciò che costa nel riempimento del terreno).
   */
  addPath(x1, z1, x2, z2, width = 0.9, step = 0, color = PAL.dirt, alpha = 0.16, style = 'soil') {
    if (!step) step = width * 1.35;
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const wob = Math.sin(t * 7.3) * 0.45 + Math.sin(t * 3.1) * 0.3;
      this.addDecal(
        x1 + dx * t - dz / len * wob,
        z1 + dz * t + dx / len * wob,
        width * (0.85 + Math.sin(t * 11) * 0.15),
        color, alpha, style,
      );
    }
  }

  /** Disegna terreno e decalcomanie. Il ctx è già in coordinate schermo. */
  draw(ctx, cam, view) {
    if (!this.pattern) this.pattern = ctx.createPattern(this.tile, 'repeat');

    // La piastrella è stata generata per un certo ppu: se la camera cambia
    // scala (qualità adattiva, rotazione schermo) la riadattiamo invece di
    // rigenerarla, così l'erba resta agganciata al mondo.
    const k = cam.ppu / this.ppu;
    const tw = this.tileW * k, th = this.tileH * k;
    const ox = -cam.sx % tw;
    const oy = -cam.sy % th;

    ctx.save();
    ctx.translate(ox, oy);
    if (k !== 1) ctx.scale(k, k);
    ctx.fillStyle = this.pattern;
    ctx.fillRect((-ox - 2) / k, (-oy - 2) / k, (view.w + 4) / k, (view.h + 4) / k);
    ctx.restore();

    this._drawDecals(ctx, cam, view);
  }

  /**
   * Le decalcomanie (radure, sentieri, strade lastricate) sono statiche, ma
   * col paese cresciuto diventano un centinaio e si accavallano tutte sulla
   * piazza: ridisegnarle ogni frame significa riempire lo schermo quattro o
   * cinque volte in alpha, ed era di gran lunga la voce più cara del frame.
   *
   * Le raccogliamo quindi in un UNICO layer, rigenerato solo quando la
   * camera esce dal margine o quando qualcosa cambia. A regime il costo per
   * frame è un solo blit.
   */
  _drawDecals(ctx, cam, view) {
    const cache = this._ensureDecalLayer(cam, view);
    if (!cache) return;
    // Il pixel (0,0) del layer corrisponde alla coordinata mondo `ox`:
    // sullo schermo va quindi in (ox - cam.sx).
    ctx.drawImage(cache.canvas, Math.round(cache.ox - cam.sx), Math.round(cache.oy - cam.sy));
  }

  /** Marca il layer da rigenerare (chiamato quando si aggiungono decal). */
  invalidateDecals() { this._decalDirty = true; }

  _ensureDecalLayer(cam, view) {
    // margine attorno al viewport: finché la camera resta dentro, riusiamo
    const MARGIN = 0.3;
    const w = Math.ceil(view.w * (1 + MARGIN * 2));
    const h = Math.ceil(view.h * (1 + MARGIN * 2));
    let c = this._decalLayer;

    const needNew = !c || c.canvas.width !== w || c.canvas.height !== h || c.ppu !== cam.ppu;
    if (needNew) {
      c = this._decalLayer = {
        canvas: makeCanvas(w, h),
        ctx: null, ox: 0, oy: 0, ppu: cam.ppu,
      };
      c.ctx = c.canvas.getContext('2d');
      this._decalDirty = true;
    }

    // il layer copre [ox, ox+w] in pixel-mondo: se la camera esce, si rifà
    const camX = cam.sx, camY = cam.sy;
    const outside = camX < c.ox || camY < c.oy
      || camX + view.w > c.ox + w || camY + view.h > c.oy + h;

    if (this._decalDirty || outside) {
      c.ox = Math.round(camX - view.w * MARGIN);
      c.oy = Math.round(camY - view.h * MARGIN);
      c.ppu = cam.ppu;
      this._renderDecalLayer(c, w, h);
      this._decalDirty = false;
    }
    return c;
  }

  _renderDecalLayer(c, w, h) {
    const ctx = c.ctx;
    const ppu = c.ppu;
    ctx.clearRect(0, 0, w, h);

    for (const d of this.decals) {
      const sx = d.x * ppu - c.ox;
      const sy = d.z * SIN_P * ppu - c.oy;
      const rw = d.r * ppu * 1.06;
      const rh = rw * SIN_P;
      if (sx + rw < 0 || sx - rw > w || sy + rh < 0 || sy - rh > h) continue;
      ctx.globalAlpha = d.alpha;
      ctx.drawImage(this._blob(d.color, d.style), sx - rw, sy - rh, rw * 2, rh * 2);
    }
    ctx.globalAlpha = 1;
  }
}
