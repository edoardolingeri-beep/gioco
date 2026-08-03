/**
 * WorkerEntity.js — L'operaio assunto: raccoglie risorse da solo.
 *
 * Routine, in un ciclo continuo:
 *   CERCA ──▶ VAI (verso l'albero/masso più vicino) ──▶ LAVORA (colpisce
 *   sul posto, riusando gli stessi effetti del giocatore) ──▶ TORNA (al
 *   cartello che l'ha assunto) ──▶ ACCUMULA ──▶ CERCA…
 *
 * Non passa mai dallo zaino del giocatore, ma non consegna nemmeno da solo:
 * l'albero/masso cade o si frantuma "in silenzio" (nessun tronco a terra da
 * raccogliere fisicamente, vedi `TreeEntity.fell`/`RockEntity.shatter`) e la
 * risorsa arriva già "in spalla" all'operaio, che la deposita nel magazzino
 * del cartello — tocca al giocatore passare a ritirarla e portarla a
 * destinazione. Se il magazzino è pieno, l'operaio aspetta lì con il carico
 * ancora in spalla finché non c'è di nuovo posto.
 */

import { Entity } from './Entity.js';
import { TreeEntity, TREE_STATE } from './TreeEntity.js';
import { RockEntity, ROCK_STATE } from './RockEntity.js';
import { depthOf } from '../render/Projection.js';
import { fxRand } from '../core/Rand.js';
import { damp, angleTowards, dist, TAU } from '../core/MathUtils.js';

const STATE = { SEEK: 0, WALK: 1, WORK: 2, RETURN: 3 };
const NPC_LOOKS_COUNT = 3;   // quante varianti di vestiario esistono per gli NPC

export class WorkerEntity extends Entity {
  /**
   * @param {import('./HireStationEntity.js').HireStationEntity} station
   *   il cartello che lo ha assunto: è anche la sua "casa" e il magazzino
   *   in cui deposita.
   */
  constructor(station, game) {
    super(station.x, station.z);
    this.game = game;
    this.station = station;
    this.def = station.def;
    this.homeX = station.x; this.homeZ = station.z;
    this.static = false;
    this.radius = 0.3;
    this.solid = false;

    this.speed = 2.35;
    this.vx = 0; this.vz = 0;
    this.yaw = fxRand.range(0, TAU);

    this.state = STATE.SEEK;
    this.seekCooldown = fxRand.range(0, 0.4);
    this.target = null;
    this.workT = 0;
    this.workPhase = fxRand.range(0, TAU);
    this.bob = 0;
    this.carrying = null;      // tipo di risorsa che sta riportando indietro

    this.anim = 'idle';
    this.animT = fxRand.next();
    this.variant = (Math.random() * NPC_LOOKS_COUNT) | 0;
    /** Fa aprire i cancelli automatici della staccionata quando è vicino. */
    this.opensGates = true;
  }

  /** Altezza a cui "tiene" la risorsa: serve solo per coerenza di stile con Player. */
  carryTopY() { return 0.95; }

  update(dt, game) {
    switch (this.state) {
      case STATE.SEEK: this._seek(dt, game); break;
      case STATE.WALK: this._walk(dt, game); break;
      case STATE.WORK: this._work(dt, game); break;
      case STATE.RETURN: this._return(dt, game); break;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    game.grid.update(this);

    const spd = Math.hypot(this.vx, this.vz);
    if (spd > 0.2) {
      this.anim = 'walk';
      this.animT = (this.animT + dt * 1.7) % 1;
    } else {
      this.anim = 'idle';
      this.animT = (this.animT + dt * 0.4) % 1;
    }
  }

  /** Cerca l'albero/masso raccoglibile più vicino entro il raggio di lavoro. */
  _seek(dt, game) {
    this.vx = damp(this.vx, 0, 8, dt);
    this.vz = damp(this.vz, 0, 8, dt);
    this.bob = damp(this.bob, 0, 8, dt);

    this.seekCooldown -= dt;
    if (this.seekCooldown > 0) return;
    this.seekCooldown = 0.5;

    const near = game.scratch.workerNear ?? (game.scratch.workerNear = []);
    game.grid.queryRadius(this.homeX, this.homeZ, this.def.workRadius, near);

    let best = null, bestD = Infinity;
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.reservedBy) continue;
      let ok = false;
      if (this.def.resource === 'wood') {
        ok = e instanceof TreeEntity && e.harvestable && e.state === TREE_STATE.ALIVE;
      } else {
        ok = e instanceof RockEntity && e.harvestable && e.state === ROCK_STATE.SOLID
          && e.resourceType === this.def.resource;
      }
      if (!ok) continue;
      const d = dist(this.x, this.z, e.x, e.z);
      if (d < bestD) { bestD = d; best = e; }
    }

    if (best) {
      best.reservedBy = this;
      this.target = best;
      this.state = STATE.WALK;
    }
  }

  _walk(dt, game) {
    const t = this.target;
    if (!this._targetStillValid(t)) { this._giveUpTarget(); return; }

    const d = dist(this.x, this.z, t.x, t.z);
    const stopD = (t.radius ?? 0.4) + 0.5;
    if (d < stopD) {
      this.vx = 0; this.vz = 0;
      this.state = STATE.WORK;
      this.workT = 0;
      return;
    }
    const dx = t.x - this.x, dz = t.z - this.z;
    this.vx = damp(this.vx, (dx / d) * this.speed, 7, dt);
    this.vz = damp(this.vz, (dz / d) * this.speed, 7, dt);
    this.yaw = angleTowards(this.yaw, Math.atan2(dx, dz), 8 * dt);
    void game;
  }

  _work(dt, game) {
    const t = this.target;
    if (!this._targetStillValid(t)) { this._giveUpTarget(); return; }

    this.vx = damp(this.vx, 0, 10, dt);
    this.vz = damp(this.vz, 0, 10, dt);
    this.workPhase += dt * 7.5;
    this.bob = Math.abs(Math.sin(this.workPhase)) * 0.07;

    // stessa scintilla del colpo del giocatore, giusto per farsi sentire —
    // niente danno vero: l'abbattimento scatta allo scadere di `workTime`.
    const prev = this.workT;
    this.workT += dt;
    if (Math.floor(prev * 2.3) !== Math.floor(this.workT * 2.3)) {
      const hitY = 0.6;
      game.fx.chips(t.x, hitY, t.z, 4,
        this.def.resource === 'wood' ? 'rgba(196,150,96,1)' : 'rgba(210,214,222,1)', 0.8);
      (this.def.resource === 'wood' ? game.audio.chop : game.audio.mine).call(game.audio);
    }

    if (this.workT >= this.def.workTime) this._harvest(game);
  }

  _harvest(game) {
    const t = this.target;
    t.reservedBy = null;
    if (t instanceof TreeEntity) {
      const dx = fxRand.sym(1) || 0.4, dz = fxRand.sym(1);
      const len = Math.hypot(dx, dz) || 1;
      t.fell(dx / len, dz / len, game, true);
    } else {
      t.shatter(game, true);
    }
    this.carrying = this.def.resource;
    this.target = null;
    this.state = STATE.RETURN;
  }

  _return(dt, game) {
    const d = dist(this.x, this.z, this.homeX, this.homeZ);
    if (d < 0.6) {
      this.vx = 0; this.vz = 0;
      if (this.station.stockFull) {
        // Il magazzino è pieno: aspetta lì, carico in spalla, finché il
        // giocatore non passa a ritirare — non lo butta e non lo vende da
        // solo, così si vede subito che serve una visita.
        this.workPhase += dt * 2;
        this.bob = Math.sin(this.workPhase) * 0.025;
        return;
      }
      this._deposit(game);
      this.state = STATE.SEEK;
      this.seekCooldown = 0.15;
      return;
    }
    const dx = this.homeX - this.x, dz = this.homeZ - this.z;
    this.vx = damp(this.vx, (dx / d) * this.speed, 7, dt);
    this.vz = damp(this.vz, (dz / d) * this.speed, 7, dt);
    this.yaw = angleTowards(this.yaw, Math.atan2(dx, dz), 8 * dt);
  }

  _deposit(game) {
    this.carrying = null;
    this.station.stock = Math.min(this.station.def.stockCap, this.station.stock + 1);
    game.fx.sparks(this.x, 1.1, this.z, 5, 'rgba(255,236,180,1)', 0.55);
    game.audio.plant();
  }

  /** Vero se il bersaglio esiste ancora ed è ancora raccoglibile. */
  _targetStillValid(t) {
    if (!t || t.dead) return false;
    if (t instanceof TreeEntity) return t.harvestable && t.state === TREE_STATE.ALIVE;
    return t.harvestable && t.state === ROCK_STATE.SOLID;
  }

  _giveUpTarget() {
    // Il bersaglio è sparito da sotto (il giocatore l'ha preso, per esempio):
    // niente panico, se ne cerca subito un altro.
    if (this.target && this.target.reservedBy === this) this.target.reservedBy = null;
    this.target = null;
    this.state = STATE.SEEK;
    this.seekCooldown = 0;
  }

  /* ---------------------------------------------------------------- draw */

  draw(r, game) {
    const atlas = game.assets.npc?.[this.variant];
    if (!atlas) return;

    let a = this.yaw % TAU; if (a < 0) a += TAU;
    const di8 = Math.round((a / TAU) * atlas.dirs) % atlas.dirs;
    const sp = this.anim === 'walk'
      ? atlas.walk[di8]?.[Math.floor(this.animT * atlas.frames) % atlas.frames]
      : atlas.idle[di8];
    if (!sp) return;

    const depth = depthOf(0, this.z);
    r.shadow(this.x, this.z, 0.32, 1);
    r.sprite(sp, this.x, this.bob, this.z, { depth });

    // La risorsa che porta indietro: una sprite sola (non una pila), un
    // cenno visivo per farsi capire da lontano mentre torna al cartello.
    if (this.carrying) {
      const A = game.assets;
      const di16 = Math.round((a / TAU) * 16) % 16;
      const byType = {
        wood: A.carriedLogs?.[di16], stone: A.carriedStones?.[di16],
        iron: A.carriedIrons?.[di16], gold: A.carriedGolds?.[di16],
      };
      const sp2 = byType[this.carrying];
      if (sp2) {
        const bx = -Math.sin(this.yaw), bz = -Math.cos(this.yaw);
        r.sprite(sp2, this.x + bx * 0.26, 0.62, this.z + bz * 0.26, {
          depth: depth + 0.01, scale: 0.85,
        });
      }
    }
  }
}
