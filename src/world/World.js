/**
 * World.js — Generazione e gestione del mondo.
 *
 * - genera la mappa in modo deterministico a partire dal seed;
 * - tiene le entità in una griglia spaziale (culling + ricerche veloci);
 * - separa le entità STATICHE (nessun update) da quelle DINAMICHE.
 *
 * La struttura è pensata per crescere: nelle fasi successive basterà
 * aggiungere altri "biomi" e altre entità senza toccare il resto.
 */

import { CFG } from '../data/config.js';
import { Rand } from '../core/Rand.js';
import { SpatialGrid } from '../core/SpatialGrid.js';
import { Terrain } from './Terrain.js';
import { River } from './River.js';
import { StaticProp } from '../entities/Entity.js';
import { TreeEntity } from '../entities/TreeEntity.js';
import { BuildingEntity } from '../entities/BuildingEntity.js';
import { MerchantEntity } from '../entities/MerchantEntity.js';
import { WorkbenchEntity } from '../entities/WorkbenchEntity.js';
import { RockEntity } from '../entities/RockEntity.js';
import { BUILDINGS, BUILD_ORDER } from '../data/buildings.js';
import { PAL } from '../data/palette.js';

export class World {
  constructor(game) {
    this.game = game;
    this.grid = new SpatialGrid(CFG.world.cellSize);
    /** Entità che hanno bisogno di update() ogni frame. */
    this.dynamic = [];
    /** Entità con interfaccia nel mondo (pannelli). */
    this.uiEntities = [];
    this.visible = [];
    this.rnd = new Rand(CFG.world.seed);
    this.terrain = null;
    this.river = new River();
    /**
     * Sorgenti luminose: si accendono di notte. Alcune seguono un'entità
     * (i fari delle auto), quindi la posizione viene aggiornata prima del
     * disegno.
     */
    this.lights = [];
  }

  /**
   * Registra una luce.
   * @param {object} o { radius, alpha, flicker, cold, follow, sprite, offZ }
   */
  addLight(x, y, z, o = {}) {
    const L = {
      x, y, z,
      radius: o.radius ?? 1.6,
      alpha: o.alpha ?? 0.55,
      flicker: o.flicker ?? false,
      // `cold` = luce elettrica (lampioni, fari); altrimenti fiamma o finestra.
      cold: o.cold ?? false,
      seed: Math.random() * 10,
      follow: o.follow ?? null,
      offY: o.offY ?? 0,
      offZ: o.offZ ?? 0,
      sprite: o.sprite ?? null,
    };
    this.lights.push(L);
    return L;
  }

  /** Aggiorna le luci agganciate a un'entità (fari, lanterne portate). */
  syncLights() {
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const L = this.lights[i];
      if (!L.follow) continue;
      if (L.follow.dead) { this.lights.splice(i, 1); continue; }
      // i fari puntano in avanti rispetto al muso del veicolo
      const f = L.follow;
      const fx = Math.sin(f.yaw ?? 0), fz = Math.cos(f.yaw ?? 0);
      L.x = f.x + fx * L.offZ;
      L.z = f.z + fz * L.offZ;
      L.y = L.offY;
    }
  }

  add(e, dynamic = false) {
    this.grid.insert(e);
    if (dynamic || !e.static) this.dynamic.push(e);
    if (e.drawUI) this.uiEntities.push(e);
    return e;
  }

  /** Toglie definitivamente un'entità dal mondo (nemici abbattuti, ecc.). */
  remove(e) {
    this.grid.remove(e);
    let i = this.dynamic.indexOf(e);
    if (i >= 0) this.dynamic.splice(i, 1);
    i = this.uiEntities.indexOf(e);
    if (i >= 0) this.uiEntities.splice(i, 1);
    e.dead = true;
  }

  /**
   * Toglie un'entità dalla lista degli aggiornamenti lasciandola visibile:
   * lo usano gli arredi una volta finita l'animazione di comparsa, così
   * tornano a costare quanto una decorazione statica.
   */
  retire(e) {
    const i = this.dynamic.indexOf(e);
    if (i >= 0) this.dynamic.splice(i, 1);
  }

  /* ------------------------------------------------------- generazione */

  generate(assets, ppu) {
    const rnd = this.rnd;
    const W = CFG.world;
    this.terrain = new Terrain(ppu, W.seed);

    /* --- la radura iniziale e i sentieri --- */
    this.terrain.addDecal(0, 0, 3.8, PAL.dirt, 0.3);
    this.terrain.addDecal(0.6, 1.2, 2.4, PAL.dirtDark, 0.16);

    // punti chiave del villaggio di partenza
    this.hutSpot = { x: -6.4, z: 3.2 };
    this.merchantSpot = { x: 7.6, z: -1.6 };
    this.benchSpot = { x: 1.2, z: 8.4 };

    this.terrain.addPath(0, 0, this.hutSpot.x, this.hutSpot.z, 0.85);
    this.terrain.addPath(0, 0, this.merchantSpot.x, this.merchantSpot.z, 0.85);
    this.terrain.addPath(0, 0, this.benchSpot.x, this.benchSpot.z, 0.8);

    /* --- alberi --- */
    // Densità crescente verso l'esterno: la radura resta libera e il bosco
    // si infittisce, invitando naturalmente a esplorare.
    let placed = 0, guard = 0;
    while (placed < W.treeCount && guard++ < W.treeCount * 40) {
      const a = rnd.range(0, Math.PI * 2);
      const rr = Math.sqrt(rnd.next()) * W.radius;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (rr < W.clearingRadius) continue;
      // probabilità crescente con la distanza
      if (!rnd.chance(0.25 + (rr / W.radius) * 0.75)) continue;
      if (this._blocked(x, z, 1.25)) continue;

      const sp = rnd.pick(assets.trees);
      const t = new TreeEntity(
        x, z, sp,
        rnd.pick(assets.stumps),
        assets.saplings[0],
        rnd.range(0.88, 1.16),
      );
      this.add(t);
      placed++;
    }

    /* --- cespugli e sassi --- */
    for (let i = 0; i < W.bushCount; i++) {
      const [x, z] = this._scatter(rnd, 4.5);
      if (this._blocked(x, z, 0.8)) continue;
      this.add(new StaticProp(x, z, rnd.pick(assets.bushes), {
        solid: false, shadow: 0.34, scale: rnd.range(0.85, 1.2),
      }));
    }
    for (let i = 0; i < 26; i++) {
      const [x, z] = this._scatter(rnd, 7);
      if (this._blocked(x, z, 1.1)) continue;
      this.add(new StaticProp(x, z, rnd.pick(assets.rocks), {
        solid: true, radius: 0.5, shadow: 0.5, scale: rnd.range(0.85, 1.25),
      }));
    }

    /* --- massi di pietra (Fase 2): più fitti lontano dal villaggio --- */
    let rocks = 0, rockGuard = 0;
    while (rocks < W.rockCount && rockGuard++ < W.rockCount * 40) {
      const a = rnd.range(0, Math.PI * 2);
      const rr = Math.sqrt(rnd.next()) * W.radius;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (rr < 11) continue;                       // niente cave dentro il villaggio
      if (!rnd.chance(0.3 + (rr / W.radius) * 0.7)) continue;
      if (this._blocked(x, z, 1.4)) continue;
      this.add(new RockEntity(
        x, z, rnd.pick(assets.oreRocks), rnd.pick(assets.rubble),
        rnd.range(0.9, 1.2),
      ));
      rocks++;
    }

    /* --- vene di ferro: SOLO sulla sponda nord del fiume (Fase 3) ---
       È la ricompensa per aver costruito il ponte, quindi devono trovarsi
       tutte al di là dell'acqua. */
    let irons = 0, ironGuard = 0;
    while (irons < W.ironCount && ironGuard++ < W.ironCount * 60) {
      const a = rnd.range(0, Math.PI * 2);
      const rr = Math.sqrt(rnd.next()) * W.radius;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      // Oltre il fiume di almeno due unità: `isBeyond(x, z + m)` è il test
      // severo (con z - m sarebbe più permissivo, non meno).
      if (!this.river.isBeyond(x, z + 2)) continue;
      if (this._blocked(x, z, 1.5)) continue;
      this.add(new RockEntity(
        x, z, rnd.pick(assets.ironVeins), rnd.pick(assets.rubble),
        rnd.range(0.9, 1.15),
        {
          resource: 'iron',
          hits: CFG.harvest.ironHits,
          regrow: CFG.harvest.ironRegrowDelay,
          requiredPick: 2,
          hint: 'Serve il piccone d\'acciaio 🔨',
          chipColor: 'rgb(206,138,86)',
        },
      ));
      irons++;
    }

    /* --- filoni d'oro (Fase 4): rari e nel profondo della sponda nord --- */
    let golds = 0, goldGuard = 0;
    while (golds < W.goldCount && goldGuard++ < W.goldCount * 80) {
      const a = rnd.range(0, Math.PI * 2);
      const rr = Math.sqrt(rnd.next()) * W.radius;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      // molto oltre il fiume: l'oro va cercato
      if (!this.river.isBeyond(x, z + 8)) continue;
      if (this._blocked(x, z, 1.6)) continue;
      this.add(new RockEntity(
        x, z, rnd.pick(assets.goldVeins), rnd.pick(assets.rubble),
        rnd.range(0.9, 1.1),
        {
          resource: 'gold',
          hits: CFG.harvest.goldHits,
          regrow: CFG.harvest.goldRegrowDelay,
          requiredPick: 3,
          hint: 'Serve il piccone da minatore ⚱️',
          chipColor: 'rgb(246,202,74)',
        },
      ));
      golds++;
    }

    /* --- dettagli del terreno (nessuna collisione, nessun update) ---
       Le chiazze contengono già ciuffi, fiori e sassolini insieme: una sola
       sprite per una manciata di dettagli. */
    for (let i = 0; i < W.patchCount; i++) {
      const [x, z] = this._scatter(rnd, 0);
      this.add(new StaticProp(x, z, rnd.pick(assets.patches), {
        scale: rnd.range(0.8, 1.2), flip: rnd.chance(0.5),
      }));
    }
    for (let i = 0; i < W.flowerCount; i++) {
      const [x, z] = this._scatter(rnd, 0);
      this.add(new StaticProp(x, z, rnd.pick(assets.flowers), {
        scale: rnd.range(0.85, 1.15), flip: rnd.chance(0.5),
      }));
    }
    for (let i = 0; i < W.pebbleCount; i++) {
      const [x, z] = this._scatter(rnd, 0);
      this.add(new StaticProp(x, z, rnd.pick(assets.pebbles), {
        scale: rnd.range(0.8, 1.2), flip: rnd.chance(0.5),
      }));
    }

    /* --- il falò della radura: punto di riferimento --- */
    this.campfire = this.add(new StaticProp(0, 0, assets.buildings.campfire, {
      solid: true, radius: 0.75, shadow: 0.7,
    }));
    this.addLight(0, 0.4, 0, { radius: 1.8, alpha: 0.8, flicker: true });

    /* --- cantieri: uno per ogni edificio della progressione --- */
    this.buildings = {};
    for (const id of BUILD_ORDER) {
      const def = BUILDINGS[id];
      // Il ponte si aggancia al corso del fiume, che serpeggia.
      const z = def.onRiver ? this.river.centerAt(def.spot.x) : def.spot.z;
      const b = new BuildingEntity(def.spot.x, z, def, this.game);
      this.buildings[id] = this.add(b, true);
    }
    this.hut = this.buildings.hut;
    this.merchant = this.add(new MerchantEntity(
      this.merchantSpot.x, this.merchantSpot.z, this.game,
    ), true);
    this.workbench = this.add(new WorkbenchEntity(
      this.benchSpot.x, this.benchSpot.z, this.game,
    ), true);

    // cartelli indicatori
    this.add(new StaticProp(this.merchantSpot.x - 2.6, this.merchantSpot.z + 1.4,
      assets.buildings.signpost, { shadow: 0.24 }));

    return this;
  }

  /** Coordinate casuali dentro il raggio giocabile, oltre `minR` dal centro. */
  _scatter(rnd, minR) {
    const W = CFG.world;
    for (let i = 0; i < 12; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const rr = Math.sqrt(rnd.next()) * W.radius;
      if (rr >= minR) return [Math.cos(a) * rr, Math.sin(a) * rr];
    }
    return [rnd.sym(W.radius * 0.7), rnd.sym(W.radius * 0.7)];
  }

  /** True se qualcosa di ingombrante occupa già quel punto. */
  _blocked(x, z, r) {
    // il fiume e le sue rive non ospitano nulla
    const c = this.river.centerAt(x);
    if (Math.abs(z - c) < this.river.halfWidth + 1.2 + r) return true;
    const out = this._scratch || (this._scratch = []);
    this.grid.queryRadius(x, z, r + 1.2, out);
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      if (!e.solid && !(e instanceof TreeEntity)) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < r + e.radius * 0.8) return true;
    }
    // non ostruire i sentieri principali
    if (this._nearSpot(x, z, 3.2)) return true;
    return false;
  }

  _nearSpot(x, z, r) {
    const spots = this._spots || (this._spots = [
      this.hutSpot, this.merchantSpot, this.benchSpot, { x: 0, z: 0 },
      ...BUILD_ORDER.map((id) => BUILDINGS[id].spot),
    ]);
    for (const s of spots) {
      if (!s) continue;
      if (Math.hypot(s.x - x, s.z - z) < r) return true;
    }
    return false;
  }

  /* ------------------------------------------------------------ runtime */

  update(dt, game) {
    this.river.update(dt);
    const list = this.dynamic;
    for (let i = 0; i < list.length; i++) list[i].update(dt, game);
  }

  /**
   * Respinge un'entità fuori dall'acqua. Il ponte apre un varco, quindi
   * dopo averlo costruito si passa normalmente.
   */
  blockRiver(e) { return this.river.push(e); }

  /** Accoda al renderer tutte le entità inquadrate, ordinate per profondità. */
  draw(r, game, cam) {
    const b = cam.worldBounds(3);
    const vis = this.visible;
    this.grid.queryRect(b.x0, b.z0, b.x1, b.z1, vis);
    for (let i = 0; i < vis.length; i++) vis[i].draw(r, game);
    return vis.length;
  }

  drawUI(ctx, cam, dpr, game) {
    const list = this.uiEntities;
    for (let i = 0; i < list.length; i++) list[i].drawUI(ctx, cam, dpr, game);
  }
}
