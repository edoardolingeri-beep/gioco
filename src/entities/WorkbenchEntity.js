/**
 * WorkbenchEntity.js — Il banco dell'artigiano: i potenziamenti.
 *
 * Anche qui niente menù. Ti avvicini: se hai abbastanza monete parte un anello
 * di caricamento (mezzo secondo, così non compri per sbaglio passando di lì) e
 * il potenziamento viene applicato — cambiando davvero il modello 3D del
 * personaggio, che viene ri-cotto in background senza scatti.
 */

import { Entity } from './Entity.js';
import { UPGRADES } from '../data/config.js';
import { drawPanel, drawRing } from '../ui/WorldUI.js';
import { damp, clamp } from '../core/MathUtils.js';

export class WorkbenchEntity extends Entity {
  constructor(x, z, game) {
    super(x, z);
    this.game = game;
    this.static = false;
    this.radius = 1.05;
    this.zone = 2.3;
    this.solid = true;

    this.index = 0;          // prossimo potenziamento
    this.charge = 0;         // 0..1 anello di conferma
    this.panelT = 0.6;
    this.pulse = 0;
    this.playerInside = false;
  }

  get next() { return UPGRADES[this.index] ?? null; }

  update(dt, game) {
    this.pulse = damp(this.pulse, 0, 7, dt);

    const p = game.player;
    const d2 = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
    const inside = d2 < this.zone * this.zone;
    this.panelT = damp(this.panelT, d2 < (this.zone + 6) ** 2 ? 1 : 0, 7, dt);

    if (inside && !this.playerInside) game.bus.emit('zone:enter', this);
    this.playerInside = inside;

    const up = this.next;
    if (!up) { this.charge = 0; return; }

    const affordable = game.stats.coins >= up.cost;
    if (inside && affordable) {
      const prev = this.charge;
      this.charge = clamp(this.charge + dt * 1.9, 0, 1);
      // "tick" sonoro mentre si carica
      if (Math.floor(prev * 8) !== Math.floor(this.charge * 8)) {
        game.audio.pop(Math.floor(this.charge * 8));
        game.haptics.fire('light', 60);
      }
      if (this.charge >= 1) this._buy(game, up);
    } else {
      this.charge = damp(this.charge, 0, 8, dt);
    }
  }

  _buy(game, up) {
    this.charge = 0;
    this.index++;
    this.pulse = 1;
    game.spendCoins(up.cost);
    up.apply(game.stats);

    game.audio.upgrade();
    game.haptics.fire('success', 0);
    game.cam.addShake(0.35);
    game.fx.confetti(this.x, 1.5, this.z, 20);
    game.fx.sparks(game.player.x, 1.2, game.player.z, 22, 'rgba(255,240,190,1)', 1.3);
    game.texts.spawn(up.label, game.player.x, 2.4, game.player.z, {
      color: '#ffe9a8', size: 1.25, life: 1.5,
    });

    game.bus.emit('upgrade:bought', up);
    // il personaggio cambia aspetto: ri-cottura in background
    game.rebakeCharacter();
  }

  draw(r, game) {
    const sp = game.assets.buildings.workbench;
    r.shadow(this.x, this.z, this.radius * 1.1, 1);
    r.sprite(sp, this.x, 0, this.z, {
      depth: this.depth,
      squash: 1 + this.pulse * 0.05,
    });
  }

  drawUI(ctx, cam, dpr, game) {
    if (this.panelT < 0.02) return;
    const up = this.next;
    if (!up) {
      drawPanel(ctx, cam, dpr, this.x, 2.4, this.z, {
        title: 'Tutto potenziato! 🎉',
        appear: this.panelT, width: 160, titleColor: '#9ef7c0',
      });
      return;
    }
    const can = game.stats.coins >= up.cost;
    drawPanel(ctx, cam, dpr, this.x, 2.5 + this.pulse * 0.1, this.z, {
      title: `${up.icon} ${up.label}`,
      value: Math.min(game.stats.coins, up.cost),
      max: up.cost,
      icon: '🪙',
      color: can ? '#6ee7a0' : '#ffce54',
      appear: this.panelT,
      width: 168,
    });
    if (this.charge > 0.01) {
      drawRing(ctx, cam, dpr, this.x, 1.9, this.z, this.charge, '#6ee7a0');
    }
  }
}
