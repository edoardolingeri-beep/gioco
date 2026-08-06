/**
 * ThiefEntity.js — Il ladro (raid, Fase 3+).
 *
 * Non caccia il giocatore: punta dritto al centro del villaggio, dove tiene
 * la cassa. Se ci arriva indisturbato ruba una parte delle monete e fugge;
 * se il giocatore o la torretta lo colpiscono a sufficienza, muore prima di
 * riuscirci. Il vero ostacolo è fisico, non un dado nascosto: come lupi e
 * orsi non ha `opensGates` (vedi `FenceGateEntity`), quindi un recinto
 * chiuso lo blocca davvero, proprio come bloccherebbe il giocatore.
 *
 *   ARRIVA ──(a tiro della cassa)──▶ RUBA ──▶ FUGGE
 *      │
 *      └──(bloccato troppo a lungo dal recinto)──▶ FUGGE (rinuncia, niente furto)
 *      └──(colpito a morte)──▶ MORTE
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { depthOf, projectY } from '../render/Projection.js';
import {
  clamp, damp, angleTowards, easeOutCubic, dist,
} from '../core/MathUtils.js';

const STATE = { APPROACH: 0, STEAL: 1, FLEE: 2, RECOIL: 3, DYING: 4 };
export const THIEF_STATE = STATE;

/** La cassa del villaggio: per ora un punto fisso al centro, dove batte
 *  ogni raid — semplice, e sempre vero indipendentemente da cosa è già
 *  stato costruito. */
const TARGET = { x: 0, z: 0 };

export class ThiefEntity extends Entity {
  /**
   * @param {number} x @param {number} z
   * @param {import('../core/Game.js').Game} game
   * @param {number} [variant] indice nell'atlante `game.assets.thief` (0..4)
   */
  constructor(x, z, game, variant) {
    super(x, z);
    this.game = game;
    this.static = false;
    this.radius = 0.36;
    this.solid = false;

    const C = CFG.raid;
    this.maxHp = C.hp;
    this.hp = C.hp;
    this.speed = C.speed;
    this.variant = variant ?? ((Math.random() * 5) | 0);

    this.vx = 0; this.vz = 0;
    this.yaw = Math.atan2(-x, -z);
    this.state = STATE.APPROACH;
    this.anim = 'walk';
    this.animT = Math.random();
    this.stateTimer = 0;
    this.giveUpTimer = C.giveUpTime;
    /** Monete rubate da QUESTO ladro (0 se respinto o mai arrivato). */
    this.stole = 0;

    this.hurtFlash = 0;
    this.deathT = 0;
    this.squash = 1;
    /** Assegnato da `RaidSystem._spawnRaid`: {resolve(thief)}. */
    this.raid = null;
  }

  get alive() { return this.state !== STATE.DYING; }

  /* ---------------------------------------------------------- combattimento */

  takeDamage(n, fromX, fromZ, game) {
    if (this.state === STATE.DYING || this.state === STATE.FLEE) return;
    this.hp -= n;
    this.hurtFlash = 1;
    game.fx.chips(this.x, 0.55, this.z, 6, 'rgba(220,90,90,1)', 1);
    game.texts.spawn(`-${n}`, this.x, 1.0, this.z, { color: '#ff9a8b', size: 0.85, life: 0.7 });
    game.audio.hitFlesh();
    game.haptics.fire('medium', 30);

    const dx = this.x - fromX, dz = this.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.vx += (dx / d) * 5.5;
    this.vz += (dz / d) * 5.5;
    this.squash = 0.82;

    if (this.hp <= 0) this._die(game);
    else {
      this.state = STATE.RECOIL;
      this.stateTimer = 0.24;
    }
  }

  _die(game) {
    this.state = STATE.DYING;
    this.deathT = 0;
    this.solid = false;
    game.audio.wolfDie();
    game.fx.puff(this.x, 0.3, this.z, 8, 'rgba(60,58,66,0.85)', 0.8, 0.28);
    game.fx.sparks(this.x, 0.5, this.z, 10, 'rgba(255,220,160,1)', 0.9);
    game.bus.emit('thief:repelled', this);
    this.raid?.resolve(this);
  }

  _flee(game) {
    this.state = STATE.FLEE;
    void game;
    this.raid?.resolve(this);
  }

  /* -------------------------------------------------------------- update */

  update(dt, game) {
    const C = CFG.raid;
    this.hurtFlash = damp(this.hurtFlash, 0, 6, dt);
    this.squash = damp(this.squash, 1, 10, dt);

    if (this.state === STATE.DYING) {
      this.deathT += dt / 0.55;
      if (this.deathT >= 1) this.dead = true;
      return;
    }

    switch (this.state) {
      case STATE.APPROACH: {
        this.giveUpTimer -= dt;
        const d = dist(this.x, this.z, TARGET.x, TARGET.z);
        if (d < C.approachRadius) {
          this.state = STATE.STEAL;
          this.stateTimer = 0.6;
          this.vx = 0; this.vz = 0;
        } else if (this.giveUpTimer <= 0) {
          this._flee(game);
        } else {
          this._moveTowards(TARGET.x, TARGET.z, this.speed, dt);
        }
        break;
      }

      case STATE.STEAL: {
        // resta fermo un istante a "frugare nella cassa": si legge meglio
        // di un furto istantaneo, e dà al giocatore un'ultima occasione di
        // intervenire prima che scappi.
        this.vx = damp(this.vx, 0, 9, dt);
        this.vz = damp(this.vz, 0, 9, dt);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this._steal(game);
        break;
      }

      case STATE.RECOIL: {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = STATE.APPROACH;
        break;
      }

      case STATE.FLEE: {
        // corre verso il bordo della mappa, nella direzione da cui era
        // arrivato: niente inseguimento, una volta scappato è scappato.
        const R = CFG.world.radius;
        const a = Math.atan2(this.x, this.z);
        this._moveTowards(Math.sin(a) * (R + 6), Math.cos(a) * (R + 6), this.speed * 1.25, dt);
        if (Math.hypot(this.x, this.z) > R + 2) this.dead = true;
        break;
      }
    }

    /* --- integrazione del movimento --- */
    this.vx = damp(this.vx, this.vx * 0.02, 6, dt);
    this.vz = damp(this.vz, this.vz * 0.02, 6, dt);
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this._collide(game);
    game.grid.update(this);

    /* --- animazione --- */
    const spd = Math.hypot(this.vx, this.vz);
    if (spd > 0.35) {
      this.anim = 'walk';
      this.animT = (this.animT + (spd / this.speed) * dt * 2.0) % 1;
    } else {
      this.anim = 'idle';
      this.animT = (this.animT + dt * 0.5) % 1;
    }
  }

  _steal(game) {
    const C = CFG.raid;
    const want = Math.round(clamp(game.stats.coins * C.stealFraction, C.stealMin, C.stealMax));
    const n = Math.min(want, game.stats.coins);
    if (n > 0) {
      game.spendCoins(n);
      this.stole = n;
      game.texts.spawn(`-${n}`, this.x, 1.4, this.z, {
        color: '#ff9a8b', icon: '🪙', size: 1.1, life: 1,
      });
      game.fx.puff(this.x, 0.4, this.z, 6, 'rgba(255,206,84,0.7)', 0.6, 0.3);
      game.cam.addShake(0.18);
    }
    this._flee(game);
  }

  _moveTowards(tx, tz, speed, dt) {
    const dx = tx - this.x, dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.12) return;
    this.vx = damp(this.vx, (dx / d) * speed, 8, dt);
    this.vz = damp(this.vz, (dz / d) * speed, 8, dt);
    const desired = Math.atan2(dx, dz);
    this.yaw = angleTowards(this.yaw, desired, 8 * dt);
  }

  _collide(game) {
    const near = game.scratch.near;
    game.grid.queryRadius(this.x, this.z, 2, near);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (!e.solid || e === this) continue;
      const dx = this.x - e.x, dz = this.z - e.z;
      const rr = this.radius + e.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      this.x += (dx / d) * (rr - d);
      this.z += (dz / d) * (rr - d);
    }
    game.world.blockRiver(this);
  }

  /* ---------------------------------------------------------------- draw */

  _dirIndex() {
    const atlas = this.game.assets.thief?.[this.variant];
    const d = atlas?.dirs ?? 8;
    let a = this.yaw % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return Math.round((a / (Math.PI * 2)) * d) % d;
  }

  draw(r, game) {
    const atlas = game.assets.thief?.[this.variant];
    if (!atlas) return;
    const di = this._dirIndex();

    let sp;
    if (this.anim === 'walk') {
      sp = atlas.walk[di]?.[Math.floor(this.animT * atlas.frames) % atlas.frames];
    } else {
      sp = atlas.idle[di];
    }
    if (!sp) sp = atlas.idle[di] ?? atlas.idle[0];

    const depth = depthOf(0, this.z);

    if (this.state === STATE.DYING) {
      const k = easeOutCubic(clamp(this.deathT, 0, 1));
      r.shadow(this.x, this.z, 0.4 * (1 - k * 0.6), 1 - k);
      r.sprite(sp, this.x, 0, this.z, {
        depth, alpha: 1 - k, rot: k * 1.1, squash: 1 - k * 0.45,
      });
      return;
    }

    r.shadow(this.x, this.z, 0.4, 1);
    r.sprite(sp, this.x, 0, this.z, {
      depth,
      squash: this.squash * (1 + this.hurtFlash * 0.12),
    });
  }

  /** Barra della vita: come i lupi, solo quando è già stato colpito. */
  drawUI(ctx, cam, dpr, game) {
    if (!this.alive || this.hp >= this.maxHp) return;
    const sx = this.x * cam.ppu - cam.sx;
    const sy = projectY(1.05, this.z) * cam.ppu - cam.sy;
    const w = 32 * dpr, h = 5 * dpr;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx - w / 2, sy, w, h);
    ctx.fillStyle = '#ff6b5b';
    ctx.fillRect(sx - w / 2, sy, w * clamp(this.hp / this.maxHp, 0, 1), h);
    void game;
  }
}
