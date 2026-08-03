/**
 * TrafficSystem.js — Il traffico della metropoli (Fase 5).
 *
 * Gestisce due anelli chiusi: quello stradale (auto) e quello tranviario.
 * Un anello è descritto da una lista di punti; la posizione di un veicolo è
 * una sola coordinata curvilinea, quindi:
 *   - trovare "chi mi precede" è un confronto fra numeri;
 *   - i semafori sono punti fissi su quella stessa coordinata.
 *
 * È la struttura più semplice che dia comunque un traffico credibile:
 * code al semaforo, distanze di sicurezza, tram che ha la precedenza.
 */

import { CFG } from '../data/config.js';
import { VehicleEntity } from '../entities/VehicleEntity.js';
import { StaticProp } from '../entities/Entity.js';
import { TAU } from '../core/MathUtils.js';
import { fxRand } from '../core/Rand.js';

/** Un anello chiuso di punti, con ricerca per lunghezza d'arco. */
class RingPath {
  constructor(points) {
    this.points = points;
    this.lengths = [];
    this.total = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const l = Math.hypot(b.x - a.x, b.z - a.z);
      this.lengths.push(l);
      this.total += l;
    }
    this.vehicles = [];
    this.lights = [];
  }

  /** Punto e orientamento a distanza `s` dall'inizio del percorso. */
  at(s) {
    let d = s % this.total;
    if (d < 0) d += this.total;
    for (let i = 0; i < this.points.length; i++) {
      if (d <= this.lengths[i]) {
        const a = this.points[i], b = this.points[(i + 1) % this.points.length];
        const t = this.lengths[i] > 0 ? d / this.lengths[i] : 0;
        const dx = b.x - a.x, dz = b.z - a.z;
        return {
          x: a.x + dx * t,
          z: a.z + dz * t,
          yaw: Math.atan2(dx, dz),
        };
      }
      d -= this.lengths[i];
    }
    const a = this.points[0];
    return { x: a.x, z: a.z, yaw: 0 };
  }

  /** Distanza in avanti da `from` a `to` lungo l'anello. */
  gapTo(from, to) {
    let g = to.t - from.t;
    if (g < 0) g += this.total;
    return g;
  }

  /** Il veicolo immediatamente davanti (o null se la strada è libera). */
  vehicleAhead(v) {
    let best = null, bestGap = Infinity;
    for (const o of this.vehicles) {
      if (o === v) continue;
      const g = this.gapTo(v, o);
      if (g > 0 && g < bestGap) { bestGap = g; best = o; }
    }
    return bestGap < 14 ? best : null;
  }

  /** Semaforo rosso entro la distanza di arresto, se c'è. */
  redLightAhead(v) {
    const C = CFG.traffic;
    for (const l of this.lights) {
      if (l.state === 0) continue;                 // verde
      let g = l.t - v.t;
      if (g < 0) g += this.total;
      // ci si ferma solo se il rosso è appena davanti
      if (g > 0 && g < C.stopDistance + (l.state === 2 ? 1.4 : 0.4)) return l;
    }
    return null;
  }
}

export class TrafficSystem {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.tramEnabled = false;
    this.roadPath = null;
    this.tramPath = null;
    this.time = 0;
    this.lightProps = [];
  }

  get carCount() { return this.roadPath ? this.roadPath.vehicles.length : 0; }
  get tramCount() { return this.tramPath ? this.tramPath.vehicles.length : 0; }

  /** Genera un anello poligonale, leggermente irregolare. */
  _ring(radius, n, jitter = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const r = radius + (jitter ? Math.sin(i * 1.7) * jitter : 0);
      pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
    }
    return new RingPath(pts);
  }

  /* ------------------------------------------------------------- strade */

  /** Attiva la circolazione: chiamato quando arriva il grattacielo. */
  enableRoads() {
    if (this.enabled) return;
    this.enabled = true;
    const C = CFG.traffic;
    const g = this.game;

    this.roadPath = this._ring(C.ringRadius, C.ringPoints, 0.6);

    // asfalto sotto l'anello, con la segnaletica
    const p = this.roadPath.points;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      // passo stretto: la carreggiata dev'essere continua, non a chiazze
      g.world.terrain.addPath(a.x, a.z, b.x, b.z, 1.9, 1.15, PAL_ASPHALT, 0.95, 'asphalt');
    }

    // quattro semafori ai punti cardinali dell'anello
    const quarter = this.roadPath.total / 4;
    for (let i = 0; i < 4; i++) {
      const t = quarter * i + quarter * 0.5;
      const pos = this.roadPath.at(t);
      const light = { t, state: 0, phase: i % 2, x: pos.x, z: pos.z, prop: null };
      // il semaforo è anche un oggetto visibile: gli diamo una sprite
      light.prop = g.world.add(new StaticProp(pos.x, pos.z, g.assets.lights[0], {
        solid: true, radius: 0.24, shadow: 0.26,
      }));
      this.lightProps.push(light);
      this.roadPath.lights.push(light);
    }

    // Marciapiedi: punti d'interesse lungo tutto l'anello. Senza, gli
    // abitanti restano ammassati nelle poche piazze e la città sembra
    // affollata in un punto solo invece che viva ovunque.
    const walk = this.roadPath.total / 14;
    for (let i = 0; i < 14; i++) {
      const q = this.roadPath.at(walk * i);
      const nx = q.x / Math.hypot(q.x, q.z || 1);
      const nz = q.z / Math.hypot(q.x || 1, q.z);
      g.village.addPOI(q.x + nx * 2.2, q.z + nz * 2.2, 'work', 1.4);
    }

    // prime automobili, distribuite lungo l'anello
    for (let i = 0; i < 4; i++) this.spawnCar();
    g.hud.toast('Le strade si riempiono di traffico 🚗');
  }

  spawnCar() {
    const C = CFG.traffic;
    if (!this.roadPath || this.roadPath.vehicles.length >= C.maxCars) return null;
    const g = this.game;
    const variants = g.assets.cars?.length ?? 0;
    if (!variants) return null;

    // inserita nel punto più libero dell'anello
    const n = this.roadPath.vehicles.length;
    const t = (this.roadPath.total / C.maxCars) * n + fxRand.range(0, 1.5);

    const v = new VehicleEntity(this.roadPath, {
      kind: 'car',
      variant: (Math.random() * variants) | 0,
      speed: C.carSpeed * fxRand.range(0.85, 1.15),
      t,
    }, g);
    this.roadPath.vehicles.push(v);
    g.world.add(v, true);
    return v;
  }

  /* --------------------------------------------------------------- tram */

  /** Attiva la linea tranviaria: chiamato quando arriva la stazione. */
  enableTram() {
    if (this.tramEnabled) return;
    this.tramEnabled = true;
    const C = CFG.traffic;
    const g = this.game;

    this.tramPath = this._ring(C.tramRadius, C.tramPoints, 0.9);
    // i binari: traversine e rotaie disegnate nel terreno
    const p = this.tramPath.points;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      g.world.terrain.addRails(a.x, a.z, b.x, b.z);
    }

    for (let i = 0; i < C.maxTrams; i++) {
      const v = new VehicleEntity(this.tramPath, {
        kind: 'tram',
        speed: C.tramSpeed * fxRand.range(0.95, 1.05),
        t: (this.tramPath.total / C.maxTrams) * i,
      }, g);
      this.tramPath.vehicles.push(v);
      g.world.add(v, true);
    }
    g.hud.toast('La linea del tram è in servizio 🚋');
  }

  /* ------------------------------------------------------------- update */

  update(dt) {
    if (!this.enabled) return;
    this.time += dt;

    // Ciclo dei semafori: due gruppi in opposizione, come a un incrocio vero.
    const C = CFG.traffic;
    const phase = (this.time % C.lightCycle) / C.lightCycle;
    for (const l of this.lightProps) {
      const local = (phase + l.phase * 0.5) % 1;
      // Più verde che rosso: con cicli simmetrici metà del traffico stava
      // sempre fermo e la città sembrava paralizzata.
      const st = local < 0.6 ? 0 : local < 0.68 ? 1 : 2;
      if (st !== l.state) {
        l.state = st;
        if (l.prop) l.prop.sprite = this.game.assets.lights[st];
      }
    }
  }

  /** Ripristino da salvataggio: nessun messaggio, nessuna fanfara. */
  restore(roads, tram) {
    if (roads) this.enableRoads();
    if (tram) this.enableTram();
  }
}

/* Colore dell'asfalto, importato qui per non creare una dipendenza circolare
   fra sistema e palette dei modelli. */
const PAL_ASPHALT = [88, 90, 98];
