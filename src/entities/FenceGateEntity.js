/**
 * FenceGateEntity.js — Un tratto di staccionata che si apre da solo.
 *
 * La staccionata resta un anello chiuso e ordinato — niente più varchi
 * permanenti che sembrano un buco nella recinzione — ma alcuni tratti,
 * quelli marcati da un cancelletto, sprofondano nel terreno quando ti
 * avvicini e risalgono quando te ne vai. Più punti d'ingresso, tutti
 * automatici: nessun pulsante, nessun cancello da spingere.
 */

import { Entity } from './Entity.js';
import { clamp, damp } from '../core/MathUtils.js';

export class FenceGateEntity extends Entity {
  /**
   * @param {number} x  @param {number} z  posizione del tratto di staccionata
   * @param {number} gateX @param {number} gateZ  centro del varco a cui appartiene
   *   (più tratti condividono lo stesso centro, così si aprono insieme)
   * @param {object} sprite
   * @param {object} o { radius, shadow, openRadius }
   */
  constructor(x, z, gateX, gateZ, sprite, o = {}) {
    super(x, z);
    this.sprite = sprite;
    this.gateX = gateX;
    this.gateZ = gateZ;
    this.radius = o.radius ?? sprite.radius ?? 0.6;
    this.shadow = o.shadow ?? 0.34;
    this.openRadius = o.openRadius ?? 2.3;

    this.static = false;
    this.solid = true;
    /** 1 = chiuso e ben visibile, 0 = sprofondato e attraversabile. */
    this.t = 1;
    this._wasOpen = false;
  }

  update(dt, game) {
    const p = game.player;
    const dx = p.x - this.gateX, dz = p.z - this.gateZ;
    const open = (dx * dx + dz * dz) < this.openRadius * this.openRadius;

    if (open !== this._wasOpen) {
      this._wasOpen = open;
      game.fx.puff(this.x, 0.03, this.z, 4,
        'rgba(214,198,168,0.7)', this.radius * 1.2, 0.22);
      game.haptics.fire('light', 30);
    }

    this.t = damp(this.t, open ? 0 : 1, 6.5, dt);
    // Torna solido solo quando è per lo più richiuso: altrimenti si
    // rischierebbe di respingere il giocatore proprio mentre sta entrando.
    this.solid = this.t > 0.55;
  }

  draw(r) {
    const k = clamp(this.t, 0, 1);
    if (k <= 0.015) return;
    if (this.shadow > 0) r.shadow(this.x, this.z, this.shadow * k, k);
    r.sprite(this.sprite, this.x, -(1 - k) * 0.85, this.z, {
      alpha: clamp(k * 1.5, 0, 1),
      scale: 0.82 + k * 0.18,
      depth: this.depth,
    });
  }
}
