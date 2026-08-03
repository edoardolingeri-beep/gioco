/**
 * TreeEntity.js — L'albero: il cuore della Fase 1.
 *
 * Ciclo di vita:
 *   ALIVE ──(colpi d'ascia)──▶ FALLING ──▶ STUMP ──(attesa)──▶ GROWING ──▶ ALIVE
 *
 * Ogni colpo produce: scuotimento elastico dell'albero, schegge, suono,
 * vibrazione e un numero volante. L'abbattimento genera i tronchi.
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { fxRand } from '../core/Rand.js';
import { clamp, easeOutCubic, easeInQuad, rgbToCss } from '../core/MathUtils.js';

export const TREE_STATE = {
  ALIVE: 0, FALLING: 1, STUMP: 2, GROWING: 3,
};

export class TreeEntity extends Entity {
  /**
   * @param {number} x @param {number} z
   * @param {object} sprite sprite dell'albero
   * @param {object} stumpSprite sprite del ceppo
   * @param {object} saplingSprite sprite dell'alberello
   */
  constructor(x, z, sprite, stumpSprite, saplingSprite, scale = 1) {
    super(x, z);
    this.sprite = sprite;
    this.stumpSprite = stumpSprite;
    this.saplingSprite = saplingSprite;
    this.scale = scale;
    this.radius = (sprite.radius ?? 0.4) * scale;
    this.solid = true;
    this.static = false;

    this.state = TREE_STATE.ALIVE;
    this.hp = CFG.harvest.treeHitsBase;
    this.maxHp = CFG.harvest.treeHitsBase;

    /* animazione */
    this.shake = 0;          // ampiezza corrente dell'oscillazione
    this.shakePhase = 0;
    this.shakeDir = 1;
    this.fallT = 0;          // 0..1 avanzamento caduta
    this.fallDir = 1;        // verso della caduta (segno della rotazione)
    this.timer = 0;
    this.growT = 0;
    this.harvestable = true;
    /** Un operaio al lavoro qui: nessun altro operaio lo sceglie come bersaglio. */
    this.reservedBy = null;
  }

  /** Colpisci l'albero. Ritorna true se questo colpo lo abbatte. */
  hit(damage, fromX, fromZ, game) {
    if (this.state !== TREE_STATE.ALIVE) return false;
    this.hp -= damage;

    // scuotimento: l'albero rimbalza dalla parte opposta al colpo
    const dx = this.x - fromX, dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.shakeDir = dx / len;
    this.shakeDirZ = dz / len;
    this.shake = 0.11;
    this.shakePhase = 0;

    const hitY = 0.85 * this.scale;
    game.fx.chips(this.x, hitY, this.z, 7, rgbToCss(PAL.woodEnd), 1, -dx / len, -dz / len);
    game.fx.leaves(this.x, this.spriteTopY * 0.78, this.z, 3, rgbToCss(PAL.leafA));
    game.audio.chop();
    game.haptics.fire('light', 30);
    game.cam.addShake(0.1);

    if (this.hp <= 0) {
      this.fell(dx / len, dz / len, game);
      return true;
    }
    return false;
  }

  /**
   * Fa cadere l'albero nella direzione del colpo.
   * @param {boolean} silent se true non fa cadere tronchi a terra: li porta
   *   già con sé chi lo ha abbattuto (un operaio), non c'è nulla da
   *   raccogliere fisicamente.
   */
  fell(dirX, dirZ, game, silent = false) {
    this.state = TREE_STATE.FALLING;
    this.fallT = 0;
    this.solid = false;
    this.silentFall = silent;
    // Cade "verso destra" o "verso sinistra" sullo schermo, a seconda del colpo.
    this.fallDir = dirX >= 0 ? 1 : -1;
    if (Math.abs(dirX) < 0.25) this.fallDir = fxRand.chance(0.5) ? 1 : -1;
    void dirZ;
    game.audio.treeFall();
    game.haptics.fire('medium', 0);
  }

  get spriteTopY() {
    return (this.sprite.height ?? 2) * this.scale;
  }

  update(dt, game) {
    switch (this.state) {
      case TREE_STATE.ALIVE:
        if (this.shake > 0.0004) {
          this.shakePhase += dt * 19;
          this.shake *= Math.exp(-7.5 * dt);
        } else this.shake = 0;
        break;

      case TREE_STATE.FALLING: {
        const prev = this.fallT;
        this.fallT += dt * 1.25;
        if (prev < 0.55 && this.fallT >= 0.55) {
          // impatto al suolo: polvere, scuotimento e i tronchi che schizzano
          const ang = this.fallDir * Math.PI * 0.5;
          const cx = this.x + Math.sin(ang) * this.spriteTopY * 0.45;
          const cz = this.z + this.spriteTopY * 0.1;
          game.fx.puff(cx, 0.05, cz, 12, 'rgba(196,214,164,0.9)', 1.5, 0.4);
          game.fx.leaves(cx, 0.6, cz, 10, rgbToCss(PAL.leafB));
          game.cam.addShake(0.45);
          game.haptics.fire('heavy', 0);
          if (!this.silentFall) game.spawnLogs(this);
        }
        if (this.fallT >= 1.25) this.toStump();
        break;
      }

      case TREE_STATE.STUMP:
        this.timer += dt;
        if (this.timer >= CFG.harvest.treeRegrowDelay) {
          this.state = TREE_STATE.GROWING;
          this.growT = 0;
          game.fx.sparks(this.x, 0.3, this.z, 8, 'rgba(150,240,160,1)', 0.7);
        }
        break;

      case TREE_STATE.GROWING:
        this.growT += dt / CFG.harvest.treeGrowTime;
        if (this.growT >= 1) {
          this.state = TREE_STATE.ALIVE;
          this.hp = this.maxHp;
          this.solid = true;
          this.harvestable = true;
          game.fx.leaves(this.x, this.spriteTopY * 0.7, this.z, 6, rgbToCss(PAL.leafC));
        }
        break;
    }
  }

  toStump() {
    this.state = TREE_STATE.STUMP;
    this.timer = 0;
    this.solid = false;
    this.harvestable = false;
    this.radius = 0.3;
    this.reservedBy = null;
  }

  draw(r, game) {
    const st = this.state;

    if (st === TREE_STATE.ALIVE) {
      // oscillazione elastica dopo il colpo
      const rot = this.shake * Math.sin(this.shakePhase) * this.shakeDir;
      const sway = Math.sin(game.time * 0.9 + this.x * 0.7) * 0.012;
      r.shadow(this.x, this.z, this.radius * 1.5, 1);
      r.sprite(this.sprite, this.x, 0, this.z, {
        scale: this.scale,
        rot: rot + sway,
        pivotY: 0,
        depth: this.depth,
      });
      return;
    }

    if (st === TREE_STATE.FALLING) {
      const t = clamp(this.fallT, 0, 1.25);
      let ang;
      if (t < 0.55) {
        // caduta accelerata (come una vera rotazione attorno alla base)
        ang = easeInQuad(t / 0.55) * Math.PI * 0.5;
      } else {
        // piccolo rimbalzo all'impatto
        const b = (t - 0.55) / 0.7;
        ang = Math.PI * 0.5 - Math.sin(b * Math.PI * 2) * 0.06 * (1 - b);
      }
      const alpha = t > 0.95 ? clamp(1 - (t - 0.95) / 0.3, 0, 1) : 1;
      r.shadow(this.x, this.z, this.radius * 1.5, alpha);
      r.sprite(this.sprite, this.x, 0, this.z, {
        scale: this.scale,
        rot: ang * this.fallDir,
        alpha,
        depth: this.depth + 0.01,
      });
      // il ceppo appare già durante la caduta
      r.sprite(this.stumpSprite, this.x, 0, this.z, { depth: this.depth });
      return;
    }

    if (st === TREE_STATE.STUMP) {
      r.shadow(this.x, this.z, 0.42, 1);
      r.sprite(this.stumpSprite, this.x, 0, this.z, { depth: this.depth });
      return;
    }

    // GROWING: il ceppo resta, l'alberello cresce con un rimbalzo
    const k = easeOutCubic(clamp(this.growT, 0, 1));
    r.shadow(this.x, this.z, 0.42 + k * 0.6, 1);
    r.sprite(this.stumpSprite, this.x, 0, this.z, { depth: this.depth });
    r.sprite(this.saplingSprite, this.x, 0, this.z, {
      scale: 0.25 + k * 0.85,
      squash: 1 + Math.sin(k * Math.PI) * 0.12,
      depth: this.depth + 0.005,
    });
    // quando è quasi cresciuto sfuma nell'albero vero
    if (this.growT > 0.75) {
      r.sprite(this.sprite, this.x, 0, this.z, {
        scale: this.scale * (0.75 + (this.growT - 0.75) * 1),
        alpha: clamp((this.growT - 0.75) / 0.25, 0, 1),
        depth: this.depth + 0.006,
      });
    }
  }
}
