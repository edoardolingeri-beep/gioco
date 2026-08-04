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
    /** Nastri trasportatori comprati: {typeId: true}. */
    this.conveyors = {};
    /** "Nuovi pozzi" comprati (raddoppiano la resa): {typeId: true}. */
    this.pits2 = {};
  }

  /**
   * Fa comparire il cartello vicino all'edificio appena finito — o in una
   * posizione fissa (`def.stationSpot`), per gli operai la cui risorsa non
   * si trova affatto vicino all'edificio che li sblocca (il ferro e l'oro
   * sono tutti oltre il fiume, mentre fucina e banca restano a sud).
   * Chiamato sia da `onComplete` (prima volta, con fanfara) sia da
   * `onRestore` (al caricamento, in silenzio) — per questo è idempotente.
   */
  registerStation(typeId, building) {
    if (this.stations[typeId] || !building) return;
    const def = WORKER_TYPES[typeId];
    const x = def.stationSpot ? def.stationSpot.x : building.x + (def.offX ?? 1.6);
    const z = def.stationSpot ? def.stationSpot.z : building.z + (def.offZ ?? 0.7);
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
    const base = u.base + this.level(typeId, 'yield') * u.step;
    return this.hasPit2(typeId) ? base * WORKER_TYPES[typeId].pit2.yieldMul : base;
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

  /* ------------------------------------------------- nastro trasportatore */

  hasConveyor(typeId) { return !!this.conveyors[typeId]; }

  /** True se resa e magazzino sono già al livello massimo: solo allora il
   *  nastro trasportatore si può comprare — è un traguardo, non una tappa. */
  conveyorReady(typeId) {
    const u = WORKER_TYPES[typeId].upgrades;
    return this.level(typeId, 'yield') >= u.yield.maxLevel
      && this.level(typeId, 'capacity') >= u.capacity.maxLevel;
  }

  buyConveyor(typeId, game) {
    if (!this.stations[typeId] || this.hasConveyor(typeId) || !this.conveyorReady(typeId)) return false;
    const cost = WORKER_TYPES[typeId].conveyor.cost;
    if (game.stats.coins < cost) return false;

    game.spendCoins(cost);
    this.conveyors[typeId] = true;

    game.audio.upgrade();
    game.haptics.fire('success', 0);
    const st = this.stations[typeId];
    game.cam.addShake(0.3);
    game.fx.confetti(st.x, 1.5, st.z, 28);
    game.hud.toast(`${WORKER_TYPES[typeId].name}: nastro trasportatore installato — vende da solo! 🏭`);
    return true;
  }

  /* ------------------------------------------------------------- nuovo pozzo */

  hasPit2(typeId) { return !!this.pits2[typeId]; }

  /** Un traguardo oltre il traguardo: si può scavare solo dopo aver già
   *  installato il nastro trasportatore — altrimenti raddoppiare una resa
   *  che il giocatore deve ancora venire a ritirare a mano non si sente. */
  pit2Ready(typeId) { return this.hasConveyor(typeId); }

  buyPit2(typeId, game) {
    if (!this.stations[typeId] || this.hasPit2(typeId) || !this.pit2Ready(typeId)) return false;
    const cost = WORKER_TYPES[typeId].pit2.cost;
    if (game.stats.coins < cost) return false;

    game.spendCoins(cost);
    this.pits2[typeId] = true;

    game.audio.upgrade();
    game.haptics.fire('success', 0);
    const st = this.stations[typeId];
    game.cam.addShake(0.4);
    game.fx.confetti(st.x, 1.6, st.z, 36);
    game.hud.toast(`${WORKER_TYPES[typeId].pit2.label}: resa raddoppiata! ${WORKER_TYPES[typeId].pit2.icon}`);
    return true;
  }
}
