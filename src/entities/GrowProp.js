/**
 * GrowProp.js — Decorazione che COMPARE mentre giochi.
 *
 * È il mattone dell'evoluzione del mondo: quando il villaggio cresce, gli
 * arredi non appaiono di colpo — spuntano dal terreno con un rimbalzo, una
 * nuvoletta di polvere e un piccolo suono. Il giocatore vede il mondo
 * cambiare davanti ai suoi occhi.
 *
 * Una volta finita l'animazione l'entità smette di aggiornarsi e torna a
 * costare quanto una decorazione statica.
 */

import { Entity } from './Entity.js';
import { clamp, easeOutBack } from '../core/MathUtils.js';

export class GrowProp extends Entity {
  /**
   * @param {object} o { solid, radius, shadow, scale, flip, delay, silent }
   */
  constructor(x, z, sprite, o = {}) {
    super(x, z);
    this.sprite = sprite;
    this.radius = o.radius ?? sprite.radius ?? 0.4;
    this.solid = o.solid ?? false;
    this.shadow = o.shadow ?? 0;
    this.scale = o.scale ?? 1;
    this.flip = o.flip ?? false;

    this.delay = o.delay ?? 0;
    this.t = o.instant ? 1 : 0;
    this.static = this.t >= 1;
    this.silent = o.silent ?? false;
    this._popped = this.t >= 1;
  }

  update(dt, game) {
    if (this.t >= 1) { this.static = true; return; }
    if (this.delay > 0) { this.delay -= dt; return; }

    if (!this._popped) {
      this._popped = true;
      if (!this.silent) {
        game.fx.puff(this.x, 0.04, this.z, 6, 'rgba(214,198,168,0.85)', this.radius * 1.6, 0.26);
        game.audio.plant();
      }
    }
    this.t = clamp(this.t + dt / 0.45, 0, 1);
    if (this.t >= 1) {
      this.static = true;
      // esce dalla lista degli aggiornamenti al prossimo giro
      game.world.retire(this);
    }
  }

  draw(r) {
    if (this.delay > 0) return;
    const k = this.t >= 1 ? 1 : easeOutBack(this.t);
    if (k <= 0.01) return;
    if (this.shadow > 0) r.shadow(this.x, this.z, this.shadow * this.scale * k, k);
    r.sprite(this.sprite, this.x, 0, this.z, {
      scale: this.scale * k,
      squash: this.t < 1 ? 1 + Math.sin(this.t * Math.PI) * 0.18 : 1,
      flipX: this.flip,
      depth: this.depth,
    });
  }
}
