/**
 * HireStationEntity.js — Il cartello per assumere un operaio.
 *
 * Stessa filosofia del banco dell'artigiano: ti avvicini, se hai le monete
 * resti fermo un istante e l'operaio compare. Si può assumerne più di uno
 * (fino al massimo previsto): ogni nuovo operaio costa di più del
 * precedente, così l'automazione resta una scelta e non un unico click che
 * risolve tutto.
 *
 * Il cartello è anche il MAGAZZINO dell'operaio: ciò che raccoglie si
 * accumula qui (fino a `stockCap`) finché il giocatore non passa a
 * ritirarlo — proprio come se lo caricasse sulle proprie spalle. Da qui in
 * poi la consegna a un cantiere o al mercante è di nuovo compito del
 * giocatore: l'operaio raccoglie, non consegna.
 */

import { Entity } from './Entity.js';
import { RESOURCE_INFO } from '../data/buildings.js';
import { CFG, sellPrice } from '../data/config.js';
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

    /** Risorsa già raccolta e in attesa che il giocatore la ritiri (o che
     *  il nastro trasportatore, se comprato, la venda da solo). */
    this.stock = 0;
    this.collectTimer = 0;
    this.sellTimer = 0;
  }

  get count() { return this.workers.counts[this.def.id] ?? 0; }
  get maxed() { return this.count >= this.def.maxWorkers; }
  get cost() { return Math.round(this.def.hireCost * (this.def.costGrowth ** this.count)); }
  get stockFull() { return this.stock >= this.workers.stockCap(this.def.id); }

  update(dt, game) {
    this.pulse = damp(this.pulse, 0, 7, dt);

    const p = game.player;
    const d2 = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
    const inside = d2 < this.zone * this.zone;
    this.panelT = damp(this.panelT, d2 < (this.zone + 3) ** 2 ? 1 : 0, 7, dt);

    if (inside && !this.playerInside) game.bus.emit('zone:enter', this);
    this.playerInside = inside;

    if (this.workers.autoSells(this.def.id)) this._autoSell(dt, game);
    else if (inside) this._collect(dt, game);

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

  /**
   * Il giocatore ritira, a raffica, ciò che l'operaio ha accumulato — la
   * stessa "cadenza" con cui i tronchi partono verso un cantiere, solo al
   * contrario: qui è il cartello a caricare lo zaino del giocatore.
   */
  _collect(dt, game) {
    if (this.stock <= 0) return;
    this.collectTimer -= dt;
    if (this.collectTimer > 0) return;
    if (game.carry.isFull) return;

    this.collectTimer = CFG.deliver.interval;
    this.stock--;
    const idx = game.carry.total;
    const type = this.def.resource;

    game.delivery.send(type, this.x, 1, this.z, {
      get x() { return game.player.x; },
      get z() { return game.player.z; },
      deliverY: 1.1,
    }, () => {
      game.carry.add(type, 1);
      game.audio.pop(idx % 12);
      game.haptics.fire('light', 20);
      game.player.bumpStack();
    }, idx);
  }

  /**
   * Il nastro trasportatore (comprato al negozio, una volta per tipo):
   * vende da sé la scorta, senza bisogno che il giocatore sia lì — funziona
   * anche dall'altra parte della mappa. Il suono si sente solo se sei
   * abbastanza vicino, stesso motivo per cui i colpi degli operai tacciono
   * da lontano: nessuno vuole un tintinnio di monete continuo in sottofondo.
   */
  _autoSell(dt, game) {
    if (this.stock <= 0) return;
    this.sellTimer -= dt;
    if (this.sellTimer > 0) return;

    this.sellTimer = CFG.deliver.interval;
    this.stock--;
    const price = sellPrice(game, this.def.resource);
    game.addCoins(price, this.x, 1.3, this.z);

    const near = Math.hypot(game.player.x - this.x, game.player.z - this.z) < 15;
    if (near) {
      game.audio.coin(0);
      game.fx.sparks(this.x, 1.2, this.z, 4, 'rgba(255,220,140,1)', 0.6);
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
    const info = RESOURCE_INFO[this.def.resource];
    const hasConveyor = this.workers.hasConveyor(this.def.id);

    if (hasConveyor) {
      // Niente più "vieni a ritirare": si vende da sé. Un solo promemoria
      // discreto, così si capisce perché il magazzino qui non si riempie mai.
      drawPanel(ctx, cam, dpr, this.x, 2.55, this.z, {
        title: '🏭 Nastro trasportatore — vende da solo',
        appear: this.panelT,
        width: 230,
        titleColor: '#9ef7c0',
      });
    } else if (this.def.alwaysSells) {
      // Il pesce non serve a nessuna costruzione: si vende sempre da solo,
      // fin dal primo pescato — nessun motivo di aspettare che il
      // magazzino si riempia.
      drawPanel(ctx, cam, dpr, this.x, 2.55, this.z, {
        title: `${info.icon} Si vende sempre da solo — non serve alle costruzioni`,
        appear: this.panelT,
        width: 250,
        titleColor: '#9ef7c0',
      });
    } else if (this.stockFull) {
      // Pieno e senza nastro: l'operaio non butta via il carico né resta
      // fermo ad aspettare — l'eccedenza si vende da sola, il resto aspetta
      // comunque qui pronto da ritirare per le costruzioni.
      drawPanel(ctx, cam, dpr, this.x, 2.55, this.z, {
        title: `${info.icon} Magazzino pieno — vende l'eccedenza, vieni a ritirare il resto`,
        appear: this.panelT,
        width: 250,
        titleColor: '#ffce54',
      });
    } else if (this.stock > 0) {
      // Il magazzino dell'operaio: quando c'è qualcosa pronto, è il pannello
      // più in alto, così è la prima cosa che si legge avvicinandosi.
      drawPanel(ctx, cam, dpr, this.x, 2.55, this.z, {
        title: `${info.icon} ${this.stock} pronti — avvicinati per ritirarli`,
        appear: this.panelT,
        width: 220,
        titleColor: info.color,
      });
    }

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
