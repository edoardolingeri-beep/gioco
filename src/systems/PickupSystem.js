/**
 * PickupSystem.js — Le risorse a terra e la loro raccolta automatica.
 *
 * Sequenza (studiata per essere massimamente soddisfacente):
 *   1. il tronco schizza fuori dall'albero con un arco e rimbalza;
 *   2. dopo una breve pausa viene ATTRATTO verso il giocatore, accelerando;
 *   3. all'arrivo: "pop", scintille, suono con nota crescente, +1 sulla pila.
 *
 * Tutti gli oggetti sono riciclati da un pool.
 */

import { CFG } from '../data/config.js';
import { ObjectPool } from '../core/ObjectPool.js';
import { fxRand } from '../core/Rand.js';
import { depthOf } from '../render/Projection.js';
import { clamp } from '../core/MathUtils.js';

const make = () => ({
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
  type: 'wood', age: 0, spin: 0, rot: 0,
  homing: false, grounded: false, scale: 1, born: 0,
});
const reset = (p) => { p.age = 0; p.homing = false; p.grounded = false; p.scale = 1; };

export class PickupSystem {
  constructor(game) {
    this.game = game;
    this.pool = new ObjectPool(make, reset, 48);
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  get count() { return this.pool.count; }

  /**
   * Fa schizzare una risorsa da (x,y,z).
   * @param {string} type 'wood' | 'stone' | ...
   */
  spawn(type, x, y, z, dirX = 0, dirZ = 0, power = 1) {
    const p = this.pool.obtain();
    p.type = type;
    p.x = x; p.y = y; p.z = z;
    const a = fxRand.range(0, Math.PI * 2);
    const s = CFG.pickup.popSpeed * fxRand.range(0.5, 1) * power;
    p.vx = Math.cos(a) * s * 0.55 + dirX * s * 0.7;
    p.vz = Math.sin(a) * s * 0.55 + dirZ * s * 0.7;
    p.vy = fxRand.range(3.4, 5.6) * power;
    p.spin = fxRand.sym(9);
    p.rot = fxRand.range(0, Math.PI * 2);
    p.scale = 1;
    return p;
  }

  update(dt) {
    const g = this.game;
    const player = g.player;
    const C = CFG.pickup;

    // Il "combo" fa salire la nota del suono se raccogli in rapida sequenza.
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.comboCount = 0;

    this.pool.update((p) => {
      p.age += dt;

      if (!p.homing) {
        p.vy -= 18 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.rot += p.spin * dt;

        if (p.y <= 0.12) {
          p.y = 0.12;
          if (p.vy < -1.2) {
            // rimbalzo con perdita di energia
            p.vy = -p.vy * 0.34;
            p.vx *= 0.55; p.vz *= 0.55;
            p.spin *= 0.4;
          } else {
            p.vy = 0; p.vx *= 0.82; p.vz *= 0.82;
            p.spin *= 0.8;
            p.grounded = true;
          }
        }
        // dopo la pausa iniziale parte l'attrazione (se c'è spazio nello zaino)
        if (p.age >= C.magnetDelay && !g.carry.isFull) {
          p.homing = true;
          p.speed = CFG.pickup.magnetSpeed * 0.35;
        }
        return false;
      }

      /* --- fase di attrazione verso il giocatore --- */
      if (g.carry.isFull) {
        // zaino pieno: la risorsa resta a terra e aspetta
        p.homing = false;
        p.age = 0;
        p.vy = 0;
        return false;
      }

      const tx = player.x;
      const ty = player.carryTopY();
      const tz = player.z;
      const dx = tx - p.x, dy = ty - p.y, dz = tz - p.z;
      const d = Math.hypot(dx, dy, dz) || 0.0001;

      p.speed = Math.min(CFG.pickup.magnetSpeed * 2.2, p.speed + CFG.pickup.magnetAccel * dt);
      const step = p.speed * dt;
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      p.z += (dz / d) * step;
      p.rot += 16 * dt;
      p.scale = clamp(0.55 + d * 0.35, 0.55, 1);

      if (d <= C.collectDist + step) {
        this._collect(p);
        return true;
      }
      return false;
    });
  }

  _collect(p) {
    const g = this.game;
    const ok = g.carry.add(p.type, 1);
    if (!ok) return;

    this.comboCount++;
    this.comboTimer = 0.7;

    g.audio.pop(this.comboCount);
    g.haptics.fire('light', 25);
    g.fx.sparks(p.x, p.y, p.z, 5, 'rgba(255,236,180,1)', 0.7);
    g.player.bumpStack();
    g.bus.emit('resource:gained', { type: p.type, amount: 1, x: p.x, y: p.y, z: p.z });
  }

  draw(r, assets) {
    const list = this.pool.active;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const sp = p.type === 'stone' ? assets.stoneDrop
        : p.type === 'iron' ? assets.ironDrop
        : assets.logDrop;
      if (p.y < 0.4) r.shadow(p.x, p.z, 0.26 * p.scale, clamp(1 - p.y * 1.4, 0.15, 1));
      r.sprite(sp, p.x, p.y - 0.115, p.z, {
        rot: p.rot * 0.35,
        scale: p.scale,
        depth: depthOf(0, p.z) + 0.02,
      });
    }
  }
}
