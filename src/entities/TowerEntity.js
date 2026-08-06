/**
 * TowerEntity.js — La torretta di guardia: la prima difesa del villaggio.
 *
 * Fino a qui ogni edificio finito "si spegne" (esce dalla lista degli
 * update, torna a costare quanto un arredo statico — vedi
 * `BuildingEntity.update`). La torretta no: una volta completa continua a
 * cercare, ogni frame, il lupo, l'orso o il ladro più vicino nel suo raggio
 * e gli spara da sola, senza che il giocatore debba fare niente — è anche
 * la seconda difesa del villaggio contro i raid (vedi `RaidSystem`), oltre
 * al recinto. Per il resto —
 * cantiere, sblocco a monete, animazione di salita — è un `BuildingEntity`
 * come tutti gli altri: eredita tutto quello, aggiunge solo la difesa.
 */

import { BuildingEntity, BUILD_STATE } from './BuildingEntity.js';
import { CFG } from '../data/config.js';
import { WolfEntity } from './WolfEntity.js';
import { BearEntity } from './BearEntity.js';
import { ThiefEntity } from './ThiefEntity.js';
import { dist } from '../core/MathUtils.js';

export class TowerEntity extends BuildingEntity {
  constructor(x, z, def, game) {
    super(x, z, def, game);
    this.fireT = 0;
    this.target = null;
  }

  update(dt, game) {
    if (this.state !== BUILD_STATE.DONE) { super.update(dt, game); return; }
    this._defend(dt, game);
  }

  _defend(dt, game) {
    const C = CFG.tower;
    this.fireT -= dt;

    const near = game.scratch.near;
    game.grid.queryRadius(this.x, this.z, C.range, near);
    let target = null, bestD = Infinity;
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (!(e instanceof WolfEntity || e instanceof BearEntity || e instanceof ThiefEntity) || !e.alive) continue;
      const d = dist(this.x, this.z, e.x, e.z);
      if (d < bestD) { bestD = d; target = e; }
    }
    this.target = target;

    if (target && this.fireT <= 0) {
      this.fireT = C.interval;
      target.takeDamage(C.damage, this.x, this.z, game);
      game.audio.towerShot();
      game.fx.puff(this.x, this.radius + 1.8, this.z, 3, 'rgba(210,210,225,0.65)', 0.35, 0.14);
      game.fx.sparks(target.x, 1, target.z, 5, 'rgba(200,220,255,1)', 0.7);
    }
  }
}
