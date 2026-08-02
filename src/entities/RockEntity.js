/**
 * RockEntity.js — Il masso di pietra (Fase 2).
 *
 * Stessa filosofia dell'albero: ti avvicini e il personaggio inizia da solo,
 * ma serve il PICCONE. Senza, un fumetto spiega cosa manca — è il modo in cui
 * il gioco insegna la progressione senza tutorial.
 *
 * Ciclo: INTATTO ──(picconate)──▶ FRANTUMATO ──(attesa)──▶ RIFORMATO
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { drawPanel } from '../ui/WorldUI.js';
import { clamp, damp, easeOutBack, rgbToCss } from '../core/MathUtils.js';

export const ROCK_STATE = { SOLID: 0, BROKEN: 1, REFORMING: 2 };

export class RockEntity extends Entity {
  constructor(x, z, sprite, rubbleSprite, scale = 1) {
    super(x, z);
    this.sprite = sprite;
    this.rubbleSprite = rubbleSprite;
    this.scale = scale;
    this.radius = (sprite.radius ?? 0.6) * scale;
    this.solid = true;
    this.static = false;

    this.state = ROCK_STATE.SOLID;
    this.maxHp = CFG.harvest.rockHits;
    this.hp = this.maxHp;
    this.harvestable = true;

    this.shake = 0;
    this.shakePhase = 0;
    this.shakeDir = 1;
    this.timer = 0;
    this.growT = 0;
    this.squash = 1;
  }

  /** Il tipo di risorsa che produce (predisposto per ferro e oro). */
  get resource() { return 'stone'; }

  hit(damage, fromX, fromZ, game) {
    if (this.state !== ROCK_STATE.SOLID) return false;
    this.hp -= damage;

    const dx = this.x - fromX, dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.shakeDir = dx / len;
    this.shake = 0.07;
    this.shakePhase = 0;
    this.squash = 0.93;

    const hitY = 0.5 * this.scale;
    game.fx.chips(this.x, hitY, this.z, 8, rgbToCss(PAL.stoneLight), 1, -dx / len, -dz / len);
    game.fx.sparks(this.x, hitY, this.z, 3, 'rgba(255,240,200,1)', 0.5);
    game.audio.mine();
    game.haptics.fire('medium', 30);
    game.cam.addShake(0.13);

    if (this.hp <= 0) {
      this.shatter(game);
      return true;
    }
    return false;
  }

  /** Il masso esplode in schegge e rilascia la pietra. */
  shatter(game) {
    this.state = ROCK_STATE.BROKEN;
    this.solid = false;
    this.harvestable = false;
    this.radius = 0.34;
    this.timer = 0;

    game.audio.rockBreak();
    game.haptics.fire('heavy', 0);
    game.cam.addShake(0.42);
    game.fx.chips(this.x, 0.5 * this.scale, this.z, 18, rgbToCss(PAL.stone), 1.5);
    game.fx.puff(this.x, 0.1, this.z, 10, 'rgba(198,200,208,0.85)', 1.1, 0.32);
    game.spawnStones(this);
  }

  update(dt, game) {
    this.squash = damp(this.squash, 1, 11, dt);

    switch (this.state) {
      case ROCK_STATE.SOLID:
        if (this.shake > 0.0004) {
          this.shakePhase += dt * 24;
          this.shake *= Math.exp(-9 * dt);
        } else this.shake = 0;
        break;

      case ROCK_STATE.BROKEN:
        this.timer += dt;
        if (this.timer >= CFG.harvest.rockRegrowDelay) {
          this.state = ROCK_STATE.REFORMING;
          this.growT = 0;
          game.fx.sparks(this.x, 0.3, this.z, 8, 'rgba(200,220,255,1)', 0.7);
        }
        break;

      case ROCK_STATE.REFORMING:
        this.growT += dt / 2.2;
        if (this.growT >= 1) {
          this.state = ROCK_STATE.SOLID;
          this.hp = this.maxHp;
          this.solid = true;
          this.harvestable = true;
          this.radius = (this.sprite.radius ?? 0.6) * this.scale;
        }
        break;
    }
  }

  draw(r, game) {
    if (this.state === ROCK_STATE.SOLID) {
      const rot = this.shake * Math.sin(this.shakePhase) * this.shakeDir;
      r.shadow(this.x, this.z, this.radius * 1.15, 1);
      r.sprite(this.sprite, this.x, 0, this.z, {
        scale: this.scale,
        rot,
        squash: this.squash,
        depth: this.depth,
      });
      void game;
      return;
    }

    if (this.state === ROCK_STATE.BROKEN) {
      r.shadow(this.x, this.z, 0.4, 0.8);
      r.sprite(this.rubbleSprite, this.x, 0, this.z, { depth: this.depth });
      return;
    }

    // REFORMING: le macerie restano e il masso ricresce con un rimbalzo
    const k = clamp(this.growT, 0, 1);
    r.shadow(this.x, this.z, 0.4 + k * this.radius, 1);
    r.sprite(this.rubbleSprite, this.x, 0, this.z, { depth: this.depth });
    r.sprite(this.sprite, this.x, 0, this.z, {
      scale: this.scale * (0.2 + easeOutBack(k) * 0.8),
      alpha: clamp(k * 1.6, 0, 1),
      depth: this.depth + 0.004,
    });
  }

  /**
   * Se ti avvicini senza piccone compare un suggerimento: è il modo del gioco
   * di spiegare la progressione senza aprire un tutorial.
   */
  drawUI(ctx, cam, dpr, game) {
    if (this.state !== ROCK_STATE.SOLID || game.stats.hasPick) return;
    const d2 = (game.player.x - this.x) ** 2 + (game.player.z - this.z) ** 2;
    if (d2 > 9) return;
    this.hintT = Math.min(1, (this.hintT ?? 0) + 0.12);
    drawPanel(ctx, cam, dpr, this.x, this.sprite.height * this.scale + 0.5, this.z, {
      title: 'Serve il piccone ⛏️',
      appear: this.hintT,
      width: 150,
      titleColor: '#cbd2e0',
    });
  }
}
