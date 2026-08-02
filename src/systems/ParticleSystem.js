/**
 * ParticleSystem.js — Particelle 3D leggerissime.
 *
 * Le particelle vivono nello spazio di mondo (x,y,z) così ricevono la stessa
 * proiezione di tutto il resto e si integrano nell'ordinamento per profondità.
 * Sono tutte riciclate da un pool: nessuna allocazione durante il gioco.
 *
 * Tipi disponibili:
 *  - 'chip'  scheggia solida (legno, pietra) con gravità e rimbalzo
 *  - 'puff'  nuvoletta che si espande e svanisce (polvere)
 *  - 'spark' scintilla luminosa in additive
 *  - 'leaf'  fogliolina che scende ondeggiando
 */

import { CFG } from '../data/config.js';
import { ObjectPool } from '../core/ObjectPool.js';
import { fxRand } from '../core/Rand.js';
import { SIN_P, projectY, depthOf } from '../render/Projection.js';
import { clamp } from '../core/MathUtils.js';

const makeP = () => ({
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
  life: 0, maxLife: 1, size: 1, grow: 0,
  color: '#fff', kind: 'chip', spin: 0, rot: 0,
  gravity: 1, drag: 0, bounce: 0, additive: false,
});

const resetP = (p) => { p.life = 0; p.rot = 0; p.additive = false; };

export class ParticleSystem {
  constructor() {
    this.pool = new ObjectPool(makeP, resetP, 220);
  }

  get count() { return this.pool.count; }

  /** Emette una particella grezza (usato dagli helper qui sotto). */
  emit(cfg) {
    if (this.pool.count >= CFG.fx.maxParticles) return null;
    const p = this.pool.obtain();
    Object.assign(p, cfg);
    p.life = 0;
    return p;
  }

  /* --------------------------------------------------------- preset --- */

  /** Schegge che schizzano da un impatto (colpo d'ascia). */
  chips(x, y, z, n, color, power = 1, dirX = 0, dirZ = 0) {
    for (let i = 0; i < n; i++) {
      const a = fxRand.range(0, Math.PI * 2);
      const s = fxRand.range(1.6, 4.2) * power;
      this.emit({
        x, y, z,
        vx: Math.cos(a) * s * 0.5 + dirX * s * 0.55,
        vy: fxRand.range(2.2, 5) * power,
        vz: Math.sin(a) * s * 0.5 + dirZ * s * 0.55,
        maxLife: fxRand.range(0.5, 0.95),
        size: fxRand.range(0.06, 0.13),
        color, kind: 'chip',
        spin: fxRand.sym(14), gravity: 1, drag: 0.6, bounce: 0.32,
      });
    }
  }

  /** Nuvoletta di polvere che si allarga (atterraggi, costruzioni). */
  puff(x, y, z, n, color = 'rgba(214,198,168,0.85)', spread = 0.7, size = 0.3) {
    for (let i = 0; i < n; i++) {
      const a = fxRand.range(0, Math.PI * 2);
      const s = fxRand.range(0.4, 1.5) * spread;
      this.emit({
        x: x + Math.cos(a) * 0.15, y: y + fxRand.range(0, 0.1), z: z + Math.sin(a) * 0.15,
        vx: Math.cos(a) * s, vy: fxRand.range(0.3, 1.1), vz: Math.sin(a) * s,
        maxLife: fxRand.range(0.45, 0.8),
        size: size * fxRand.range(0.7, 1.3), grow: fxRand.range(1.4, 2.6),
        color, kind: 'puff', gravity: -0.05, drag: 2.6,
      });
    }
  }

  /** Scintille luminose (raccolta, potenziamenti). */
  sparks(x, y, z, n, color = 'rgba(255,236,170,1)', power = 1) {
    for (let i = 0; i < n; i++) {
      const a = fxRand.range(0, Math.PI * 2);
      const s = fxRand.range(1.2, 3.4) * power;
      this.emit({
        x, y, z,
        vx: Math.cos(a) * s, vy: fxRand.range(1.4, 4) * power, vz: Math.sin(a) * s,
        maxLife: fxRand.range(0.35, 0.7),
        size: fxRand.range(0.07, 0.15), grow: -0.6,
        color, kind: 'spark', gravity: 0.55, drag: 1.2, additive: true,
      });
    }
  }

  /** Foglie che cadono ondeggiando (albero abbattuto). */
  leaves(x, y, z, n, color) {
    for (let i = 0; i < n; i++) {
      const a = fxRand.range(0, Math.PI * 2);
      this.emit({
        x: x + fxRand.sym(0.5), y: y + fxRand.sym(0.4), z: z + fxRand.sym(0.5),
        vx: Math.cos(a) * fxRand.range(0.3, 1.2),
        vy: fxRand.range(0.4, 1.6),
        vz: Math.sin(a) * fxRand.range(0.3, 1.2),
        maxLife: fxRand.range(1.4, 2.6),
        size: fxRand.range(0.08, 0.15),
        color, kind: 'leaf',
        spin: fxRand.sym(6), gravity: 0.16, drag: 1.1,
      });
    }
  }

  /** Anello di coriandoli per il completamento di un edificio. */
  confetti(x, y, z, n) {
    const cols = ['#ffce54', '#6ee7a0', '#7cc8ff', '#ff8fb1', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + fxRand.sym(0.3);
      const s = fxRand.range(2.5, 5.5);
      this.emit({
        x, y, z,
        vx: Math.cos(a) * s, vy: fxRand.range(4, 8), vz: Math.sin(a) * s,
        maxLife: fxRand.range(1.1, 1.9),
        size: fxRand.range(0.08, 0.16),
        color: cols[i % cols.length], kind: 'chip',
        spin: fxRand.sym(20), gravity: 1, drag: 0.5, bounce: 0.2,
      });
    }
  }

  /* ------------------------------------------------------------ update */

  update(dt) {
    this.pool.update((p) => {
      p.life += dt;
      if (p.life >= p.maxLife) return true;

      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vz *= k;
        if (p.kind !== 'chip') p.vy *= k;
      }
      p.vy -= 16 * p.gravity * dt;

      if (p.kind === 'leaf') {
        // ondeggio orizzontale tipico delle foglie
        p.vx += Math.sin(p.life * 6 + p.spin) * 0.9 * dt;
        p.vz += Math.cos(p.life * 5 + p.spin) * 0.9 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += p.spin * dt;

      if (p.y < 0) {
        if (p.bounce > 0.02 && p.vy < -0.4) {
          p.y = 0;
          p.vy = -p.vy * p.bounce;
          p.vx *= 0.6; p.vz *= 0.6;
          p.spin *= 0.5;
        } else {
          p.y = 0;
          p.vy = 0; p.vx *= 0.85; p.vz *= 0.85;
        }
      }
      return false;
    });
  }

  /**
   * Disegno diretto sul contesto (non passa dal draw-list ordinato:
   * le particelle sono piccole e sopra a quasi tutto, il costo di ordinarle
   * non ripagherebbe).
   */
  draw(ctx, cam, glowSprite) {
    const ppu = cam.ppu;
    const list = this.pool.active;
    let additiveOn = false;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const t = p.life / p.maxLife;
      const sx = p.x * ppu - cam.sx;
      const sy = projectY(p.y, p.z) * ppu - cam.sy;
      let size = (p.size + (p.grow || 0) * t * p.size) * ppu;
      if (size <= 0.4) continue;

      const alpha = p.kind === 'puff'
        ? clamp(1 - t, 0, 1) * 0.75
        : clamp(1 - t * t, 0, 1);

      if (p.additive !== additiveOn) {
        ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
        additiveOn = p.additive;
      }
      ctx.globalAlpha = alpha;

      if (p.kind === 'spark' && glowSprite) {
        ctx.drawImage(glowSprite.canvas, sx - size, sy - size, size * 2, size * 2);
      } else if (p.kind === 'puff') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(sx, sy, size, size * 0.86, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // scheggia/coriandolo: piccolo quadrato ruotato
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-size / 2, -size / 2 * SIN_P, size, size * SIN_P * 1.4);
        ctx.restore();
      }
    }
    if (additiveOn) ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    void depthOf;
  }
}
