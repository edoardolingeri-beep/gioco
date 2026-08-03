/**
 * VehicleEntity.js — Auto e tram che percorrono la città (Fase 5).
 *
 * I veicoli non hanno una vera guida autonoma: seguono un ANELLO di punti
 * predefinito, e l'unica intelligenza che serve è quella che si nota davvero
 * dall'alto —
 *   - frenare dietro al veicolo che precede;
 *   - fermarsi al semaforo rosso;
 *   - e soprattutto **frenare per il giocatore**, invece di investirlo:
 *     un gioco che ti uccide con il traffico mentre trasporti trenta tronchi
 *     sarebbe solo frustrante.
 *
 * La posizione lungo il percorso è una sola variabile (`t`, in metri di
 * percorso), quindi ordinamento e distanze fra veicoli sono banali.
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { depthOf } from '../render/Projection.js';
import { damp, TAU, clamp } from '../core/MathUtils.js';

export class VehicleEntity extends Entity {
  /**
   * @param {object} path percorso condiviso { points, lengths, total, at() }
   * @param {object} o { kind:'car'|'tram', variant, speed, t }
   */
  constructor(path, o, game) {
    super(0, 0);
    this.game = game;
    this.path = path;
    this.kind = o.kind ?? 'car';
    this.variant = o.variant ?? 0;
    this.maxSpeed = o.speed ?? CFG.traffic.carSpeed;
    this.t = o.t ?? 0;
    this.speed = this.maxSpeed;
    this.static = false;
    this.solid = false;
    this.radius = this.kind === 'tram' ? 1.1 : 0.6;
    this.length = this.kind === 'tram' ? 4.6 : 2.0;
    this.yaw = 0;
    this.hornCooldown = 0;

    this._place();
  }

  /** Posiziona il veicolo secondo `t` e ne calcola l'orientamento. */
  _place() {
    const p = this.path.at(this.t);
    this.x = p.x; this.z = p.z;
    this.yaw = p.yaw;
  }

  update(dt, game) {
    const C = CFG.traffic;
    this.hornCooldown -= dt;

    // --- ostacoli davanti: veicolo che precede, semaforo, giocatore ---
    let target = this.maxSpeed;

    const ahead = this.path.vehicleAhead(this);
    if (ahead) {
      const gap = this.path.gapTo(this, ahead) - this.length * 0.5 - ahead.length * 0.5;
      if (gap < C.stopDistance) target = 0;
      else if (gap < C.stopDistance * 2.4) target *= 0.45;
    }

    if (this.kind !== 'tram') {
      // I tram hanno la precedenza: solo le auto si fermano al rosso.
      const light = this.path.redLightAhead(this);
      if (light) target = 0;
    }

    // Il giocatore ha sempre ragione: il veicolo frena e suona.
    const p = game.player;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const dx = p.x - this.x, dz = p.z - this.z;
    const forward = dx * fx + dz * fz;
    const lateral = Math.abs(dx * fz - dz * fx);
    if (forward > 0 && forward < 3.2 && lateral < 1.3) {
      target = 0;
      if (this.hornCooldown <= 0 && this.speed > 0.6) {
        this.hornCooldown = 2.5;
        game.audio.horn(this.kind === 'tram');
      }
    }

    this.speed = damp(this.speed, target, target > this.speed ? 1.8 : 6, dt);
    this.t = (this.t + this.speed * dt) % this.path.total;
    this._place();
    game.grid.update(this);
  }

  _dirIndex(dirs) {
    let a = this.yaw % TAU;
    if (a < 0) a += TAU;
    return Math.round((a / TAU) * dirs) % dirs;
  }

  draw(r, game) {
    const A = game.assets;
    const set = this.kind === 'tram' ? A.trams : A.cars?.[this.variant];
    if (!set) return;
    const sp = set[this._dirIndex(set.length)];
    if (!sp) return;

    r.shadow(this.x, this.z, this.kind === 'tram' ? 1.15 : 0.62, 1);
    r.sprite(sp, this.x, 0, this.z, { depth: depthOf(0, this.z) });
    void clamp;
  }
}
