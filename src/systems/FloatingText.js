/**
 * FloatingText.js — I "numeri che volano" (+1 legno, +2 monete...).
 *
 * Uno degli ingredienti chiave della soddisfazione: ogni azione produce un
 * numero che schizza in alto, rimbalza e svanisce. Testi in pool, disegnati
 * direttamente sul canvas in coordinate schermo.
 */

import { CFG } from '../data/config.js';
import { ObjectPool } from '../core/ObjectPool.js';
import { fxRand } from '../core/Rand.js';
import { projectY } from '../render/Projection.js';
import { clamp, easeOutCubic } from '../core/MathUtils.js';

const make = () => ({
  x: 0, y: 0, z: 0, vy: 0, vx: 0,
  life: 0, maxLife: 1, text: '', color: '#fff',
  size: 1, icon: '', pop: 0,
});
const reset = (o) => { o.life = 0; o.icon = ''; o.pop = 0; };

export class FloatingText {
  constructor() {
    this.pool = new ObjectPool(make, reset, 32);
  }

  /**
   * @param {string} text  testo (es. "+1")
   * @param {object} o     { color, size, icon, spread }
   */
  spawn(text, x, y, z, o = {}) {
    if (this.pool.count >= CFG.fx.maxTexts) this.pool.releaseAt(0);
    const t = this.pool.obtain();
    t.text = text;
    t.x = x + (o.spread ?? 0.18) * fxRand.sym(1);
    t.y = y;
    t.z = z;
    t.vy = o.vy ?? fxRand.range(2.1, 2.7);
    t.vx = fxRand.sym(0.5);
    t.maxLife = o.life ?? 0.95;
    t.color = o.color ?? '#ffffff';
    t.size = o.size ?? 1;
    t.icon = o.icon ?? '';
    t.pop = 0;
    return t;
  }

  update(dt) {
    this.pool.update((t) => {
      t.life += dt;
      if (t.life >= t.maxLife) return true;
      t.vy -= 5.4 * dt;
      t.y += t.vy * dt;
      t.x += t.vx * dt;
      t.vx *= Math.exp(-2 * dt);
      return false;
    });
  }

  draw(ctx, cam, dpr) {
    const list = this.pool.active;
    if (!list.length) return;
    const ppu = cam.ppu;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const k = t.life / t.maxLife;
      // "pop" iniziale: la scritta entra ingrandendosi
      const grow = k < 0.18 ? easeOutCubic(k / 0.18) * 1.25 : 1.25 - (k - 0.18) * 0.3;
      const alpha = clamp(1 - Math.pow(k, 2.4), 0, 1);

      const sx = t.x * ppu - cam.sx;
      const sy = projectY(t.y, t.z) * ppu - cam.sy;
      const fs = 17 * dpr * t.size * grow;

      ctx.globalAlpha = alpha;
      ctx.font = `900 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      const label = t.icon ? `${t.text} ${t.icon}` : t.text;
      ctx.lineWidth = fs * 0.24;
      ctx.strokeStyle = 'rgba(22,20,32,0.72)';
      ctx.strokeText(label, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(label, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
}
