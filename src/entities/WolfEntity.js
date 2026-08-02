/**
 * WolfEntity.js — Il lupo (Fase 2).
 *
 * Intelligenza semplice ma leggibile, che è ciò che conta in un gioco mobile:
 * il giocatore deve capire a colpo d'occhio cosa sta per succedere.
 *
 *   VAGA ──(ti avvista)──▶ INSEGUE ──(a tiro)──▶ MORDE ──▶ ARRETRA
 *                              │
 *                              └──(ti allontani troppo)──▶ TORNA A VAGARE
 *
 * Quando ti colpisce può anche farti CADERE UN TRONCO dalla catasta: è una
 * minaccia che si sente, senza essere punitiva.
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { ENEMY } from '../models/enemies.js';
import { depthOf, projectY } from '../render/Projection.js';
import { fxRand } from '../core/Rand.js';
import {
  clamp, damp, angleTowards, TAU, easeOutCubic, dist,
} from '../core/MathUtils.js';

const STATE = { WANDER: 0, CHASE: 1, ATTACK: 2, RECOIL: 3, DYING: 4 };
export const WOLF_STATE = STATE;

export class WolfEntity extends Entity {
  constructor(x, z, game) {
    super(x, z);
    this.game = game;
    this.static = false;
    this.radius = 0.42;
    this.solid = false;

    const C = CFG.enemies.wolf;
    this.maxHp = C.hp;
    this.hp = C.hp;
    this.speed = C.speed;

    this.vx = 0; this.vz = 0;
    this.yaw = fxRand.range(0, TAU);
    this.state = STATE.WANDER;
    this.anim = 'idle';
    this.animT = 0;
    this.attackT = 0;
    this.cooldown = 0;
    this.stateTimer = 0;

    // meta della passeggiata quando è tranquillo
    this.homeX = x; this.homeZ = z;
    this.wanderX = x; this.wanderZ = z;
    this.wanderTimer = 0;

    this.hurtFlash = 0;
    this.alert = 0;          // punto esclamativo quando ti avvista
    this.deathT = 0;
    this.squash = 1;
  }

  get alive() { return this.state !== STATE.DYING; }

  /* ---------------------------------------------------------- combattimento */

  /** Riceve danno dal giocatore. */
  takeDamage(n, fromX, fromZ, game) {
    if (this.state === STATE.DYING) return;
    this.hp -= n;
    this.hurtFlash = 1;
    game.fx.chips(this.x, 0.55, this.z, 6, 'rgba(220,90,90,1)', 1);
    game.texts.spawn(`-${n}`, this.x, 1.0, this.z, { color: '#ff9a8b', size: 0.85, life: 0.7 });
    game.audio.hitFlesh();
    game.haptics.fire('medium', 30);

    // contraccolpo
    const dx = this.x - fromX, dz = this.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.vx += (dx / d) * 5.5;
    this.vz += (dz / d) * 5.5;
    this.squash = 0.82;

    if (this.hp <= 0) this._die(game);
    else {
      this.state = STATE.RECOIL;
      this.stateTimer = 0.28;
    }
  }

  _die(game) {
    this.state = STATE.DYING;
    this.deathT = 0;
    this.solid = false;
    game.audio.wolfDie();
    game.cam.addShake(0.25);
    game.fx.puff(this.x, 0.3, this.z, 8, 'rgba(190,195,210,0.8)', 0.8, 0.28);
    game.fx.sparks(this.x, 0.5, this.z, 10, 'rgba(255,220,160,1)', 0.9);
    game.bus.emit('enemy:killed', this);
  }

  /* -------------------------------------------------------------- update */

  update(dt, game) {
    const p = game.player;
    const C = CFG.enemies.wolf;
    this.hurtFlash = damp(this.hurtFlash, 0, 6, dt);
    this.squash = damp(this.squash, 1, 10, dt);
    this.cooldown -= dt;
    this.alert = damp(this.alert, 0, 1.6, dt);

    if (this.state === STATE.DYING) {
      this.deathT += dt / 0.55;
      if (this.deathT >= 1) this.dead = true;
      return;
    }

    const d = dist(this.x, this.z, p.x, p.z);

    switch (this.state) {
      case STATE.WANDER: {
        this._wander(dt);
        // il giocatore viene avvistato solo se abbastanza vicino
        if (d < C.aggroRange && p.alive) {
          this.state = STATE.CHASE;
          this.alert = 1;
          game.audio.wolfHowl();
        }
        break;
      }

      case STATE.CHASE: {
        this._moveTowards(p.x, p.z, this.speed, dt);
        if (d > C.leashRange) {
          this.state = STATE.WANDER;
          this.wanderTimer = 0;
        } else if (d < C.attackRange && this.cooldown <= 0) {
          this.state = STATE.ATTACK;
          this.attackT = 0;
          this.anim = 'attack';
        }
        break;
      }

      case STATE.ATTACK: {
        // durante il morso resta quasi fermo e punta il giocatore
        this.vx = damp(this.vx, 0, 9, dt);
        this.vz = damp(this.vz, 0, 9, dt);
        const desired = Math.atan2(p.x - this.x, p.z - this.z);
        this.yaw = angleTowards(this.yaw, desired, 7 * dt);

        const prev = this.attackT;
        this.attackT += dt / C.attackTime;
        // il colpo va a segno a 2/3 dell'animazione
        if (prev < 0.66 && this.attackT >= 0.66) this._bite(game, p);
        if (this.attackT >= 1) {
          this.state = STATE.CHASE;
          this.cooldown = C.attackCooldown;
          this.anim = 'walk';
        }
        break;
      }

      case STATE.RECOIL: {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = STATE.CHASE;
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
    if (this.state === STATE.ATTACK) {
      this.anim = 'attack';
    } else if (spd > 0.4) {
      this.anim = 'walk';
      this.animT = (this.animT + (spd / this.speed) * dt * 2.2) % 1;
    } else {
      this.anim = 'idle';
      this.animT = (this.animT + dt * 0.5) % 1;
    }
  }

  _bite(game, p) {
    const C = CFG.enemies.wolf;
    if (dist(this.x, this.z, p.x, p.z) > C.attackRange + 0.5) return;
    p.takeDamage(C.damage, this.x, this.z, game);

    // può far cadere un tronco dalla catasta: minaccia concreta ma non punitiva
    if (game.carry.total > 0 && fxRand.chance(C.stealChance)) {
      const type = game.carry.topType();
      game.carry.removeOne(type);
      game.pickups.spawn(type, p.x, 1.2, p.z, (p.x - this.x) * 0.4, (p.z - this.z) * 0.4, 1);
      game.texts.spawn('!', p.x, 2.0, p.z, { color: '#ff9a8b', size: 1.1, life: 0.8 });
    }
  }

  _wander(dt) {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      // nuova meta attorno alla tana, con pause
      const a = fxRand.range(0, TAU);
      const r = fxRand.range(1.5, CFG.enemies.wolf.wanderRadius);
      this.wanderX = this.homeX + Math.cos(a) * r;
      this.wanderZ = this.homeZ + Math.sin(a) * r;
      this.wanderTimer = fxRand.range(2.2, 5);
      this.pausing = fxRand.chance(0.35);
    }
    if (this.pausing) {
      this.vx = damp(this.vx, 0, 5, dt);
      this.vz = damp(this.vz, 0, 5, dt);
      return;
    }
    this._moveTowards(this.wanderX, this.wanderZ, this.speed * 0.42, dt);
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
    const R = CFG.world.radius;
    const dl = Math.hypot(this.x, this.z);
    if (dl > R) { this.x = (this.x / dl) * R; this.z = (this.z / dl) * R; }
  }

  /* ---------------------------------------------------------------- draw */

  _dirIndex() {
    const d = ENEMY.dirs;
    let a = this.yaw % TAU;
    if (a < 0) a += TAU;
    return Math.round((a / TAU) * d) % d;
  }

  draw(r, game) {
    const atlas = game.assets.wolf;
    if (!atlas) return;
    const di = this._dirIndex();

    let sp;
    if (this.anim === 'attack') {
      const f = clamp(Math.floor(this.attackT * ENEMY.attackFrames), 0, ENEMY.attackFrames - 1);
      sp = atlas.attack[di]?.[f];
    } else if (this.anim === 'walk') {
      sp = atlas.walk[di]?.[Math.floor(this.animT * ENEMY.walkFrames) % ENEMY.walkFrames];
    } else {
      sp = atlas.idle[di];
    }
    if (!sp) sp = atlas.idle[di] ?? atlas.idle[0];

    const depth = depthOf(0, this.z);

    if (this.state === STATE.DYING) {
      // si accascia e svanisce
      const k = easeOutCubic(clamp(this.deathT, 0, 1));
      r.shadow(this.x, this.z, 0.5 * (1 - k * 0.6), 1 - k);
      r.sprite(sp, this.x, 0, this.z, {
        depth,
        alpha: 1 - k,
        rot: k * 1.1,
        squash: 1 - k * 0.45,
      });
      return;
    }

    r.shadow(this.x, this.z, 0.5, 1);
    r.sprite(sp, this.x, 0, this.z, {
      depth,
      // Il colpo subito si legge dallo schiacciamento e dalle particelle
      // rosse: molto più economico di un secondo blit additivo.
      squash: this.squash * (1 + this.hurtFlash * 0.12),
    });

    // punto esclamativo quando ti avvista
    if (this.alert > 0.02 && game.assets.alertMark) {
      r.sprite(game.assets.alertMark, this.x, 0.95 + this.alert * 0.2, this.z, {
        depth: depth + 5,
        alpha: clamp(this.alert * 1.4, 0, 1),
        scale: 0.7 + this.alert * 0.4,
      });
    }
  }

  /** Barra della vita disegnata nella passata UI (coordinate schermo). */
  drawUI(ctx, cam, dpr, game) {
    if (!this.alive || this.hp >= this.maxHp) return;
    const sx = this.x * cam.ppu - cam.sx;
    const sy = projectY(1.05, this.z) * cam.ppu - cam.sy;
    const w = 34 * dpr, h = 5 * dpr;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx - w / 2, sy, w, h);
    ctx.fillStyle = '#ff6b5b';
    ctx.fillRect(sx - w / 2, sy, w * clamp(this.hp / this.maxHp, 0, 1), h);
    void game;
  }
}
