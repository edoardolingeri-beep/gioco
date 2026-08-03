/**
 * HireStationEntity.js — Il cartello per assumere un operaio.
 *
 * Stessa filosofia del banco dell'artigiano: ti avvicini, se hai le monete
 * resti fermo un istante e l'operaio compare. Si può assumerne più di uno
 * (fino al massimo previsto): ogni nuovo operaio costa di più del
 * precedente, così l'automazione resta una scelta e non un unico click che
 * risolve tutto.
 */

import { Entity } from './Entity.js';
import { drawPanel, drawRing } from '../ui/WorldUI.js';
import { clamp, damp } from '../core/MathUtils.js';

export class HireStationEntity extends Entity {
  /**
   * @param {number} x @param {number} z posizione del cartello
   * @param {object} def voce di data/workers.js
   * @param {import('../systems/WorkerSystem.js').WorkerSystem} workers
   */
  constructor(x, z, def, workers) {
    super(x, z);
    this.def = def;
    this.workers = workers;
    this.static = false;
    this.radius = 0.3;
    this.zone = 2.3;
    this.solid = false;

    this.charge = 0;
    this.panelT = 0;
    this.pulse = 0;
    this.playerInside = false;
  }

  get count() { return this.workers.counts[this.def.id] ?? 0; }
  get maxed() { return this.count >= this.def.maxWorkers; }
  get cost() { return Math.round(this.def.hireCost * (this.def.costGrowth ** this.count)); }

  update(dt, game) {
    this.pulse = damp(this.pulse, 0, 7, dt);

    const p = game.player;
    const d2 = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
    const inside = d2 < this.zone * this.zone;
    this.panelT = damp(this.panelT, d2 < (this.zone + 5.5) ** 2 ? 1 : 0, 7, dt);

    if (inside && !this.playerInside) game.bus.emit('zone:enter', this);
    this.playerInside = inside;

    if (this.maxed) { this.charge = 0; return; }

    const affordable = game.stats.coins >= this.cost;
    if (inside && affordable) {
      const prev = this.charge;
      this.charge = clamp(this.charge + dt * 1.5, 0, 1);
      if (Math.floor(prev * 8) !== Math.floor(this.charge * 8)) {
        game.audio.pop(Math.floor(this.charge * 8));
        game.haptics.fire('light', 60);
      }
      if (this.charge >= 1) this._hire(game);
    } else {
      this.charge = damp(this.charge, 0, 8, dt);
    }
  }

  _hire(game) {
    this.charge = 0;
    this.pulse = 1;
    game.spendCoins(this.cost);
    this.workers.hire(this.def.id, this);

    game.audio.upgrade();
    game.haptics.fire('success', 0);
    game.cam.addShake(0.22);
    game.fx.confetti(this.x, 1.3, this.z, 16);
    game.fx.sparks(this.x, 1, this.z, 14, 'rgba(140,220,255,1)', 1);
    game.texts.spawn(`${this.def.icon} ${this.def.name}`, this.x, 2, this.z, {
      color: '#ffe9a8', size: 1.1, life: 1.4,
    });
    game.hud.toast(`${this.def.name} assunto! Ora lavora per te ${this.def.icon}`);
    game.bus.emit('worker:hired', this);
  }

  draw(r, game) {
    const sp = game.assets.buildings.signpost;
    if (!sp) return;
    r.shadow(this.x, this.z, 0.42, 1);
    r.sprite(sp, this.x, 0, this.z, {
      depth: this.depth,
      squash: 1 + this.pulse * 0.06,
    });
    void game;
  }

  drawUI(ctx, cam, dpr, game) {
    if (this.panelT < 0.02) return;

    if (this.maxed) {
      drawPanel(ctx, cam, dpr, this.x, 1.85, this.z, {
        title: `${this.def.icon} ${this.def.name} al lavoro (${this.count}/${this.def.maxWorkers})`,
        appear: this.panelT,
        width: 210,
        titleColor: '#9ef7c0',
      });
      return;
    }

    const can = game.stats.coins >= this.cost;
    const verb = this.count === 0 ? 'Assumi' : 'Assumine un altro';
    drawPanel(ctx, cam, dpr, this.x, 1.85 + this.pulse * 0.1, this.z, {
      title: `${verb}: ${this.def.name} ${this.def.icon}`,
      value: Math.min(game.stats.coins, this.cost),
      max: this.cost,
      icon: '🪙',
      color: can ? '#6ee7a0' : '#ffce54',
      appear: this.panelT,
      width: 210,
    });
    if (this.charge > 0.01) {
      drawRing(ctx, cam, dpr, this.x, 1.3, this.z, this.charge, '#6ee7a0');
    }
  }
}
