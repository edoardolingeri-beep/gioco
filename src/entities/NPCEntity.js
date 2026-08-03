/**
 * NPCEntity.js — Gli abitanti del villaggio (Fase 2).
 *
 * Un villaggio è vivo quando ci si vede gente che ha qualcosa da fare.
 * Ogni abitante segue una piccola routine con obiettivi reali sulla mappa:
 *
 *   VAI ──▶ LAVORA (all'edificio di destinazione)
 *    │       SIEDI (panchina)
 *    │       CHIACCHIERA (se incontra un altro abitante)
 *    └──▶ RIPOSA e riparte
 *
 * Le mete non sono casuali: sono i "punti di interesse" registrati dal
 * VillageSystem, quindi man mano che il villaggio cresce gli abitanti hanno
 * più cose da fare e la piazza si anima da sola.
 */

import { Entity } from './Entity.js';
import { CHAR } from '../models/character.js';
import { CFG } from '../data/config.js';
import { depthOf, projectY } from '../render/Projection.js';
import { fxRand } from '../core/Rand.js';
import { clamp, damp, angleTowards, TAU, dist } from '../core/MathUtils.js';

const ACT = { GO: 0, WORK: 1, SIT: 2, CHAT: 3, IDLE: 4 };

/** Frasi brevi che compaiono sopra la testa quando due abitanti si incontrano. */
const CHATTER = ['Ciao!', 'Bel legno…', 'Che caldo', 'Buongiorno', '♪', 'Ah sì?', 'Eh già'];
const WORK_MARKS = ['🪓', '🔨', '🪵', '⛏️'];

export class NPCEntity extends Entity {
  /**
   * @param {number} variant indice dell'atlante (vestiario)
   */
  constructor(x, z, variant, game) {
    super(x, z);
    this.game = game;
    this.static = false;
    this.radius = 0.3;
    this.solid = false;

    this.variant = variant;
    this.speed = CFG.npc.speed * fxRand.range(0.85, 1.15);
    this.vx = 0; this.vz = 0;
    this.yaw = fxRand.range(0, TAU);

    this.act = ACT.IDLE;
    this.actTimer = fxRand.range(0, 2);
    this.animT = fxRand.next();
    this.target = null;
    this.bubble = '';
    this.bubbleT = 0;
    this.chatCooldown = fxRand.range(4, 12);
    this.workPhase = fxRand.range(0, TAU);
    this.bob = 0;
    /** I carrettieri trascinano un carro: si vedono attraversare il paese. */
    this.hauling = false;
    /** Fa aprire i cancelli automatici della staccionata quando è vicino. */
    this.opensGates = true;
  }

  /* -------------------------------------------------------------- update */

  update(dt, game) {
    this.actTimer -= dt;
    this.chatCooldown -= dt;
    this.bubbleT = Math.max(0, this.bubbleT - dt);

    // LOD di simulazione: con la città cresciuta gli abitanti sono decine.
    // Quelli lontani continuano a muoversi verso le loro mete, ma saltano i
    // controlli costosi (evitamento e chiacchiere), che nessuno vedrebbe.
    const far = dist(this.x, this.z, game.player.x, game.player.z) > 26;

    switch (this.act) {
      case ACT.GO: this._go(dt, game); break;
      case ACT.WORK: this._work(dt, game); break;
      case ACT.SIT: this._sit(dt); break;
      case ACT.CHAT: this._chat(dt); break;
      default: this._idle(dt); break;
    }

    if (this.actTimer <= 0 && this.act !== ACT.GO) this._pickActivity(game);

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    if (!far) this._avoid(game);
    game.grid.update(this);

    const spd = Math.hypot(this.vx, this.vz);
    if (spd > 0.25) {
      this.anim = 'walk';
      this.animT = (this.animT + (spd / CFG.npc.speed) * dt * 1.5) % 1;
    } else {
      this.anim = 'idle';
      this.animT = (this.animT + dt * 0.4) % 1;
    }
  }

  /** Sceglie la prossima attività fra i punti di interesse del villaggio. */
  _pickActivity(game) {
    const poi = game.village.pointsOfInterest;
    if (!poi.length) { this._idle(0); this.actTimer = 2; return; }

    const spot = poi[(Math.random() * poi.length) | 0];
    this.target = spot;
    this.act = ACT.GO;
    this.actTimer = 22;   // sicurezza: non restare bloccato per sempre
  }

  _go(dt, game) {
    const t = this.target;
    if (!t) { this.act = ACT.IDLE; this.actTimer = 1; return; }

    // Se sono fuori dal recinto e la meta è dentro, il primo passo è
    // raggiungere il cancello più vicino, non il centro del villaggio: un
    // tratto chiuso si apre solo per chi gli sta vicino, non per chi punta
    // dritto altrove, quindi puntare al centro voleva dire restare a
    // correre contro il muro per sempre.
    let aimX = t.x, aimZ = t.z, arriving = true;
    const v = game.village;
    const H = v.fenceHalfExtent;
    if (H > 0 && v.gateCenters.length
        && (Math.abs(this.x) > H || Math.abs(this.z) > H)
        && Math.abs(t.x) <= H && Math.abs(t.z) <= H) {
      let best = v.gateCenters[0], bestD = Infinity;
      for (const gc of v.gateCenters) {
        const gd = dist(this.x, this.z, gc.x, gc.z);
        if (gd < bestD) { bestD = gd; best = gc; }
      }
      aimX = best.x; aimZ = best.z; arriving = false;
    }

    const d = dist(this.x, this.z, aimX, aimZ);
    if (arriving && (d < (t.stopDist ?? 1.1) || this.actTimer <= 0)) {
      // arrivato: fa ciò per cui quel punto esiste
      this.act = t.kind === 'sit' ? ACT.SIT : t.kind === 'work' ? ACT.WORK : ACT.IDLE;
      this.actTimer = fxRand.range(4, 9);
      this.vx = this.vz = 0;
      if (this.act === ACT.WORK && Math.random() < 0.4) {
        this.bubble = WORK_MARKS[(Math.random() * WORK_MARKS.length) | 0];
        this.bubbleT = 2.5;
      }
      if (t.yaw != null) this.yaw = t.yaw;
      return;
    }
    if (!arriving && this.actTimer <= 0) {
      // scaduto il tempo di sicurezza mentre si cercava un varco: meglio
      // fermarsi dov'è che restare bloccato per sempre.
      this.act = ACT.IDLE;
      this.actTimer = 1;
      this.vx = this.vz = 0;
      return;
    }

    const dx = aimX - this.x, dz = aimZ - this.z;
    this.vx = damp(this.vx, (dx / d) * this.speed, 7, dt);
    this.vz = damp(this.vz, (dz / d) * this.speed, 7, dt);
    this.yaw = angleTowards(this.yaw, Math.atan2(dx, dz), 7 * dt);

    // due abitanti che si incontrano si fermano a chiacchierare
    if (this.chatCooldown <= 0
        && dist(this.x, this.z, game.player.x, game.player.z) < 14) {
      this._maybeChat(game);
    }
  }

  _work(dt) {
    this.vx = damp(this.vx, 0, 9, dt);
    this.vz = damp(this.vz, 0, 9, dt);
    this.workPhase += dt * 7;
    // piccolo movimento ritmico: sembra che stia davvero facendo qualcosa
    this.bob = Math.abs(Math.sin(this.workPhase)) * 0.07;
  }

  _sit(dt) {
    this.vx = damp(this.vx, 0, 12, dt);
    this.vz = damp(this.vz, 0, 12, dt);
    this.bob = -0.26;      // si abbassa: è seduto
  }

  _chat(dt) {
    this.vx = damp(this.vx, 0, 12, dt);
    this.vz = damp(this.vz, 0, 12, dt);
    this.bob = Math.sin(this.workPhase + performance.now() * 0.004) * 0.012;
  }

  _idle(dt) {
    this.vx = damp(this.vx, 0, 8, dt);
    this.vz = damp(this.vz, 0, 8, dt);
    this.bob = 0;
  }

  /** Cerca un altro abitante vicino con cui scambiare due parole. */
  _maybeChat(game) {
    const near = game.scratch.near;
    game.grid.queryRadius(this.x, this.z, 1.5, near);
    for (let i = 0; i < near.length; i++) {
      const o = near[i];
      if (o === this || !(o instanceof NPCEntity)) continue;
      if (o.act === ACT.CHAT) continue;
      // si girano l'uno verso l'altro
      this.yaw = Math.atan2(o.x - this.x, o.z - this.z);
      o.yaw = Math.atan2(this.x - o.x, this.z - o.z);
      this.act = o.act = ACT.CHAT;
      this.actTimer = o.actTimer = fxRand.range(2.5, 4.5);
      this.chatCooldown = o.chatCooldown = fxRand.range(26, 50);
      this.say(CHATTER[(Math.random() * CHATTER.length) | 0]);
      o.say(CHATTER[(Math.random() * CHATTER.length) | 0], 1.2);
      return;
    }
    this.chatCooldown = fxRand.range(6, 14);
  }

  say(text, delay = 0) {
    this.bubble = text;
    this.bubbleT = 2.6 + delay;
  }

  /** Evita di compenetrare oggetti solidi e altri abitanti. */
  _avoid(game) {
    const near = game.scratch.near;
    game.grid.queryRadius(this.x, this.z, 1.6, near);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e === this) continue;
      const isNpc = e instanceof NPCEntity;
      if (!e.solid && !isNpc) continue;
      const rr = this.radius + (isNpc ? e.radius : e.radius);
      const dx = this.x - e.x, dz = this.z - e.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      const push = (rr - d) * (isNpc ? 0.5 : 1);
      this.x += (dx / d) * push;
      this.z += (dz / d) * push;
    }
  }

  /* ---------------------------------------------------------------- draw */

  _dirIndex(dirs) {
    let a = this.yaw % TAU;
    if (a < 0) a += TAU;
    return Math.round((a / TAU) * dirs) % dirs;
  }

  draw(r, game) {
    const atlas = game.assets.npc?.[this.variant];
    if (!atlas) return;
    const dirs = atlas.dirs;
    const di = this._dirIndex(dirs);

    const sp = this.anim === 'walk'
      ? atlas.walk[di]?.[Math.floor(this.animT * atlas.frames) % atlas.frames]
      : atlas.idle[di];
    if (!sp) return;

    const depth = depthOf(0, this.z);
    r.shadow(this.x, this.z, 0.34, this.act === ACT.SIT ? 0.7 : 1);
    r.sprite(sp, this.x, this.bob, this.z, { depth });

    // Il carro viene trainato dietro: sta sempre nella direzione opposta a
    // quella di marcia, quindi basta un offset lungo -forward.
    if (this.hauling) {
      const cart = game.assets.village.wagon;
      if (cart) {
        const bx = -Math.sin(this.yaw), bz = -Math.cos(this.yaw);
        const cx = this.x + bx * 1.25, cz = this.z + bz * 1.25;
        r.shadow(cx, cz, 0.75, 0.9);
        r.sprite(cart, cx, 0, cz, { depth: depthOf(0, cz) });
      }
    }
    void CHAR;
  }

  /**
   * Fumetto con la battuta.
   *
   * In una piazza da quaranta abitanti i fumetti si moltiplicano fino a
   * coprire il gioco: ne mostriamo pochi alla volta, dando la precedenza a
   * chi è vicino al giocatore. Il budget è azzerato ad ogni frame dal Game.
   */
  drawUI(ctx, cam, dpr, game) {
    if (this.bubbleT <= 0 || !this.bubble) return;
    if (game.bubbleBudget <= 0) return;
    if (dist(this.x, this.z, game.player.x, game.player.z) > 11) return;
    game.bubbleBudget--;
    const alpha = clamp(this.bubbleT / 0.5, 0, 1);
    const sx = this.x * cam.ppu - cam.sx;
    const sy = projectY(1.85 + this.bob, this.z) * cam.ppu - cam.sy;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${12 * dpr}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(this.bubble).width + 16 * dpr;
    const h = 22 * dpr;

    ctx.fillStyle = 'rgba(255,255,255,0.93)';
    ctx.beginPath();
    const rr = h / 2;
    ctx.moveTo(sx - w / 2 + rr, sy - h / 2);
    ctx.arcTo(sx + w / 2, sy - h / 2, sx + w / 2, sy + h / 2, rr);
    ctx.arcTo(sx + w / 2, sy + h / 2, sx - w / 2, sy + h / 2, rr);
    ctx.arcTo(sx - w / 2, sy + h / 2, sx - w / 2, sy - h / 2, rr);
    ctx.arcTo(sx - w / 2, sy - h / 2, sx + w / 2, sy - h / 2, rr);
    ctx.closePath();
    ctx.fill();
    // codina del fumetto
    ctx.beginPath();
    ctx.moveTo(sx - 4 * dpr, sy + h / 2 - 1);
    ctx.lineTo(sx + 4 * dpr, sy + h / 2 - 1);
    ctx.lineTo(sx, sy + h / 2 + 6 * dpr);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a2438';
    ctx.fillText(this.bubble, sx, sy);
    ctx.restore();
    void game;
  }
}
