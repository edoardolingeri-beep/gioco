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
import { RockEntity, ROCK_STATE } from './RockEntity.js';
import { WolfEntity } from './WolfEntity.js';
import { BearEntity } from './BearEntity.js';
import { depthOf } from '../render/Projection.js';
import { drawPanel } from '../ui/WorldUI.js';
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
    /** Fa aprire i cancelli automatici della staccionata quando è vicino. */
    this.opensGates = true;

    /* --- salute e combattimento (Fase 2) --- */
    this.maxHp = CFG.player.maxHp;
    this.hp = this.maxHp;
    this.alive = true;
    this.invuln = 0;
    this.sinceDamage = 99;
    this.hurtFlash = 0;
    this.attackTimer = 0;
    this.enemyTarget = null;
    this.reviveT = 0;

    /* --- fumetto "zaino pieno" --- */
    this.blockedByFull = false;
    this.bagFullHintT = 0;
    this._wasBlockedByFull = false;
  }

  /* ------------------------------------------------------------- salute */

  /** Subisce danno da un nemico. */
  takeDamage(n, fromX, fromZ, game) {
    if (!this.alive || this.invuln > 0) return;
    this.hp -= n;
    this.invuln = CFG.player.invulnTime;
    this.sinceDamage = 0;
    this.hurtFlash = 1;

    // contraccolpo: si sente il colpo
    const dx = this.x - fromX, dz = this.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.vx += (dx / d) * 6;
    this.vz += (dz / d) * 6;

    game.audio.playerHurt();
    game.haptics.fire('heavy', 0);
    game.cam.addShake(0.45);
    game.fx.chips(this.x, 1.0, this.z, 6, 'rgba(230,90,80,1)', 1);
    game.texts.spawn(`-${n}`, this.x, 1.7, this.z, { color: '#ff7a6b', size: 1, life: 0.8 });
    game.bus.emit('player:hurt', this.hp);

    if (this.hp <= 0) this._faint(game);
  }

  /** Svenimento: nessun game over, si perde metà del carico. */
  _faint(game) {
    this.hp = 0;
    this.alive = false;
    this.reviveT = 0;
    const lost = Math.floor(game.carry.total / 2);
    for (let i = 0; i < lost; i++) {
      const t = game.carry.topType();
      if (t) game.carry.removeOne(t);
    }
    game.audio.faint();
    game.haptics.fire('heavy', 0);
    game.cam.addShake(0.7);
    game.fx.puff(this.x, 0.2, this.z, 14, 'rgba(220,220,230,0.9)', 1.2, 0.4);
    game.bus.emit('player:faint', lost);
  }

  /** Ritorno al falò dopo lo svenimento. */
  _revive(game) {
    this.alive = true;
    this.hp = this.maxHp;
    this.invuln = 2.5;
    this.sinceDamage = 0;
    this.x = 0; this.z = 2;
    this.vx = this.vz = 0;
    game.grid.update(this);
    game.cam.snapTo(this.x, this.z);
    game.fx.sparks(this.x, 1, this.z, 20, 'rgba(160,255,190,1)', 1.1);
    game.audio.revive();
    game.bus.emit('player:revived');
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

    this.invuln = Math.max(0, this.invuln - dt);
    this.sinceDamage += dt;
    this.hurtFlash = damp(this.hurtFlash, 0, 5, dt);

    // Svenuto: breve pausa e poi risveglio al falò.
    if (!this.alive) {
      this.vx = damp(this.vx, 0, 8, dt);
      this.vz = damp(this.vz, 0, 8, dt);
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      this.reviveT += dt;
      if (this.reviveT > 1.6) this._revive(game);
      return;
    }

    // Rigenerazione: riparte solo dopo un po' che non prendi colpi.
    if (this.hp < this.maxHp && this.sinceDamage > P.regenDelay) {
      this.hp = Math.min(this.maxHp, this.hp + P.regenRate * (game.stats.regenMul ?? 1) * dt);
    }

    const maxSpeed = P.speed * (game.stats.speedMul ?? 1)
      // con lo zaino pieno si è leggermente più lenti: dà peso all'azione
      * (1 - 0.16 * game.carry.fillRatio);

    /* --- movimento --- */
    const ix = input.x, iz = input.z;
    const mag = input.mag;
    const acting = this.anim === 'chop' || this.anim === 'mine' || this.anim === 'attack';
    const canMove = !acting || mag > 0.05;

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

    /* --- azioni automatiche: combattere, tagliare, scavare --- */
    this._updateAction(dt, game);

    // Il fumetto "zaino pieno" si accende solo sul fronte di salita (il
    // momento in cui il blocco comincia), non a ogni frame in cui resta
    // bloccato: un "denied" continuo infastidirebbe più di quanto informi.
    if (this.blockedByFull && !this._wasBlockedByFull) {
      game.audio.denied();
      game.haptics.fire('light', 40);
    }
    this._wasBlockedByFull = this.blockedByFull;
    this.bagFullHintT = damp(this.bagFullHintT, this.blockedByFull ? 1 : 0, 7, dt);

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
    // il fiume è invalicabile finché non c'è il ponte
    if (game.world.blockRiver(this)) { this.vz *= 0.2; }

    // limiti della mappa
    const R = CFG.world.radius;
    const dl = Math.hypot(this.x, this.z);
    if (dl > R) {
      this.x = (this.x / dl) * R;
      this.z = (this.z / dl) * R;
    }
  }

  /**
   * Azioni automatiche, in ordine di priorità:
   *   1. c'è un nemico a tiro?  → attacchi
   *   2. c'è una risorsa vicina? → la raccogli (ascia o piccone)
   *
   * Non serve premere nulla: ci si avvicina e il personaggio fa la cosa
   * giusta. È la regola d'oro di tutto il gioco.
   */
  _updateAction(dt, game) {
    const range = CFG.player.actionRange;
    const near = game.scratch.near;
    game.grid.queryRadius(this.x, this.z, range + 1.6, near);

    /* --- 1. combattimento --- */
    let enemy = null, enemyD = Infinity;
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (!(e instanceof WolfEntity || e instanceof BearEntity) || !e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.z - this.z);
      if (d <= CFG.player.attackRange + e.radius && d < enemyD) { enemyD = d; enemy = e; }
    }
    this.enemyTarget = enemy;

    if (enemy) {
      this.target = null;
      this.yaw = angleTowards(this.yaw, Math.atan2(enemy.x - this.x, enemy.z - this.z), 11 * dt);
      this.anim = 'attack';

      this.attackTimer -= dt;
      const interval = CFG.player.attackInterval;
      const prev = this.chopT;
      this.chopT = clamp(1 - this.attackTimer / interval, 0, 1);
      if (prev < 0.6 && this.chopT >= 0.6) {
        enemy.takeDamage(Math.round(game.stats.attackDamage), this.x, this.z, game);
        game.audio.swing();
        game.cam.addShake(0.16);
      }
      if (this.attackTimer <= 0) { this.attackTimer = interval; this.chopT = 0; }
      return;
    }
    this.attackTimer = 0;

    /* --- 2. raccolta risorse --- */
    // Si raccoglie da fermi (o spingendo contro la risorsa, dato che è solida).
    const stationary = this.speed < 1.2;
    let best = null, bestScore = Infinity;
    // Vero se c'è una risorsa raccoglibile a tiro ma lo zaino è pieno: è la
    // condizione in cui il personaggio si ferma senza fare nulla, e merita
    // una spiegazione — non solo silenzio.
    let blockedByFull = false;

    if (stationary) {
      for (let i = 0; i < near.length; i++) {
        const e = near[i];
        let ok = false;
        if (e instanceof TreeEntity) {
          ok = e.harvestable && e.state === TREE_STATE.ALIVE;
        } else if (e instanceof RockEntity) {
          // massi e vene richiedono il piccone giusto: senza, resta solo il
          // suggerimento sopra la roccia
          ok = e.harvestable && e.state === ROCK_STATE.SOLID && e.canMine(game.stats);
        }
        if (!ok) continue;

        const dx = e.x - this.x, dz = e.z - this.z;
        const d = Math.hypot(dx, dz) - e.radius;
        if (d > range) continue;

        if (game.carry.isFull) { blockedByFull = true; continue; }

        // a parità di distanza si preferisce ciò che si ha davanti
        const ang = Math.abs(angleDelta(this.yaw, Math.atan2(dx, dz)));
        const score = d + ang * 0.35;
        if (score < bestScore) { bestScore = score; best = e; }
      }
    }

    this.blockedByFull = blockedByFull;
    this.target = best;

    if (best) {
      const isRock = best instanceof RockEntity;
      this.yaw = angleTowards(this.yaw, Math.atan2(best.x - this.x, best.z - this.z), 9 * dt);
      this.anim = isRock ? 'mine' : 'chop';

      const speedMul = isRock ? (game.stats.mineSpeed ?? 1) : (game.stats.chopSpeed ?? 1);
      const interval = CFG.harvest.chopInterval / speedMul;

      this.chopTimer -= dt;
      if (this.chopTimer <= 0) { this.chopTimer = interval; this.chopT = 0; }

      const prev = this.chopT;
      this.chopT = clamp(1 - this.chopTimer / interval, 0, 1);
      if (prev < 0.62 && this.chopT >= 0.62) {
        const dmg = isRock ? game.stats.pickDamage : game.stats.axeDamage;
        best.hit(dmg ?? 1, this.x, this.z, game);
      }
    } else if (this.anim === 'chop' || this.anim === 'mine' || this.anim === 'attack') {
      this.anim = 'idle';
    }
  }

  _updateAnim(dt, game) {
    // le azioni impostano già `anim` in _updateAction
    if (this.target || this.enemyTarget) return;
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
    if (this.anim === 'chop' || this.anim === 'attack') {
      const f = clamp(Math.floor(this.chopT * CHAR.chopFrames), 0, CHAR.chopFrames - 1);
      sp = atlas.chop[di]?.[f];
    } else if (this.anim === 'mine') {
      const f = clamp(Math.floor(this.chopT * CHAR.chopFrames), 0, CHAR.chopFrames - 1);
      sp = atlas.mine?.[di]?.[f] ?? atlas.chop[di]?.[f];
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

    // Dopo un colpo il personaggio lampeggia: comunica l'invulnerabilità
    // temporanea senza bisogno di icone.
    const blink = Math.sin(game.time * 34) > 0 ? 0.45 : 1;

    r.sprite(sp, this.x, breath, this.z, {
      depth,
      alpha: this.invuln > 0 ? blink : 1,
      squash: this.squash * (1 - this.hurtFlash * 0.08),
      rot: this.alive ? 0 : clamp(this.reviveT * 1.1, 0, 1.3),
    });

    this._drawStack(r, game, depth);
  }

  /**
   * Fumetto "zaino pieno": spiega perché il personaggio si è fermato senza
   * fare nulla davanti a un albero o un masso. Stesso linguaggio visivo del
   * suggerimento "serve il piccone" sopra le rocce, ma legato al giocatore
   * (lo zaino è pieno indipendentemente da QUALE risorsa sta guardando).
   */
  drawUI(ctx, cam, dpr, game) {
    void game;
    if (this.bagFullHintT < 0.02) return;
    drawPanel(ctx, cam, dpr, this.x, CFG.player.height + 0.3, this.z, {
      title: 'Zaino pieno 🎒',
      appear: this.bagFullHintT,
      width: 150,
      titleColor: '#ffce54',
    });
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
    const byType = {
      wood: A.carriedLogs ? A.carriedLogs[di] : A.carriedLog,
      stone: A.carriedStones ? A.carriedStones[di] : A.carriedLog,
      iron: A.carriedIrons ? A.carriedIrons[di] : A.carriedLog,
      gold: A.carriedGolds ? A.carriedGolds[di] : A.carriedLog,
      fish: A.carriedFishes ? A.carriedFishes[di] : A.carriedLog,
    };

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

      const sp = byType[s.type] ?? byType.wood;
      r.sprite(sp, this.x + ox, C.stackOrigin.y + h + appOff + bump, this.z + oz, {
        // ogni tronco è leggermente più avanti nella pila per un ordine stabile
        depth: baseDepth + (bz < 0 ? -0.02 : 0.02) + i * 0.0006,
        rot: s.jr * 0.35,
        scale: 0.94 + Math.sin(i * 1.7) * 0.03,
      });
    }
  }
}
