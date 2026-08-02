/**
 * DeliverySystem.js — Gli oggetti che "volano" dal giocatore a una destinazione.
 *
 * È l'effetto che rende gratificanti consegne e vendite: entri nell'area,
 * i tronchi partono dalla schiena uno dopo l'altro con un arco elegante e
 * atterrano sull'edificio (o sul banco del mercante) con un "tonf".
 *
 * Funziona anche al contrario: le monete volano dal mercante al giocatore.
 */

import { CFG } from '../data/config.js';
import { ObjectPool } from '../core/ObjectPool.js';
import { fxRand } from '../core/Rand.js';
import { depthOf } from '../render/Projection.js';
import { easeOutCubic } from '../core/MathUtils.js';

const make = () => ({
  x0: 0, y0: 0, z0: 0,
  x: 0, y: 0, z: 0,
  target: null, kind: 'wood',
  t: 0, dur: 1, arc: 1, rot: 0, spin: 0,
  onArrive: null, index: 0,
});
const reset = (o) => { o.t = 0; o.onArrive = null; o.target = null; };

export class DeliverySystem {
  constructor(game) {
    this.game = game;
    this.pool = new ObjectPool(make, reset, 32);
  }

  get count() { return this.pool.count; }

  /**
   * Lancia un oggetto verso un bersaglio.
   * @param {string} kind 'wood' | 'coin'
   * @param {object} target entità o {x,y,z} di destinazione
   */
  send(kind, x, y, z, target, onArrive, index = 0) {
    const f = this.pool.obtain();
    f.kind = kind;
    f.x0 = x; f.y0 = y; f.z0 = z;
    f.x = x; f.y = y; f.z = z;
    f.target = target;
    f.dur = CFG.deliver.flightTime * fxRand.range(0.9, 1.15);
    f.arc = CFG.deliver.arcHeight * fxRand.range(0.8, 1.25);
    f.rot = fxRand.range(0, 6.28);
    f.spin = fxRand.sym(14);
    f.onArrive = onArrive;
    f.index = index;
    return f;
  }

  update(dt) {
    this.pool.update((f) => {
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      const e = easeOutCubic(k);

      const t = f.target;
      const tx = t.x, ty = t.deliverY ?? (t.y ?? 0) + 0.6, tz = t.z;

      f.x = f.x0 + (tx - f.x0) * e;
      f.z = f.z0 + (tz - f.z0) * e;
      // parabola: l'arco è massimo a metà volo
      f.y = f.y0 + (ty - f.y0) * e + Math.sin(k * Math.PI) * f.arc;
      f.rot += f.spin * dt;

      if (k >= 1) {
        f.onArrive?.(f);
        return true;
      }
      return false;
    });
  }

  draw(r, assets) {
    const list = this.pool.active;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const sp = f.kind === 'coin' ? assets.coin
        : f.kind === 'stone' ? assets.stoneDrop
        : assets.logDrop;
      r.sprite(sp, f.x, f.y, f.z, {
        rot: f.rot * 0.4,
        // volano sopra a tutto: profondità alta per stare in primo piano
        depth: depthOf(0, f.z) + 6,
        scale: f.kind === 'coin' ? 0.9 : 0.85,
      });
    }
  }
}
