/**
 * MerchantEntity.js — Il mercante.
 *
 * Entri nella sua area → le risorse partono automaticamente verso il banco e
 * tornano indietro sotto forma di monete che volano verso di te. Nessun menù,
 * nessuna conferma: solo il ritmo del "vendi-incassa".
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { RESOURCE_INFO } from '../data/buildings.js';
import { drawPanel } from '../ui/WorldUI.js';
import { damp } from '../core/MathUtils.js';

export class MerchantEntity extends Entity {
  constructor(x, z, game) {
    super(x, z);
    this.game = game;
    this.static = false;
    this.radius = 1.35;
    this.zone = 2.7;
    this.solid = true;

    this.feedTimer = 0;
    this.panelT = 0.6;
    this.sellStreak = 0;
    this.streakTimer = 0;
    this.pulse = 0;
    this.playerInside = false;
    this.totalEarned = 0;
  }

  get deliverY() { return 1.15; }

  update(dt, game) {
    this.pulse = damp(this.pulse, 0, 7, dt);
    this.streakTimer -= dt;
    if (this.streakTimer <= 0) this.sellStreak = 0;

    const p = game.player;
    const d2 = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
    const inside = d2 < this.zone * this.zone;
    const near = d2 < (this.zone + 3) ** 2;
    this.panelT = damp(this.panelT, near ? 1 : 0, 7, dt);

    if (inside && !this.playerInside) game.bus.emit('zone:enter', this);
    this.playerInside = inside;

    if (!inside) return;

    this.feedTimer -= dt;
    if (this.feedTimer > 0) return;

    const type = game.carry.topType();
    if (!type) return;
    const price = Math.round((CFG.economy.prices[type] ?? 1) * (game.stats.sellBonus ?? 1) * game.events.sellMul);

    this.feedTimer = CFG.deliver.interval * 1.15;
    game.carry.removeOne(type);

    const idx = this.sellStreak++;
    this.streakTimer = 0.8;

    game.delivery.send(
      type, p.x, p.carryTopY(), p.z, this,
      () => this._onSold(type, price, idx, game),
      idx,
    );
  }

  _onSold(type, price, idx, game) {
    this.pulse = 1;
    game.audio.deposit(idx % 12);
    game.fx.sparks(this.x, this.deliverY, this.z, 4, 'rgba(255,220,140,1)', 0.6);

    // le monete tornano indietro verso il giocatore
    const p = game.player;
    game.delivery.send('coin', this.x, this.deliverY + 0.3, this.z, {
      get x() { return p.x; },
      get z() { return p.z; },
      deliverY: 1.1,
    }, () => {
      game.addCoins(price, p.x, 1.3, p.z);
      game.audio.coin(idx % 10);
      game.haptics.fire('light', 22);
    });

    this.totalEarned += price;
    game.bus.emit('merchant:sold', { type, price });
    void type;
  }

  draw(r, game) {
    const sp = game.assets.buildings.stall;
    r.shadow(this.x, this.z, this.radius * 1.15, 1);
    r.sprite(sp, this.x, 0, this.z, {
      depth: this.depth,
      squash: 1 + this.pulse * 0.035,
    });
  }

  drawUI(ctx, cam, dpr, game) {
    if (this.panelT < 0.02) return;
    const carrying = game.carry.total;
    const type = game.carry.topType() ?? 'wood';
    const info = RESOURCE_INFO[type];
    const price = Math.round((CFG.economy.prices[type] ?? 1) * (game.stats.sellBonus ?? 1) * game.events.sellMul);
    drawPanel(ctx, cam, dpr, this.x, 3.5 + this.pulse * 0.15, this.z, {
      title: carrying
        ? `Vendo ${info.icon} → ${price} 🪙`
        : 'Mercante · porta risorse',
      appear: this.panelT,
      width: carrying ? 150 : 176,
      titleColor: '#ffe9a8',
    });
  }
}
