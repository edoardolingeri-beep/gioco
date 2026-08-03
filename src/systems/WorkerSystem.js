/**
 * WorkerSystem.js — Assunzione degli operai.
 *
 * Non tiene un `update()` proprio: ogni operaio (`WorkerEntity`) e ogni
 * cartello (`HireStationEntity`) sono entità autonome nel mondo, come tutto
 * il resto del gioco. Questo sistema fa solo da libro contabile — quanti
 * operai per tipo e quanto hanno già accumulato — per il salvataggio.
 *
 * Un operaio non consegna né vende da sé: accumula al cartello, e tocca al
 * giocatore passare a ritirare. Il trasporto automatico fino a un cantiere
 * è un candidato naturale per una futura costruzione (un nastro
 * trasportatore, per esempio) — non c'è ancora, e questo sistema non
 * finge che ci sia.
 */

import { WORKER_TYPES } from '../data/workers.js';
import { HireStationEntity } from '../entities/HireStationEntity.js';
import { WorkerEntity } from '../entities/WorkerEntity.js';

export class WorkerSystem {
  constructor(game) {
    this.game = game;
    /** Un cartello per tipo di operaio, indicizzato per id. */
    this.stations = {};
    /** Quanti operai assunti per tipo — finisce nel salvataggio. */
    this.counts = {};
    /** Scorta accumulata per tipo, letta da `load()` prima che i cartelli
     *  vengano ricreati: `registerStation` la applica appena nasce. */
    this.pendingStock = {};
    /** Livelli comprati per tipo/leva: {typeId: {yield, capacity}}. */
    this.levels = {};
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
    station.stock = Math.min(this.stockCap(typeId), this.pendingStock[typeId] ?? 0);
    this.stations[typeId] = station;
    this.game.world.add(station, true);

    // Al caricamento di un salvataggio gli operai già assunti tornano al
    // lavoro subito, senza rifare la fanfara dell'assunzione.
    const already = this.counts[typeId] ?? 0;
    for (let i = 0; i < already; i++) this._spawnWorker(station);
  }

  /** Assume un nuovo operaio (la spesa in monete l'ha già fatta il cartello). */
  hire(typeId, station) {
    this.counts[typeId] = (this.counts[typeId] ?? 0) + 1;
    this._spawnWorker(station);
  }

  _spawnWorker(station) {
    const w = new WorkerEntity(station, this.game);
    this.game.world.add(w, true);
    return w;
  }

  /** Istantanea della scorta di ogni cartello, per il salvataggio. */
  stockSnapshot() {
    const out = {};
    for (const id in this.stations) out[id] = this.stations[id].stock;
    return out;
  }

  /* ------------------------------------------------- potenziamenti (negozio) */

  /** Livello già comprato per quel tipo/leva (0 = mai potenziato). */
  level(typeId, axis) { return this.levels[typeId]?.[axis] ?? 0; }

  /** Quanta risorsa deposita l'operaio a ogni consegna. */
  harvestYield(typeId) {
    const u = WORKER_TYPES[typeId].upgrades.yield;
    return u.base + this.level(typeId, 'yield') * u.step;
  }

  /** Capienza attuale del magazzino del cartello. */
  stockCap(typeId) {
    const u = WORKER_TYPES[typeId].upgrades.capacity;
    return u.base + this.level(typeId, 'capacity') * u.step;
  }

  /** Costo del prossimo livello per quella leva, o null se già al massimo. */
  upgradeCost(typeId, axis) {
    const u = WORKER_TYPES[typeId].upgrades[axis];
    const lvl = this.level(typeId, axis);
    if (lvl >= u.maxLevel) return null;
    return Math.round(u.cost * u.growth ** lvl);
  }

  /** Compra un livello, se il cartello esiste e le monete bastano. */
  buyUpgrade(typeId, axis, game) {
    if (!this.stations[typeId]) return false;
    const cost = this.upgradeCost(typeId, axis);
    if (cost == null || game.stats.coins < cost) return false;

    game.spendCoins(cost);
    this.levels[typeId] = this.levels[typeId] ?? { yield: 0, capacity: 0 };
    this.levels[typeId][axis]++;

    game.audio.upgrade();
    game.haptics.fire('success', 0);
    const st = this.stations[typeId];
    game.fx.confetti(st.x, 1.3, st.z, 16);
    game.hud.toast(`${WORKER_TYPES[typeId].upgrades[axis].label} potenziato!`);
    return true;
  }
}
