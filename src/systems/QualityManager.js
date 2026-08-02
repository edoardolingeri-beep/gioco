/**
 * QualityManager.js — Qualità adattiva.
 *
 * Il parco telefoni è enorme: lo stesso gioco gira su un top di gamma e su un
 * Android da 100 euro. Invece di tarare tutto sul minimo comune denominatore,
 * misuriamo gli FPS reali e abbassiamo (o rialziamo) la risoluzione di
 * rendering finché l'esperienza non è fluida.
 *
 * La risoluzione è l'unica leva che tocchiamo: le sprite restano identiche,
 * quindi il gioco non "peggiora" visivamente, diventa solo un filo più morbido.
 */

const LEVELS = [1, 0.86, 0.74, 0.62];
const TARGET_FPS = 55;
const RECOVER_FPS = 59;

export class QualityManager {
  constructor(game) {
    this.game = game;
    this.level = 0;
    this.badTime = 0;
    this.goodTime = 0;
    /** Se true l'utente ha fissato la qualità a mano: non tocchiamo più nulla. */
    this.locked = false;
  }

  get scale() { return LEVELS[this.level]; }

  /** Imposta un livello specifico (0 = massimo). */
  setLevel(i) {
    this.level = Math.max(0, Math.min(LEVELS.length - 1, i));
    this.game.resize();
    this.badTime = this.goodTime = 0;
  }

  update(dt, fps) {
    if (this.locked) return;
    // I primi istanti dopo l'avvio non sono rappresentativi.
    if (this.game.time < 2.5) return;

    if (fps < TARGET_FPS) {
      this.badTime += dt;
      this.goodTime = 0;
      if (this.badTime > 1.8 && this.level < LEVELS.length - 1) {
        this.setLevel(this.level + 1);
      }
    } else if (fps > RECOVER_FPS) {
      this.goodTime += dt;
      this.badTime = 0;
      // Si risale solo dopo una lunga tregua, per evitare di oscillare.
      if (this.goodTime > 8 && this.level > 0) {
        this.setLevel(this.level - 1);
      }
    } else {
      this.badTime = Math.max(0, this.badTime - dt * 0.5);
    }
  }
}
