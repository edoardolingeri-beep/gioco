/**
 * ObjectPool.js — Pool di oggetti riutilizzabili.
 *
 * Su mobile il garbage collector è il nemico numero uno della fluidità:
 * particelle, numeri volanti e risorse a terra vengono creati e distrutti
 * a centinaia al secondo. Il pool li ricicla senza mai allocare a runtime.
 */

export class ObjectPool {
  /**
   * @param {() => object} factory  crea un elemento vuoto
   * @param {(o:object) => void} reset  riporta l'elemento allo stato iniziale
   * @param {number} initial  quanti pre-allocarne
   */
  constructor(factory, reset, initial = 0) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    /** Elementi attualmente in uso: iterabile direttamente dai sistemi. */
    this.active = [];
    for (let i = 0; i < initial; i++) this.free.push(factory());
  }

  get count() { return this.active.length; }

  /** Preleva un elemento (riciclato o nuovo) e lo marca attivo. */
  obtain() {
    const o = this.free.pop() ?? this.factory();
    this.reset(o);
    this.active.push(o);
    return o;
  }

  /** Rimette in circolo l'elemento all'indice `i` di `active`. */
  releaseAt(i) {
    const o = this.active[i];
    const last = this.active.length - 1;
    this.active[i] = this.active[last];
    this.active.pop();
    this.free.push(o);
    return o;
  }

  /**
   * Aggiorna tutti gli attivi; se `fn` ritorna true l'elemento viene liberato.
   * Iterazione all'indietro per poter rimuovere in sicurezza.
   */
  update(fn) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (fn(this.active[i], i)) this.releaseAt(i);
    }
  }

  clear() {
    while (this.active.length) this.releaseAt(this.active.length - 1);
  }
}
