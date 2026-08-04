/**
 * EventSystem.js — Eventi casuali (Fase 2+).
 *
 * Ogni tanto, mentre giochi, succede qualcosa che non hai chiesto tu:
 *   - un carro rovesciato lascia risorse gratis vicino a te;
 *   - un lupo più forte del solito si aggira nei paraggi, con una scelta
 *     vera (affrontarlo o lasciarlo perdere) e una ricompensa più grossa.
 *
 * (C'era anche un evento "il mercante paga di più per un po'": tolto perché
 * poco chiaro — un bonus a tempo che scade da solo, senza che si capisca
 * subito perché il prezzo è cambiato, confondeva più che aiutare.)
 *
 * Si attiva quando nasce il villaggio (come `EnemySpawner`), e da lì in poi
 * sceglie un evento a caso a intervalli irregolari — mai troppo spesso,
 * mai due volte di fila la stessa cosa che si può ignorare senza pensarci.
 */

import { CFG } from '../data/config.js';
import { WolfEntity } from '../entities/WolfEntity.js';
import { fxRand } from '../core/Rand.js';
import { TAU } from '../core/MathUtils.js';

export class EventSystem {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.timer = CFG.events.firstDelay;
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.timer = CFG.events.firstDelay;
  }

  update(dt, game) {
    if (!this.enabled) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = fxRand.range(CFG.events.interval[0], CFG.events.interval[1]);
    this._trigger(game);
  }

  _trigger(game) {
    // Niente eventi mentre un altro pannello è già aperto: non deve
    // sovrapporsi a negozio/opzioni, né interrompere chi sta leggendoli.
    if (!game.hud.el.shopSheet.hidden || !game.hud.el.sheet.hidden) {
      this.timer = 8;
      return;
    }

    const pool = ['cart'];
    if (game.stats.wolvesKilled + game.stats.bearsKilled >= CFG.events.rareWolfMinKills) {
      pool.push('rareWolf');
    }
    const kind = pool[(Math.random() * pool.length) | 0];
    if (kind === 'cart') this._cart(game);
    else this._rareWolf(game);
  }

  /** Un carro rovesciato: qualche risorsa gratis a terra, vicino a te. */
  _cart(game) {
    const p = game.player;
    const pool = ['wood'];
    if (game.workers.stations.miner) pool.push('stone');
    if (game.workers.stations.ironminer) pool.push('iron');
    if (game.workers.stations.goldminer) pool.push('gold');
    if (game.workers.stations.fisherman) pool.push('fish');
    const type = pool[(Math.random() * pool.length) | 0];

    const n = (CFG.events.cartMinRes
      + Math.floor(Math.random() * (CFG.events.cartMaxRes - CFG.events.cartMinRes + 1)));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const r = 0.6 + Math.random() * 1.6;
      game.pickups.spawn(
        type, p.x + Math.cos(a) * r, 0.4, p.z + Math.sin(a) * r,
        Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.9,
      );
    }
    game.audio.pop(4);
    game.hud.toast('Un carro si è rovesciato lì vicino! 🛒💥 Raccogli quello che riesci');
  }

  /** Un lupo più forte del solito: una scelta vera, non solo un annuncio. */
  _rareWolf(game) {
    game.hud.showEvent({
      icon: '🐺',
      title: 'Lupo feroce nei paraggi!',
      desc: 'Più forte del solito — ma se lo abbatti la ricompensa è quadrupla.',
      accept: 'Affrontalo ⚔️',
      decline: 'Evita 🙅',
      onAccept: () => this._spawnRareWolf(game),
    });
  }

  _spawnRareWolf(game) {
    const p = game.player;
    const a = Math.random() * TAU;
    const r = 6.5;
    const wolf = new WolfEntity(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, game);
    wolf.maxHp = Math.round(wolf.maxHp * CFG.events.rareWolfHpMul);
    wolf.hp = wolf.maxHp;
    wolf.speed *= CFG.events.rareWolfSpeedMul;
    wolf.rewardMul = CFG.events.rareWolfRewardMul;
    wolf.fierce = true;
    game.world.add(wolf, true);
    game.spawner.enemies.push(wolf);
    game.hud.toast('Il lupo feroce è arrivato! 🐺');
  }
}
