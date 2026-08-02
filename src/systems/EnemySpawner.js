/**
 * EnemySpawner.js — Le ondate di nemici (Fase 2).
 *
 * Regole pensate per non essere mai frustranti:
 *  - i lupi compaiono SOLO nel bosco, mai dentro il villaggio;
 *  - non compaiono mai troppo vicino al giocatore (niente imboscate ingiuste);
 *  - il numero massimo cresce con il villaggio, così la difficoltà segue la
 *    progressione;
 *  - vicino al falò e dentro la staccionata c'è una zona sicura.
 */

import { CFG } from '../data/config.js';
import { WolfEntity } from '../entities/WolfEntity.js';
import { fxRand } from '../core/Rand.js';
import { TAU, dist } from '../core/MathUtils.js';

export class EnemySpawner {
  constructor(game) {
    this.game = game;
    this.timer = CFG.enemies.firstWaveDelay;
    this.enemies = [];
    this.enabled = false;      // si attiva quando il villaggio nasce
    this.killed = 0;
  }

  /** Il numero massimo di lupi contemporanei cresce col villaggio. */
  get maxEnemies() {
    const C = CFG.enemies;
    return Math.min(C.maxTotal, C.baseMax + this.game.village.level);
  }

  get alive() { return this.enemies.length; }

  update(dt, game) {
    // ripulisce i morti
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead) {
        game.world.remove(e);
        this.enemies.splice(i, 1);
      }
    }

    if (!this.enabled) return;
    this.timer -= dt;
    if (this.timer > 0) return;

    this.timer = fxRand.range(CFG.enemies.spawnInterval[0], CFG.enemies.spawnInterval[1]);
    if (this.enemies.length >= this.maxEnemies) return;

    const spot = this._findSpot(game);
    if (!spot) return;

    const w = new WolfEntity(spot[0], spot[1], game);
    game.world.add(w, true);
    this.enemies.push(w);
    game.bus.emit('enemy:spawned', w);
  }

  /** Cerca un punto valido: nel bosco, lontano dal giocatore e dal villaggio. */
  _findSpot(game) {
    const C = CFG.enemies;
    const p = game.player;
    for (let i = 0; i < 24; i++) {
      const a = fxRand.range(0, TAU);
      const r = fxRand.range(CFG.village.safeRadius + 3, CFG.world.radius - 4);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;

      // né troppo vicino (imboscata) né troppo lontano (non lo incontreresti mai)
      const d = dist(x, z, p.x, p.z);
      if (d < C.minSpawnDist || d > C.maxSpawnDist) continue;
      return [x, z];
    }
    return null;
  }

  /** Attiva le ondate (chiamato quando nasce il villaggio). */
  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.timer = CFG.enemies.firstWaveDelay;
  }

  /** Rimuove tutti i nemici (usato dal riposo alla capanna). */
  clearAll(game) {
    for (const e of this.enemies) game.world.remove(e);
    this.enemies.length = 0;
  }
}
