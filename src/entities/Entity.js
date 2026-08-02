/**
 * Entity.js — Classe base di tutto ciò che sta nel mondo.
 *
 * Contratto minimo:
 *  - x, y, z      posizione (y = altezza)
 *  - radius       raggio di collisione/interazione al suolo
 *  - solid        se true blocca il giocatore
 *  - update(dt, game)
 *  - draw(r, game)   accoda comandi al Renderer
 */

import { depthOf } from '../render/Projection.js';

let NEXT_ID = 1;

export class Entity {
  constructor(x, z) {
    this.id = NEXT_ID++;
    this.x = x; this.y = 0; this.z = z;
    this.radius = 0.4;
    this.solid = false;
    this.dead = false;
    this.static = true;      // se false viene aggiornata ogni frame
    this._cx = 0; this._cz = 0;
  }

  get depth() { return depthOf(0, this.z); }

  update(_dt, _game) {}
  draw(_r, _game) {}
}

/**
 * Decorazione immobile senza logica: erba, fiori, sassolini, cespugli.
 * È il 90% delle entità della mappa, quindi deve essere il più leggera
 * possibile: nessun update, un solo comando di disegno.
 */
export class StaticProp extends Entity {
  /**
   * @param {object} sprite sprite già cotta
   * @param {object} o { solid, radius, shadow, scale, flip }
   */
  constructor(x, z, sprite, o = {}) {
    super(x, z);
    this.sprite = sprite;
    this.radius = o.radius ?? sprite.radius ?? 0.3;
    this.solid = o.solid ?? false;
    this.shadow = o.shadow ?? 0;
    this.scale = o.scale ?? 1;
    this.flip = o.flip ?? false;
  }

  draw(r) {
    if (this.shadow > 0) r.shadow(this.x, this.z, this.shadow * this.scale, 1);
    r.sprite(this.sprite, this.x, 0, this.z, {
      scale: this.scale,
      flipX: this.flip,
      depth: this.depth,
    });
  }
}
