/**
 * DayNightSystem.js — Il ciclo del giorno.
 *
 * Il mondo passa da mattina a tramonto, notte e alba. L'effetto è ottenuto
 * con due soli passaggi sopra la scena già disegnata:
 *
 *   1. un velo in `multiply` che spegne i colori verso il blu della notte;
 *   2. i BAGLIORI delle sorgenti luminose in `lighter`, disegnati DOPO il
 *      velo — è questo il motivo per cui di notte lampioni, bracieri e
 *      finestre sembrano davvero accesi invece di essere solo macchie chiare.
 *
 * Costa due riempimenti di schermo e una manciata di blit: nessuna
 * illuminazione per pixel, nessuna sprite aggiuntiva da cuocere.
 */

import { CFG } from '../data/config.js';
import { TAU, clamp } from '../core/MathUtils.js';
import { projectY } from '../render/Projection.js';
import { makeCanvas } from '../render/SpriteBaker.js';

/** Colore del cielo notturno (moltiplicato sulla scena). */
const NIGHT = [46, 60, 120];
/** Luce lunare: un soffio di azzurro aggiunto sopra il buio. Serve a
 *  DESATURARE — col solo `multiply` l'erba resta verde acceso e la notte
 *  sembra un pomeriggio nuvoloso. */
const MOON = [52, 74, 140];
/** Tinta calda di alba e tramonto. */
const WARM = [255, 154, 92];

export class DayNightSystem {
  constructor(game) {
    this.game = game;
    /** Ora del giorno, 0..1 (0 = mezzanotte, 0.5 = mezzogiorno). */
    this.time = CFG.dayNight.startTime;
    this.enabled = true;
    this.darkness = 0;
    this.warmth = 0;
    this.wasNight = false;
    this.visibleLights = 0;
  }

  /** Altezza del sole: 1 a mezzogiorno, -1 a mezzanotte. */
  get sunHeight() { return Math.sin((this.time - 0.25) * TAU); }

  get isNight() { return this.darkness > CFG.dayNight.lightsOn; }

  /** Nome dell'ora, per l'interfaccia. */
  get label() {
    const t = this.time;
    if (t < 0.22) return 'Notte';
    if (t < 0.32) return 'Alba';
    if (t < 0.68) return 'Giorno';
    if (t < 0.80) return 'Tramonto';
    return 'Notte';
  }

  update(dt) {
    if (!this.enabled) return;
    const C = CFG.dayNight;
    this.time = (this.time + dt / C.dayLength) % 1;

    const sun = this.sunHeight;
    // buio: cresce quando il sole va sotto l'orizzonte, con una curva morbida
    this.darkness = Math.pow(clamp(-sun + 0.12, 0, 1), 0.75) * C.maxDarkness;
    // caldo: massimo quando il sole è basso ma ancora visibile
    this.warmth = clamp(1 - Math.abs(sun) * 2.4, 0, 1) * C.warmth;

    if (this.isNight !== this.wasNight) {
      this.wasNight = this.isNight;
      this.game.bus.emit('daynight:change', this.isNight);
    }
  }

  /**
   * Applica il velo atmosferico sopra la scena.
   * Va chiamato DOPO il mondo e PRIMA delle luci.
   */
  drawTint(ctx, w, h) {
    if (!this.enabled) return;
    const d = this.darkness, wm = this.warmth;
    if (d < 0.004 && wm < 0.004) return;

    // Un solo velo in `multiply`: notte e ora d'oro si moltiplicano fra loro.
    // `multiply` spegne i colori invece di coprirli — l'erba resta erba, solo
    // più cupa o più dorata. Un velo opaco in `source-over` appiattirebbe tutto,
    // e uno additivo sbiadirebbe la scena come una foto sovraesposta.
    const kd = 1 - d, kw = 1 - wm;
    let r = (255 * kd + NIGHT[0] * d) * (255 * kw + WARM[0] * wm) / 255;
    let g = (255 * kd + NIGHT[1] * d) * (255 * kw + WARM[1] * wm) / 255;
    let b = (255 * kd + NIGHT[2] * d) * (255 * kw + WARM[2] * wm) / 255;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    ctx.fillRect(0, 0, w, h);

    // Soffio di luna (o di sole basso): alza il blu di notte e stacca un po'
    // le ombre al tramonto. Serve soprattutto a DESATURARE: col solo
    // `multiply` l'erba resta verde acceso e la notte sembra un pomeriggio.
    const amb = d * CFG.dayNight.moonlight + wm * 0.18;
    if (amb > 0.004) {
      const c = d > wm ? MOON : WARM;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(amb, 0.5);
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Disegna i bagliori delle sorgenti luminose visibili.
   *
   * Gli aloni NON vengono sommati direttamente sulla scena: finiscono prima
   * in un buffer con `lighten` (che tiene il massimo, non la somma) e poi ci
   * vanno sopra tutti insieme. In una piazza con dieci lampioni la somma
   * riporterebbe lo schermo alla luminosità del giorno; il massimo no.
   *
   * @param {Array} lights elenco { x, y, z, radius, alpha, flicker, cold }
   * @param {object} fx    sprite degli aloni { lightWarm, lightCold }
   */
  drawLights(ctx, cam, lights, fx) {
    if (!this.enabled || !fx || !fx.lightWarm) return;
    const intensity = clamp((this.darkness - 0.05) / 0.4, 0, 1);
    if (intensity <= 0.01 || lights.length === 0) return;

    const ppu = cam.ppu;
    const w = cam.view.w | 0, h = cam.view.h | 0;
    if (w < 2 || h < 2) return;
    const t = this.game.time;

    const bctx = this._buffer(w, h);
    // `lighten` = massimo canale per canale: due aloni sovrapposti restano
    // luminosi quanto il più forte dei due.
    bctx.clearRect(0, 0, w, h);
    bctx.globalCompositeOperation = 'lighten';

    let drawn = 0;
    for (let i = 0; i < lights.length; i++) {
      const L = lights[i];
      const sx = L.x * ppu - cam.sx;
      const sy = projectY(L.y, L.z) * ppu - cam.sy;
      // Il tremolio distingue una fiamma da una lampadina.
      const flick = L.flicker
        ? 0.88 + Math.sin(t * 9 + L.seed) * 0.08 + Math.sin(t * 23 + L.seed) * 0.04
        : 1;
      const spr = L.sprite ?? (L.cold ? fx.lightCold : fx.lightWarm);
      const rx = L.radius * ppu * flick;
      const ry = rx * (spr.h / spr.w);
      if (sx + rx < 0 || sx - rx > w || sy + ry < 0 || sy - ry > h) continue;

      bctx.globalAlpha = clamp((L.alpha ?? 0.55) * flick, 0, 1);
      bctx.drawImage(spr.canvas, sx - rx, sy - ry, rx * 2, ry * 2);
      drawn++;
    }
    bctx.globalCompositeOperation = 'source-over';
    bctx.globalAlpha = 1;
    this.visibleLights = drawn;
    if (!drawn) return;

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = intensity;
    ctx.drawImage(this._buf, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /** Buffer degli aloni, ricreato solo quando cambia la risoluzione. */
  _buffer(w, h) {
    if (!this._buf || this._buf.width !== w || this._buf.height !== h) {
      this._buf = makeCanvas(w, h);
      this._bctx = this._buf.getContext('2d');
    }
    return this._bctx;
  }

  /** Salta all'ora indicata (usato dal salvataggio e dai test). */
  setTime(t) { this.time = ((t % 1) + 1) % 1; }
}
