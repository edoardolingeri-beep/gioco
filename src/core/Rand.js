/**
 * Rand.js — Generatore pseudo-casuale deterministico (mulberry32).
 * Serve per generare mondi riproducibili a partire da un seed.
 */

export class Rand {
  constructor(seed = 1) {
    this.s = seed >>> 0;
  }

  /** float in [0,1) */
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** float in [a,b) */
  range(a, b) { return a + this.next() * (b - a); }

  /** intero in [a,b] */
  int(a, b) { return Math.floor(this.range(a, b + 1)); }

  /** elemento casuale di un array */
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }

  /** true con probabilità p */
  chance(p) { return this.next() < p; }

  /** valore centrato: [-a, a] */
  sym(a) { return this.range(-a, a); }
}

/** Istanza globale non deterministica per gli effetti visivi. */
export const fxRand = new Rand((Math.random() * 0xffffffff) >>> 0);
