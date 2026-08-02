/**
 * BuildingEntity.js — Cantiere ed edificio.
 *
 * Flusso completo, senza premere nulla:
 *   1. il progetto (fantasma azzurro) mostra "0 / 40 🪵";
 *   2. entri nell'area → i tronchi partono dalla schiena a raffica;
 *   3. la barra si riempie in tempo reale;
 *   4. al 40/40 parte l'animazione: l'edificio emerge dal terreno con un
 *      rimbalzo, polvere, coriandoli, scuotimento della camera e fanfara.
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { RESOURCE_INFO } from '../data/buildings.js';
import { drawPanel, drawRing } from '../ui/WorldUI.js';
import { clamp, damp, easeOutBack, easeOutCubic } from '../core/MathUtils.js';

export const BUILD_STATE = { BLUEPRINT: 0, RISING: 1, DONE: 2 };

export class BuildingEntity extends Entity {
  /**
   * @param {object} def definizione da data/buildings.js
   */
  constructor(x, z, def, game) {
    super(x, z);
    this.def = def;
    this.game = game;
    this.static = false;
    this.radius = def.radius;
    this.zone = def.zone ?? def.radius + 1.1;
    this.solid = false;                 // diventa solido una volta costruito

    this.state = BUILD_STATE.BLUEPRINT;
    /** Risorse già consegnate. */
    this.paid = {};
    for (const k in def.cost) this.paid[k] = 0;

    /** Il cantiere compare solo dopo che il prerequisito è stato completato. */
    this.available = !def.requires;
    /** Se costa monete, va prima "aperto". */
    this.unlocked = !def.unlockCost;
    this.unlockCharge = 0;

    this.playerInside = false;
    this.panelT = 0;          // apparizione del pannello
    this.feedTimer = 0;
    this.riseT = 0;
    this.pulse = 0;           // lampeggio quando riceve materiale
    this.ghostPhase = 0;
  }

  /** Punto d'arrivo delle risorse in volo. */
  get deliverY() { return 1.1; }

  get costTotal() {
    let t = 0; for (const k in this.def.cost) t += this.def.cost[k];
    return t;
  }

  get paidTotal() {
    let t = 0; for (const k in this.paid) t += this.paid[k];
    return t;
  }

  get complete() { return this.paidTotal >= this.costTotal; }

  /** Prima risorsa ancora mancante. */
  missingType() {
    for (const k in this.def.cost) {
      if (this.paid[k] < this.def.cost[k]) return k;
    }
    return null;
  }

  update(dt, game) {
    if (!this.available) return;
    this.ghostPhase += dt;
    this.pulse = damp(this.pulse, 0, 7, dt);

    const p = game.player;
    const d2 = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
    const inside = d2 < this.zone * this.zone;

    if (this.state === BUILD_STATE.BLUEPRINT && !this.unlocked) {
      this.panelT = damp(this.panelT, d2 < (this.zone + 6) ** 2 ? 1 : 0, 7, dt);
      this._updateUnlock(dt, game, inside);
      return;
    }

    if (this.state === BUILD_STATE.BLUEPRINT) {
      // Il pannello compare solo quando sei nei paraggi: da lontano
      // l'inquadratura resta pulita.
      const want = d2 < (this.zone + 6) ** 2 ? 1 : 0;
      this.panelT = damp(this.panelT, want, 7, dt);

      if (inside && !this.playerInside) game.bus.emit('zone:enter', this);
      this.playerInside = inside;

      if (inside) this._feed(dt, game);
    } else if (this.state === BUILD_STATE.RISING) {
      this.panelT = damp(this.panelT, 0, 9, dt);
      const prev = this.riseT;
      this.riseT += dt / 1.15;
      // ondata di polvere mentre sale
      if (Math.floor(prev * 9) !== Math.floor(this.riseT * 9) && this.riseT < 0.85) {
        game.fx.puff(
          this.x, 0.05, this.z, 5,
          'rgba(214,198,168,0.85)', this.radius * 1.5, 0.36,
        );
      }
      if (this.riseT >= 1) this._finish(game);
    }
  }

  /**
   * Apertura del cantiere pagando in monete.
   * Come al banco dell'artigiano serve restare fermi un istante: evita di
   * spendere per sbaglio solo passando di lì.
   */
  _updateUnlock(dt, game, inside) {
    const cost = this.def.unlockCost;
    if (inside && game.stats.coins >= cost) {
      const prev = this.unlockCharge;
      this.unlockCharge = clamp(this.unlockCharge + dt * 1.9, 0, 1);
      if (Math.floor(prev * 8) !== Math.floor(this.unlockCharge * 8)) {
        game.audio.pop(Math.floor(this.unlockCharge * 8));
        game.haptics.fire('light', 60);
      }
      if (this.unlockCharge >= 1) this._unlock(game);
    } else {
      this.unlockCharge = damp(this.unlockCharge, 0, 8, dt);
    }
  }

  _unlock(game) {
    this.unlocked = true;
    this.unlockCharge = 0;
    game.spendCoins(this.def.unlockCost);
    game.audio.upgrade();
    game.haptics.fire('success', 0);
    game.cam.addShake(0.25);
    game.fx.sparks(this.x, 1.2, this.z, 18, 'rgba(140,220,255,1)', 1.1);
    game.texts.spawn(`${this.def.name} sbloccata!`, this.x, 2.8, this.z, {
      color: '#9ed8ff', size: 1.15, life: 1.5,
    });
    game.bus.emit('building:unlocked', this);
  }

  /** Consegna automatica delle risorse trasportate. */
  _feed(dt, game) {
    if (this.complete) return;
    this.feedTimer -= dt;
    if (this.feedTimer > 0) return;

    const type = this.missingType();
    if (!type) return;
    if (game.carry.count(type) <= 0) return;

    this.feedTimer = CFG.deliver.interval;
    game.carry.removeOne(type);

    const idx = this.paidTotal;
    game.delivery.send(
      type,
      game.player.x, game.player.carryTopY(), game.player.z,
      this,
      () => this._receive(type, game, idx),
      idx,
    );
  }

  _receive(type, game, idx) {
    this.paid[type] = Math.min(this.def.cost[type], this.paid[type] + 1);
    this.pulse = 1;
    game.audio.deposit(idx % 16);
    game.haptics.fire('light', 22);
    game.fx.sparks(this.x, this.deliverY, this.z, 3, 'rgba(255,236,180,1)', 0.5);
    game.bus.emit('building:progress', this);

    if (this.complete && this.state === BUILD_STATE.BLUEPRINT) this._startRising(game);
  }

  _startRising(game) {
    this.state = BUILD_STATE.RISING;
    this.riseT = 0;
    game.audio.build();
    game.haptics.fire('medium', 0);
    game.cam.addShake(0.3);
    game.fx.puff(this.x, 0.05, this.z, 18, 'rgba(214,198,168,0.9)', this.radius * 2, 0.5);
    game.bus.emit('building:started', this);
  }

  _finish(game) {
    this.state = BUILD_STATE.DONE;
    this.solid = true;
    this.radius = this.def.radius;
    game.cam.addShake(0.55);
    game.haptics.fire('success', 0);
    game.fx.confetti(this.x, 1.4, this.z, 26);
    game.fx.puff(this.x, 0.05, this.z, 14, 'rgba(230,216,190,0.9)', this.radius * 2.2, 0.45);
    game.audio.upgrade();
    game.texts.spawn(this.def.name, this.x, 2.6, this.z, { color: '#ffe9a8', size: 1.3, life: 1.6 });
    this.def.effect?.(game.stats);
    this.def.onComplete?.(game);
    game.bus.emit('building:done', this);
  }

  draw(r, game) {
    if (!this.available) return;
    const A = game.assets;
    const sp = A.buildings[this.def.sprite];
    if (!sp) return;

    if (this.state === BUILD_STATE.BLUEPRINT) {
      const ghost = A.buildings[this.def.sprite + 'Ghost'] ?? sp;
      const ratio = this.unlocked ? this.paidTotal / this.costTotal : 0;
      // il fantasma "respira" e si riempie dal basso
      const breathe = 0.86 + Math.sin(this.ghostPhase * 2.2) * 0.06;
      r.shadow(this.x, this.z, this.radius * 0.95, 0.5);
      r.sprite(ghost, this.x, 0, this.z, {
        alpha: breathe * (0.42 - ratio * 0.16),
        depth: this.depth,
      });
      // porzione già "pagata": l'edificio vero affiora dal basso
      if (ratio > 0.001) {
        r.sprite(sp, this.x, 0, this.z, {
          clipTop: 1 - ratio,
          alpha: 0.96,
          depth: this.depth + 0.002,
          squash: 1 + this.pulse * 0.03,
        });
      }
      return;
    }

    if (this.state === BUILD_STATE.RISING) {
      const t = clamp(this.riseT, 0, 1);
      // emerge dal terreno (clip) e poi rimbalza (squash)
      const reveal = easeOutCubic(Math.min(1, t / 0.72));
      const bounceT = clamp((t - 0.6) / 0.4, 0, 1);
      const squash = 1 + (1 - easeOutBack(bounceT)) * 0.0 + Math.sin(bounceT * Math.PI) * 0.08;
      r.shadow(this.x, this.z, this.radius * reveal, reveal);
      r.sprite(sp, this.x, 0, this.z, {
        clipTop: 1 - reveal,
        squash,
        depth: this.depth,
      });
      return;
    }

    r.shadow(this.x, this.z, this.radius, 1);
    r.sprite(sp, this.x, 0, this.z, { depth: this.depth });
  }

  /** Interfaccia (pannello) disegnata dopo il mondo. */
  drawUI(ctx, cam, dpr, game) {
    if (!this.available) return;
    if (this.state !== BUILD_STATE.BLUEPRINT || this.panelT < 0.02) return;

    // Cantiere ancora da aprire: mostra il prezzo in monete.
    if (!this.unlocked) {
      const cost = this.def.unlockCost;
      const can = game.stats.coins >= cost;
      drawPanel(ctx, cam, dpr, this.x, 2.7, this.z, {
        title: `🔒 ${this.def.name}`,
        value: Math.min(game.stats.coins, cost),
        max: cost,
        icon: '🪙',
        color: can ? '#6ee7a0' : '#ffce54',
        appear: this.panelT,
        width: 152,
      });
      if (this.unlockCharge > 0.01) {
        drawRing(ctx, cam, dpr, this.x, 1.9, this.z, this.unlockCharge, '#6ee7a0');
      }
      return;
    }

    const type = this.missingType() ?? 'wood';
    const info = RESOURCE_INFO[type];
    drawPanel(ctx, cam, dpr, this.x, 2.7 + this.pulse * 0.12, this.z, {
      title: this.def.name,
      value: this.paid[type],
      max: this.def.cost[type],
      icon: info.icon,
      color: info.color,
      appear: this.panelT,
      width: 138,
    });
    void game;
  }
}
