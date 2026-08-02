/**
 * SpatialGrid.js — Griglia spaziale uniforme.
 *
 * Serve a due cose fondamentali:
 *  1. disegnare SOLO ciò che è inquadrato (culling) su mappe grandi;
 *  2. trovare in fretta le entità vicine al giocatore (raccolta, collisioni).
 *
 * Le celle sono indicizzate in una Map con chiave intera compatta.
 */

export class SpatialGrid {
  constructor(cellSize = 4) {
    this.cs = cellSize;
    this.cells = new Map();
    this._stamp = 0;
  }

  _key(cx, cz) {
    // impacchetta due interi con segno in un unico numero
    return (cx + 32768) * 65536 + (cz + 32768);
  }

  cellOf(x, z) {
    return [Math.floor(x / this.cs), Math.floor(z / this.cs)];
  }

  insert(e) {
    const cx = Math.floor(e.x / this.cs);
    const cz = Math.floor(e.z / this.cs);
    e._cx = cx; e._cz = cz;
    const k = this._key(cx, cz);
    let arr = this.cells.get(k);
    if (!arr) this.cells.set(k, (arr = []));
    arr.push(e);
  }

  remove(e) {
    const arr = this.cells.get(this._key(e._cx, e._cz));
    if (!arr) return;
    const i = arr.indexOf(e);
    if (i >= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); }
  }

  /** Da chiamare quando un'entità mobile cambia posizione. */
  update(e) {
    const cx = Math.floor(e.x / this.cs);
    const cz = Math.floor(e.z / this.cs);
    if (cx === e._cx && cz === e._cz) return;
    this.remove(e);
    this.insert(e);
  }

  /**
   * Raccoglie in `out` tutte le entità nel rettangolo indicato.
   * Non alloca: `out` viene svuotato e riempito.
   */
  queryRect(x0, z0, x1, z1, out) {
    out.length = 0;
    const cs = this.cs;
    const cx0 = Math.floor(x0 / cs), cx1 = Math.floor(x1 / cs);
    const cz0 = Math.floor(z0 / cs), cz1 = Math.floor(z1 / cs);
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const arr = this.cells.get(this._key(cx, cz));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }

  /** Entità entro `r` unità da (x,z) — usa il rettangolo poi filtra. */
  queryRadius(x, z, r, out) {
    this.queryRect(x - r, z - r, x + r, z + r, out);
    const r2 = r * r;
    let n = 0;
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      const dx = e.x - x, dz = e.z - z;
      if (dx * dx + dz * dz <= r2) out[n++] = e;
    }
    out.length = n;
    return out;
  }
}
