/**
 * Player.js — Il personaggio giocante.
 *
 * Responsabilità:
 *  - movimento fluido con accelerazione/attrito e rotazione morbida;
 *  - collisione con gli oggetti solidi;
 *  - scelta del frame di animazione dall'atlante pre-cotto;
 *  - disegno della PILA DI TRONCHI sulla schiena, con oscillazione fisica;
 *  - taglio automatico dell'albero più vicino.
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { CHAR } from '../models/character.js';
import { TreeEntity, TREE_STATE } from './TreeEntity.js';
import { depthOf } from '../render/Projection.js';
import { clamp, damp, angleTowards, angleDelta, TAU, easeOutBack } from '../core/MathUtils.js';

export class Player extends Entity {
  constructor(x, z, game) {
    super(x, z);
    this.game = game;
    this.static = false;
    this.radius = CFG.player.radius;

    this.vx = 0; this.vz = 0;
    this.yaw = 0;            // direzione in cui guarda
    this.speed = 0;

    this.anim = 'idle';
    this.animT = 0;          // fase 0..1 del ciclo
    this.chopT = 0;
    this.chopTimer = 0;
    this.target = null;      // albero che sta tagliando

    /* oscillazione elastica della pila sulla schiena */
    this.swayX = 0; this.swayZ = 0;
    this.prevVX = 0; this.prevVZ = 0;
    this.stackBump = 0;      // rimbalzo quando arriva un nuovo tronco

    this.stepPhase = 0;
    this.squash = 1;
  }

  /** Altezza della cima della pila (bersaglio dei tronchi attratti). */
  carryTopY() {
    const n = this.game.carry.total;
    return CFG.carry.stackOrigin.y + Math.min(n, 40) * CFG.carry.logStep * 0.5 + 0.2;
  }

  /** Piccolo rimbalzo visivo quando un tronco atterra sulla pila. */
  bumpStack() {
    this.stackBump = 1;
    this.squash = 0.9;
  }

  /* ------------------------------------------------------------- update */

  update(dt, game) {
    const P = CFG.player;
    const input = game.input;
    const maxSpeed = P.speed * (game.stats.speedMul ?? 1)
      // con lo zaino pieno si è leggermente più lenti: dà peso all'azione
      * (1 - 0.16 * game.carry.fillRatio);

    /* --- movimento --- */
    const ix = input.x, iz = input.z;
    const mag = input.mag;
    const canMove = this.anim !== 'chop' || mag > 0.05;

    if (mag > 0.02 && canMove) {
      const tx = ix * maxSpeed, tz = iz * maxSpeed;
      this.vx = damp(this.vx, tx, P.accel * 0.55, dt);
      this.vz = damp(this.vz, tz, P.accel * 0.55, dt);
      const desired = Math.atan2(ix, iz);
      this.yaw = angleTowards(this.yaw, desired, P.turnSpeed * dt * (0.4 + mag));
    } else {
      this.vx = damp(this.vx, 0, P.friction, dt);
      this.vz = damp(this.vz, 0, P.friction, dt);
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.speed = Math.hypot(this.vx, this.vz);

    this._collide(game);
    game.grid.update(this);

    /* --- oscillazione della pila (molla sull'accelerazione) --- */
    const ax = (this.vx - this.prevVX) / Math.max(dt, 1e-4);
    const az = (this.vz - this.prevVZ) / Math.max(dt, 1e-4);
    this.prevVX = this.vx; this.prevVZ = this.vz;
    const C = CFG.carry;
    const targetSwayX = clamp(-(ax * 0.012 + this.vx * 0.05), -C.maxLean, C.maxLean);
    const targetSwayZ = clamp(-(az * 0.012 + this.vz * 0.05), -C.maxLean, C.maxLean);
    this.swayX = damp(this.swayX, targetSwayX, C.swayDamp, dt);
    this.swayZ = damp(this.swayZ, targetSwayZ, C.swayDamp, dt);

    this.stackBump = damp(this.stackBump, 0, 9, dt);
    this.squash = damp(this.squash, 1, 12, dt);

    /* --- taglio automatico --- */
    this._updateChop(dt, game);

    /* --- animazione --- */
    this._updateAnim(dt, game);
  }

  /** Spinge il giocatore fuori dagli oggetti solidi. */
  _collide(game) {
    const near = game.scratch.near;
    game.grid.queryRadius(this.x, this.z, 2.2, near);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (!e.solid || e === this) continue;
      const dx = this.x - e.x, dz = this.z - e.z;
      const rr = this.radius + e.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      const push = (rr - d);
      this.x += (dx / d) * push;
      this.z += (dz / d) * push;
      // annulla la componente di velocità entrante (niente "tremolio")
      const nx = dx / d, nz = dz / d;
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) { this.vx -= nx * vn; this.vz -= nz * vn; }
    }
    // limiti della mappa
    const R = CFG.world.radius;
    const dl = Math.hypot(this.x, this.z);
    if (dl > R) {
      this.x = (this.x / dl) * R;
      this.z = (this.z / dl) * R;
    }
  }

  /** Trova l'albero più vicino e lo taglia automaticamente. */
  _updateChop(dt, game) {
    // Si taglia quando si è fermi (o si sta spingendo contro il tronco).
    const stationary = this.speed < 1.2;
    let best = null, bestD = Infinity;

    if (stationary && !game.carry.isFull) {
      const near = game.scratch.near;
      const range = CFG.player.actionRange;
      game.grid.queryRadius(this.x, this.z, range + 1.2, near);
      for (let i = 0; i < near.length; i++) {
        const e = near[i];
        if (!(e instanceof TreeEntity)) continue;
        if (!e.harvestable || e.state !== TREE_STATE.ALIVE) continue;
        const dx = e.x - this.x, dz = e.z - this.z;
        const d = Math.hypot(dx, dz) - e.radius;
        if (d > range) continue;
        // preferisci l'albero davanti a te
        const ang = Math.abs(angleDelta(this.yaw, Math.atan2(dx, dz)));
        const score = d + ang * 0.35;
        if (score < bestD) { bestD = score; best = e; }
      }
    }

    this.target = best;

    if (best) {
      // guarda l'albero
      const desired = Math.atan2(best.x - this.x, best.z - this.z);
      this.yaw = angleTowards(this.yaw, desired, 9 * dt);

      this.chopTimer -= dt;
      if (this.anim !== 'chop') {
        this.anim = 'chop';
        this.chopT = 0;
      }
      if (this.chopTimer <= 0) {
        this.chopTimer = CFG.harvest.chopInterval / (game.stats.chopSpeed ?? 1);
        this.chopT = 0;
      }
      // il colpo va a segno a metà dell'animazione
      const interval = CFG.harvest.chopInterval / (game.stats.chopSpeed ?? 1);
      const prev = this.chopT;
      this.chopT = clamp(1 - this.chopTimer / interval, 0, 1);
      if (prev < 0.62 && this.chopT >= 0.62) {
        best.hit(game.stats.axeDamage ?? 1, this.x, this.z, game);
      }
    } else if (this.anim === 'chop') {
      this.anim = 'idle';
    }
  }

  _updateAnim(dt, game) {
    if (this.target) {
      this.anim = 'chop';
      return;
    }
    if (this.speed > 0.35) {
      this.anim = 'walk';
      // la fase avanza proporzionalmente alla velocità: niente "pattinaggio"
      const prev = this.animT;
      this.animT = (this.animT + (this.speed / CFG.player.speed) * dt * 1.75) % 1;
      // suono dei passi ai due appoggi del ciclo
      const crossed = (prev % 0.5) > (this.animT % 0.5);
      if (crossed) {
        game.audio.step();
        game.fx.puff(this.x, 0.02, this.z, 1, 'rgba(210,225,190,0.5)', 0.25, 0.1);
      }
    } else {
      this.anim = 'idle';
      this.animT = (this.animT + dt * 0.45) % 1;
    }
  }

  /* --------------------------------------------------------------- draw */

  /** Indice di direzione nell'atlante (0..dirs-1). */
  _dirIndex() {
    const d = CHAR.dirs;
    let a = this.yaw % TAU;
    if (a < 0) a += TAU;
    return Math.round((a / TAU) * d) % d;
  }

  draw(r, game) {
    const A = game.assets;
    const atlas = A.char;
    if (!atlas) return;
    const di = this._dirIndex();

    let sp;
    if (this.anim === 'chop') {
      const f = clamp(Math.floor(this.chopT * CHAR.chopFrames), 0, CHAR.chopFrames - 1);
      sp = atlas.chop[di]?.[f];
    } else if (this.anim === 'walk') {
      const f = Math.floor(this.animT * CHAR.walkFrames) % CHAR.walkFrames;
      sp = atlas.walk[di]?.[f];
    } else {
      sp = atlas.idle[di];
    }
    if (!sp) sp = atlas.idle[di] ?? atlas.idle[0];

    const depth = depthOf(0, this.z);

    r.shadow(this.x, this.z, 0.42, 1);

    // respiro nell'idle (in pixel schermo, gratis)
    const breath = this.anim === 'idle'
      ? Math.sin(game.time * 2.4) * 0.012 : 0;

    r.sprite(sp, this.x, breath, this.z, {
      depth,
      squash: this.squash,
    });

    this._drawStack(r, game, depth);
  }

  /**
   * La pila di tronchi sulla schiena.
   * Ogni tronco è una sprite pre-cotta nella direzione giusta: costa un blit.
   * L'oscillazione cresce con l'altezza, così la catasta "frusta" nelle curve.
   */
  _drawStack(r, game, baseDepth) {
    const stack = game.carry.stack;
    if (!stack.length) return;
    const A = game.assets;
    const C = CFG.carry;
    const dirs = CHAR.dirs;

    // versore "dietro le spalle" (il personaggio guarda verso +Z a yaw 0)
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const bx = -fx, bz = -fz;
    // versore laterale
    const sx = fz, sz = -fx;
    // distanza della catasta dalla schiena (stackOrigin.z è negativo = dietro)
    const backDist = -C.stackOrigin.z;

    const di = this._dirIndex();
    const logSprite = A.carriedLogs ? A.carriedLogs[di] : A.carriedLog;

    const n = stack.length;
    for (let i = 0; i < n; i++) {
      const s = stack[i];
      const h = i * C.logStep;
      const lean = h * C.swayGain * 4.2;

      // rimbalzo di ingresso: il tronco nuovo "cade" al suo posto
      const app = s.t < 1 ? easeOutBack(s.t) : 1;
      const appOff = (1 - app) * 0.55;

      // spinta extra all'arrivo di un nuovo tronco
      const bump = this.stackBump * Math.sin((i / Math.max(1, n)) * Math.PI) * 0.05;

      const ox = bx * backDist + this.swayX * lean + s.jx + sx * (i % 2 ? 0.035 : -0.035);
      const oz = bz * backDist + this.swayZ * lean + s.jz + sz * (i % 2 ? 0.035 : -0.035);

      r.sprite(logSprite, this.x + ox, C.stackOrigin.y + h + appOff + bump, this.z + oz, {
        // ogni tronco è leggermente più avanti nella pila per un ordine stabile
        depth: baseDepth + (bz < 0 ? -0.02 : 0.02) + i * 0.0006,
        rot: s.jr * 0.35,
        scale: 0.94 + Math.sin(i * 1.7) * 0.03,
      });
    }
  }
}
