/**
 * WorkerSystem.js — Assunzione e consegne degli operai.
 *
 * Non tiene un `update()` proprio: ogni operaio (`WorkerEntity`) e ogni
 * cartello (`HireStationEntity`) sono entità autonome nel mondo, come tutto
 * il resto del gioco. Questo sistema fa da libro contabile (quanti operai
 * per tipo, per il salvataggio) e sa dove va a finire ciò che un operaio
 * riporta: prima aiuta i cantieri aperti, altrimenti si vende da sé.
 */

import { CFG } from '../data/config.js';
import { WORKER_TYPES } from '../data/workers.js';
import { HireStationEntity } from '../entities/HireStationEntity.js';
import { WorkerEntity } from '../entities/WorkerEntity.js';
import { BUILD_ORDER } from '../data/buildings.js';
import { BUILD_STATE } from '../entities/BuildingEntity.js';

export class WorkerSystem {
  constructor(game) {
    this.game = game;
    /** Un cartello per tipo di operaio, indicizzato per id. */
    this.stations = {};
    /** Quanti operai assunti per tipo — è ciò che finisce nel salvataggio. */
    this.counts = {};
  }

  /**
   * Fa comparire il cartello vicino all'edificio appena finito.
   * Chiamato sia da `onComplete` (prima volta, con fanfara) sia da
   * `onRestore` (al caricamento, in silenzio) — per questo è idempotente.
   */
  registerStation(typeId, building) {
    if (this.stations[typeId] || !building) return;
    const def = WORKER_TYPES[typeId];
    const x = building.x + (def.offX ?? 1.6);
    const z = building.z + (def.offZ ?? 0.7);
    const station = new HireStationEntity(x, z, def, this);
    this.stations[typeId] = station;
    this.game.world.add(station, true);

    // Al caricamento di un salvataggio gli operai già assunti tornano al
    // lavoro subito, senza rifare la fanfara dell'assunzione.
    const already = this.counts[typeId] ?? 0;
    for (let i = 0; i < already; i++) this._spawnWorker(typeId, station);
  }

  /** Assume un nuovo operaio (la spesa in monete l'ha già fatta il cartello). */
  hire(typeId, station) {
    this.counts[typeId] = (this.counts[typeId] ?? 0) + 1;
    this._spawnWorker(typeId, station);
  }

  _spawnWorker(typeId, station) {
    const def = WORKER_TYPES[typeId];
    const w = new WorkerEntity(station.x, station.z, def, this.game);
    this.game.world.add(w, true);
    return w;
  }

  /**
   * Dove va a finire ciò che un operaio riporta: prima il primo cantiere
   * aperto che ne ha ancora bisogno (l'automazione aiuta a costruire), poi —
   * se in giro non c'è nulla da finire — si vende da sé, come farebbe il
   * giocatore al mercante. Non genera mai un operaio "sprecato".
   */
  deliver(type, x, z) {
    const game = this.game;
    game.fx.sparks(x, 1.1, z, 4, 'rgba(255,236,180,1)', 0.5);
    game.audio.deposit(0);

    for (const id of BUILD_ORDER) {
      const b = game.world.buildings[id];
      if (!b || !b.available || !b.unlocked || b.state !== BUILD_STATE.BLUEPRINT) continue;
      if (b.def.cost[type] == null) continue;
      if (b.paid[type] >= b.def.cost[type]) continue;
      b._receive(type, game, b.paidTotal);
      return;
    }

    // Nessun cantiere la vuole ancora: diventa moneta, come al mercante.
    const price = Math.round((CFG.economy.prices[type] ?? 1) * (game.stats.sellBonus ?? 1));
    game.addCoins(price, x, 1.3, z);
    game.audio.coin(0);
  }
}
