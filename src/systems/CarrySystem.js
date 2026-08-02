/**
 * CarrySystem.js — Lo zaino / la pila sulla schiena.
 *
 * Non è solo un contatore: mantiene l'ORDINE degli oggetti raccolti, perché
 * la pila va disegnata fisicamente sulla schiena del personaggio e deve
 * crescere davvero, tronco dopo tronco.
 */

import { CFG } from '../data/config.js';
import { fxRand } from '../core/Rand.js';

export class CarrySystem {
  constructor(bus) {
    this.bus = bus;
    this.capacity = CFG.carry.baseCapacity;
    /** Pila ordinata: [{type, jx, jz, jr}] — j* sono scostamenti casuali
     *  che rendono la catasta irregolare e credibile. */
    this.stack = [];
    /** Conteggi rapidi per tipo. */
    this.counts = { wood: 0, stone: 0, iron: 0, gold: 0 };
  }

  get total() { return this.stack.length; }
  get isFull() { return this.stack.length >= this.capacity; }
  get fillRatio() { return this.stack.length / this.capacity; }

  count(type) { return this.counts[type] ?? 0; }

  /** Aggiunge n unità; ritorna quante ne ha effettivamente accettate. */
  add(type, n = 1) {
    let added = 0;
    while (added < n && !this.isFull) {
      this.stack.push({
        type,
        jx: fxRand.sym(CFG.carry.logJitter),
        jz: fxRand.sym(CFG.carry.logJitter * 0.7),
        jr: fxRand.sym(0.13),
        t: 0,               // animazione di comparsa
      });
      this.counts[type] = (this.counts[type] ?? 0) + 1;
      added++;
    }
    if (added) this.bus.emit('carry:changed', this);
    return added;
  }

  /**
   * Toglie una unità del tipo indicato, prendendola dalla CIMA della pila
   * (così l'animazione di consegna è coerente con ciò che si vede).
   * @returns {boolean} true se è stato tolto qualcosa
   */
  removeOne(type) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].type === type) {
        this.stack.splice(i, 1);
        this.counts[type]--;
        this.bus.emit('carry:changed', this);
        return true;
      }
    }
    return false;
  }

  /** Toglie fino a n unità; ritorna quante ne ha tolte. */
  remove(type, n) {
    let k = 0;
    while (k < n && this.removeOne(type)) k++;
    return k;
  }

  /** Il primo tipo disponibile partendo dalla cima (per le consegne). */
  topType() {
    return this.stack.length ? this.stack[this.stack.length - 1].type : null;
  }

  setCapacity(c) {
    this.capacity = c;
    this.bus.emit('carry:changed', this);
  }

  /** Avanza le animazioni di comparsa dei singoli elementi. */
  update(dt) {
    for (let i = 0; i < this.stack.length; i++) {
      const s = this.stack[i];
      if (s.t < 1) s.t = Math.min(1, s.t + dt * 6);
    }
  }
}
