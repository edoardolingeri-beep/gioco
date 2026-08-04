/**
 * AssetForge.js — "Fonderia" delle sprite.
 *
 * Costruisce e rasterizza TUTTE le mesh del gioco all'avvio, spalmando il
 * lavoro su più frame (budget in millisecondi) così la schermata di
 * caricamento resta fluida e mostra una barra di progresso reale.
 *
 * Il risultato è `Assets`, un dizionario di sprite pronte per il blit.
 */

import { CFG } from '../data/config.js';
import { Rand } from '../core/Rand.js';
import { bakeMesh, bakeShadow, bakeGlow, bakeLightGlow, makeCanvas } from './SpriteBaker.js';
import { PAL } from '../data/palette.js';
import * as Nature from '../models/nature.js';
import * as Build from '../models/buildings.js';
import * as Village from '../models/village.js';
import * as Town from '../models/town.js';
import * as City from '../models/city.js';
import * as Metro from '../models/metro.js';
import { buildCharacter, buildCarriedLog, CHAR, TOOL } from '../models/character.js';
import { buildWolf, buildBear, buildAlertMark, ENEMY } from '../models/enemies.js';
import { rotY as rotateMeshY } from './Mesh.js';

/**
 * Varianti di vestiario degli abitanti. Riusiamo lo stesso rig del
 * protagonista cambiando i colori: tre atlanti bastano a dare l'impressione
 * di una popolazione varia, senza far esplodere la memoria.
 */
const NPC_LOOKS = [
  { shirt: PAL.npcShirtA, shirtAlt: PAL.roofRedD, pants: PAL.pants,
    hair: PAL.npcHairA, skin: PAL.npcSkinA },
  { shirt: PAL.npcShirtB, shirtAlt: PAL.leafB, pants: PAL.belt,
    hair: PAL.npcHairB, skin: PAL.npcSkinB },
  { shirt: PAL.npcShirtC, shirtAlt: PAL.shirtAlt, pants: PAL.stoneDark,
    hair: PAL.npcHairC, skin: PAL.npcSkinC },
];

/** Gli abitanti hanno meno direzioni e frame: sono comprimari. */
const NPC_DIRS = 8;
const NPC_FRAMES = 6;

/** Orientamenti della staccionata (mezzo giro basta: è simmetrica). */
const FENCE_DIRS = 12;
export { FENCE_DIRS };

/** Varianti pre-generate di ogni elemento naturale. */
const VARIANTS = {
  tree: 12,
  stump: 3,
  bush: 8,
  tuft: 10,
  flower: 8,
  pebble: 6,
  rock: 5,
  patch: 16,   // chiazze di prato pre-composte (vedi buildGrassPatch)
  oreRock: 6,  // massi raccoglibili
  rubble: 3,
  ironVein: 5, // vene di ferro (Fase 3)
  goldVein: 4, // filoni d'oro (Fase 4)
};

/** Angoli pre-cotti delle pale del mulino: bastano per un moto fluido. */
const MILL_ANGLES = 16;

/** Fotogrammi dei getti della fontana. */
const JET_FRAMES = 7;

/** Direzioni dei veicoli. Il tram è grande: gliene bastano meno. */
const CAR_DIRS = 16;
const TRAM_DIRS = 12;

/** Modelli di automobile in circolazione. */
const CAR_MODELS = [
  { color: PAL.carRed, kind: 0 },
  { color: PAL.carBlue, kind: 0 },
  { color: PAL.carWhite, kind: 0 },
  { color: PAL.carYellow, kind: 1 },
];

/**
 * Applica una tinta uniforme a una sprite già cotta (per i "fantasmi"
 * degli edifici in costruzione).
 */
export function tintSprite(src, css, alpha, globalAlpha = 1) {
  const c = makeCanvas(src.w, src.h);
  const ctx = c.getContext('2d');
  ctx.globalAlpha = globalAlpha;
  ctx.drawImage(src.canvas, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, src.w, src.h);
  return { canvas: c, w: src.w, h: src.h, ax: src.ax, ay: src.ay };
}

export class AssetForge {
  constructor() {
    /** @type {Record<string, any>} */
    this.assets = {
      trees: [], stumps: [], saplings: [], bushes: [],
      tufts: [], flowers: [], pebbles: [], rocks: [], patches: [],
      oreRocks: [], rubble: [], ironVeins: [], goldVeins: [],
      char: null, wolf: null, npc: [],
      buildings: {}, village: {}, fx: {},
      cars: [], trams: [], lights: [],
    };
    this.jobs = [];
    this.done = 0;
    this.rnd = new Rand(CFG.world.seed ^ 0x9e3779b9);
    this._buildJobList();
  }

  get total() { return this.jobs.length; }
  get progress() { return this.total ? this.done / this.total : 1; }
  get finished() { return this.done >= this.total; }

  /** Aggiunge un job alla coda. */
  _job(fn) { this.jobs.push(fn); }

  _buildJobList() {
    const A = this.assets;
    const rnd = this.rnd;

    /* ---------------------------------------------------------- effetti */
    this._job(() => {
      A.fx.shadow = bakeShadow(128);
      A.fx.glowWarm = bakeGlow(96, [255, 214, 140], 0.35);
      A.fx.glowGold = bakeGlow(72, [255, 206, 84], 0.3);
      A.fx.spark = bakeGlow(28, [255, 255, 255], 0.25);
      A.fx.ring = this._bakeRing(160);
      // Aloni delle sorgenti luminose: uno caldo (fuoco, finestre) e uno
      // freddo (lampioni elettrici, fari).
      A.fx.lightWarm = bakeLightGlow(160, [255, 206, 138], 2.6);
      A.fx.lightCold = bakeLightGlow(160, [206, 226, 255], 2.8);
    });

    /* ------------------------------------------------------- personaggio */
    // L'atlante del personaggio è il pezzo più pesante: lo dividiamo per
    // direzione, così ogni job resta breve.
    this._job(() => { A.char = this._newCharAtlas(); });
    for (let d = 0; d < CHAR.dirs; d++) {
      this._job(() => this._bakeCharDir(A.char, d, { axeLevel: 1, bagLevel: 1 }));
    }
    // Il tronco trasportato viene cotto in tutte le direzioni: la pila sulla
    // schiena ruota insieme al personaggio senza costare nulla a runtime.
    this._job(() => {
      A.carriedLogs = [];
      for (let d = 0; d < CHAR.dirs; d++) {
        const m = buildCarriedLog();
        rotateMeshY(m, (d / CHAR.dirs) * Math.PI * 2);
        A.carriedLogs.push(bakeMesh(m, { outline: 1.4 }));
      }
      A.carriedLog = A.carriedLogs[0];
    });

    /* --------------------------------------------------------- vegetazione */
    for (let i = 0; i < VARIANTS.tree; i++) {
      this._job(() => {
        const t = Nature.buildTree(rnd);
        A.trees.push(this._bakeProp(t, 2));
      });
    }
    this._job(() => {
      for (let i = 0; i < VARIANTS.stump; i++) A.stumps.push(this._bakeProp(Nature.buildStump(rnd), 1.5));
      A.saplings.push(this._bakeProp(Nature.buildSapling(rnd), 1.5));
    });
    this._job(() => {
      for (let i = 0; i < VARIANTS.bush; i++) A.bushes.push(this._bakeProp(Nature.buildBush(rnd), 1.5));
    });
    this._job(() => {
      for (let i = 0; i < VARIANTS.tuft; i++) A.tufts.push(this._bakeProp(Nature.buildTuft(rnd), 0));
      for (let i = 0; i < VARIANTS.flower; i++) A.flowers.push(this._bakeProp(Nature.buildFlower(rnd), 0));
    });
    this._job(() => {
      for (let i = 0; i < VARIANTS.pebble; i++) A.pebbles.push(this._bakeProp(Nature.buildPebble(rnd), 1));
      for (let i = 0; i < VARIANTS.rock; i++) A.rocks.push(this._bakeProp(Nature.buildRock(rnd), 1.5));
    });
    // Le chiazze di prato sono più pesanti da cuocere: un job ogni due.
    for (let k = 0; k < VARIANTS.patch; k += 2) {
      this._job(() => {
        for (let i = 0; i < 2; i++) A.patches.push(this._bakeProp(Nature.buildGrassPatch(rnd), 0));
      });
    }

    /* --------------------------------------------------- massi di pietra */
    this._job(() => {
      for (let i = 0; i < VARIANTS.oreRock; i++) {
        A.oreRocks.push(this._bakeProp(Nature.buildOreRock(rnd), 1.8));
      }
      for (let i = 0; i < VARIANTS.rubble; i++) {
        A.rubble.push(this._bakeProp(Nature.buildRubble(rnd), 1.2));
      }
    });

    /* ------------------------------------------------------------ risorse */
    this._job(() => {
      for (let i = 0; i < VARIANTS.ironVein; i++) {
        A.ironVeins.push(this._bakeProp(Town.buildIronVein(rnd), 1.8));
      }
      for (let i = 0; i < VARIANTS.goldVein; i++) {
        A.goldVeins.push(this._bakeProp(City.buildGoldVein(rnd), 1.8));
      }
    });

    this._job(() => {
      A.logDrop = this._bakeProp(Nature.buildLogDrop(), 1.5);
      A.stoneDrop = this._bakeProp(Nature.buildStoneDrop(), 1.5);
      A.ironDrop = this._bakeProp(Town.buildIronDrop(), 1.5);
      A.goldDrop = this._bakeProp(City.buildGoldDrop(), 1.5);
      A.fishDrop = this._bakeProp(Nature.buildFishDrop(), 1.5);
      A.coin = this._bakeProp(Nature.buildCoin(), 1.5);
      A.alertMark = this._bakeProp(buildAlertMark(), 1.5);
    });
    this._job(() => {
      A.carriedStones = [];
      A.carriedIrons = [];
      A.carriedGolds = [];
      A.carriedFishes = [];
      for (let d = 0; d < CHAR.dirs; d++) {
        const a = (d / CHAR.dirs) * Math.PI * 2;
        const st = Nature.buildCarriedStone();
        rotateMeshY(st, a);
        A.carriedStones.push(bakeMesh(st, { outline: 1.4 }));
        const ir = Town.buildCarriedIron();
        rotateMeshY(ir, a);
        A.carriedIrons.push(bakeMesh(ir, { outline: 1.4 }));
        const go = City.buildCarriedGold();
        rotateMeshY(go, a);
        A.carriedGolds.push(bakeMesh(go, { outline: 1.4 }));
        const fi = Nature.buildCarriedFish();
        rotateMeshY(fi, a);
        A.carriedFishes.push(bakeMesh(fi, { outline: 1.4 }));
      }
    });

    /* -------------------------------------------------------------- lupi */
    this._job(() => { A.wolf = this._newWolfAtlas(); });
    for (let d = 0; d < ENEMY.dirs; d++) {
      this._job(() => this._bakeWolfDir(A.wolf, d));
    }

    /* -------------------------------------------------------------- orsi */
    this._job(() => { A.bear = this._newWolfAtlas(); });
    for (let d = 0; d < ENEMY.dirs; d++) {
      this._job(() => this._bakeBearDir(A.bear, d));
    }

    /* ---------------------------------------------------------- abitanti */
    for (let v = 0; v < NPC_LOOKS.length; v++) {
      this._job(() => { A.npc[v] = this._newNPCAtlas(); });
      for (let d = 0; d < NPC_DIRS; d += 2) {
        const dd = d;
        this._job(() => {
          this._bakeNPCDir(A.npc[v], dd, NPC_LOOKS[v]);
          this._bakeNPCDir(A.npc[v], dd + 1, NPC_LOOKS[v]);
        });
      }
    }

    /* ----------------------------------------------------------- edifici */
    this._job(() => {
      A.buildings.hut = this._bakeProp(Build.buildHut(), 2);
      A.buildings.hutGhost = tintSprite(A.buildings.hut, '#8ad4ff', 0.82, 0.9);
    });
    this._job(() => { A.buildings.stall = this._bakeProp(Build.buildMerchantStall(), 2); });
    this._job(() => { A.buildings.workbench = this._bakeProp(Build.buildWorkbench(), 2); });
    this._job(() => {
      A.buildings.signpost = this._bakeProp(Build.buildSignpost(), 1.5);
      A.buildings.campfire = this._bakeProp(Build.buildCampfire(), 1.5);
    });

    /* ------------------------------------------------- edifici di Fase 2 */
    const phase2 = [
      ['sawmill', Village.buildSawmill],
      ['quarry', Village.buildQuarry],
      ['house', Village.buildHouse],
      ['warehouse', Village.buildWarehouse],
      ['guardTower', Village.buildGuardTower],
    ];
    for (const [id, fn] of phase2) {
      this._job(() => {
        A.buildings[id] = this._bakeProp(fn(), 2);
        A.buildings[id + 'Ghost'] = tintSprite(A.buildings[id], '#8ad4ff', 0.82, 0.9);
      });
    }

    /* ------------------------------------------------- edifici di Fase 3 */
    this._job(() => {
      A.buildings.bridge = this._bakeProp(Town.buildBridge(), 2);
      A.buildings.bridgeGhost = tintSprite(A.buildings.bridge, '#8ad4ff', 0.82, 0.9);
    });
    this._job(() => {
      A.buildings.mill = this._bakeProp(Town.buildMillBody(), 2);
      A.buildings.millGhost = tintSprite(A.buildings.mill, '#8ad4ff', 0.82, 0.9);
    });
    this._job(() => {
      A.buildings.smithy = this._bakeProp(Town.buildSmithy(), 2);
      A.buildings.smithyGhost = tintSprite(A.buildings.smithy, '#8ad4ff', 0.82, 0.9);
    });
    // Le pale del mulino, cotte in più angoli: girano davvero.
    for (let k = 0; k < MILL_ANGLES; k += 4) {
      this._job(() => {
        A.millSails = A.millSails || [];
        for (let i = k; i < Math.min(k + 4, MILL_ANGLES); i++) {
          const m = Town.buildMillSails((i / MILL_ANGLES) * Math.PI / 2);
          A.millSails[i] = bakeMesh(m, { outline: 1.5 });
        }
      });
    }

    /* ------------------------------------------------- edifici di Fase 4 */
    const phase4 = [
      ['townhall', City.buildTownHall],
      ['shops', City.buildShops],
      ['bank', City.buildBank],
      ['hospital', City.buildHospital],
      ['fountain', City.buildFountain],
    ];
    for (const [id, fn] of phase4) {
      this._job(() => {
        A.buildings[id] = this._bakeProp(fn(), 2);
        A.buildings[id + 'Ghost'] = tintSprite(A.buildings[id], '#8ad4ff', 0.82, 0.9);
      });
    }
    // I getti della fontana: pochi fotogrammi in ciclo continuo.
    this._job(() => {
      A.fountainJets = [];
      for (let i = 0; i < JET_FRAMES; i++) {
        A.fountainJets.push(bakeMesh(City.buildFountainJets(i / JET_FRAMES), { outline: 1.2 }));
      }
    });

    /* ------------------------------------------------- edifici di Fase 5 */
    const phase5 = [
      ['skyscraperA', () => Metro.buildSkyscraper({ h: 5.6, w: 2.5, d: 2.0, style: 0 })],
      ['skyscraperB', () => Metro.buildSkyscraper({ h: 7.0, w: 2.2, d: 1.9, style: 2 })],
      ['station', Metro.buildStation],
      ['factory', Metro.buildFactory],
      ['airport', Metro.buildAirport],
    ];
    for (const [id, fn] of phase5) {
      this._job(() => {
        A.buildings[id] = this._bakeProp(fn(), 2);
        A.buildings[id + 'Ghost'] = tintSprite(A.buildings[id], '#8ad4ff', 0.82, 0.9);
      });
    }

    /* --------------------------------------------------------- traffico */
    // Auto e tram sono cotti in tutte le direzioni: a runtime il veicolo
    // sceglie la sprite in base al proprio orientamento, come il giocatore.
    for (let m = 0; m < CAR_MODELS.length; m++) {
      this._job(() => {
        const set = [];
        for (let d = 0; d < CAR_DIRS; d++) {
          const mesh = Metro.buildCar(CAR_MODELS[m].color, CAR_MODELS[m].kind);
          rotateMeshY(mesh, (d / CAR_DIRS) * Math.PI * 2);
          set.push(bakeMesh(mesh, { outline: 1.5 }));
        }
        A.cars[m] = set;
      });
    }
    for (let k = 0; k < TRAM_DIRS; k += 4) {
      this._job(() => {
        for (let d = k; d < Math.min(k + 4, TRAM_DIRS); d++) {
          const mesh = Metro.buildTram();
          rotateMeshY(mesh, (d / TRAM_DIRS) * Math.PI * 2);
          A.trams[d] = bakeMesh(mesh, { outline: 1.6 });
        }
      });
    }
    this._job(() => {
      for (let st = 0; st < 3; st++) {
        A.lights.push(this._bakeProp(Metro.buildTrafficLight(st), 1.5));
      }
      A.village.tramStop = this._bakeProp(Metro.buildTramStop(), 1.4);
      A.village.kiosk = this._bakeProp(Metro.buildKiosk(), 1.6);
    });

    /* ------------------------------------------------ arredi della città */
    this._job(() => {
      A.village.cityLamp = this._bakeProp(City.buildCityLamp(), 1.5);
      A.village.cityBench = this._bakeProp(City.buildCityBench(), 1.5);
      A.village.bin = this._bakeProp(City.buildBin(), 1.4);
      A.village.hedge = this._bakeProp(City.buildHedge(), 1.5);
    });
    this._job(() => {
      A.village.statue = this._bakeProp(City.buildStatue(), 1.8);
      A.village.flowerBed = this._bakeProp(City.buildFlowerBed(rnd), 1.4);
    });

    /* ----------------------------------------------- arredi del paese */
    this._job(() => {
      A.village.wagon = this._bakeProp(Town.buildWagon(), 1.6);
      A.village.trough = this._bakeProp(Town.buildTrough(), 1.6);
      A.village.lamp = this._bakeProp(Town.buildLamp(), 1.5);
    });

    /* --------------------------------------------- arredi del villaggio */
    // La staccionata va cotta in più orientamenti: solo così il recinto può
    // seguire davvero il perimetro del villaggio invece di restare allineato
    // a un unico asse.
    this._job(() => {
      A.village.fences = [];
      for (let d = 0; d < FENCE_DIRS; d++) {
        const m = Village.buildFence();
        rotateMeshY(m.mesh, (d / FENCE_DIRS) * Math.PI);
        A.village.fences.push(this._bakeProp(m, 1.5));
      }
      A.village.fence = A.village.fences[0];
      // Anche l'arco del cancello va cotto sia orizzontale che verticale:
      // usato con un solo orientamento, sui lati est/ovest del recinto
      // (verticali) restava comunque disegnato per traverso, come una
      // croce senza senso incastrata nella staccionata.
      A.village.gates = [0, Math.PI / 2].map((rot) => {
        const m = Village.buildGate();
        rotateMeshY(m.mesh, rot);
        return this._bakeProp(m, 1.8);
      });
      A.village.gate = A.village.gates[0];
      A.village.bench = this._bakeProp(Village.buildBench(), 1.5);
    });
    this._job(() => {
      A.village.well = this._bakeProp(Village.buildWell(), 1.8);
      A.village.cart = this._bakeProp(Village.buildCart(), 1.6);
      A.village.brazier = this._bakeProp(Village.buildBrazier(), 1.5);
      A.village.garden = this._bakeProp(Village.buildGarden(rnd), 1.2);
    });
  }

  /* -------------------------------------------------------- atlante lupo */

  _newWolfAtlas() {
    return { dirs: ENEMY.dirs, walk: [], attack: [], idle: [] };
  }

  _bakeWolfDir(atlas, d) {
    const yaw = (d / ENEMY.dirs) * Math.PI * 2;
    const walk = [];
    for (let f = 0; f < ENEMY.walkFrames; f++) {
      walk.push(bakeMesh(buildWolf({ yaw, action: 'walk', t: f / ENEMY.walkFrames }),
        { outline: 1.5 }));
    }
    const attack = [];
    for (let f = 0; f < ENEMY.attackFrames; f++) {
      attack.push(bakeMesh(
        buildWolf({ yaw, action: 'attack', t: f / (ENEMY.attackFrames - 1) }),
        { outline: 1.5 },
      ));
    }
    atlas.walk[d] = walk;
    atlas.attack[d] = attack;
    atlas.idle[d] = bakeMesh(buildWolf({ yaw, action: 'idle', t: 0 }), { outline: 1.5 });
  }

  /* -------------------------------------------------------- atlante orso */

  _bakeBearDir(atlas, d) {
    const yaw = (d / ENEMY.dirs) * Math.PI * 2;
    const walk = [];
    for (let f = 0; f < ENEMY.walkFrames; f++) {
      walk.push(bakeMesh(buildBear({ yaw, action: 'walk', t: f / ENEMY.walkFrames }),
        { outline: 1.6 }));
    }
    const attack = [];
    for (let f = 0; f < ENEMY.attackFrames; f++) {
      attack.push(bakeMesh(
        buildBear({ yaw, action: 'attack', t: f / (ENEMY.attackFrames - 1) }),
        { outline: 1.6 },
      ));
    }
    atlas.walk[d] = walk;
    atlas.attack[d] = attack;
    atlas.idle[d] = bakeMesh(buildBear({ yaw, action: 'idle', t: 0 }), { outline: 1.6 });
  }

  /* ---------------------------------------------------- atlante abitanti */

  _newNPCAtlas() {
    return { dirs: NPC_DIRS, frames: NPC_FRAMES, walk: [], idle: [] };
  }

  _bakeNPCDir(atlas, d, look) {
    if (d >= NPC_DIRS) return;
    const yaw = (d / NPC_DIRS) * Math.PI * 2;
    const opts = { ...look, withTool: false };
    const walk = [];
    for (let f = 0; f < NPC_FRAMES; f++) {
      walk.push(bakeMesh(
        buildCharacter({ yaw, action: 'walk', t: f / NPC_FRAMES, ...opts }),
        { outline: 1.5 },
      ));
    }
    atlas.walk[d] = walk;
    atlas.idle[d] = bakeMesh(
      buildCharacter({ yaw, action: 'idle', t: 0, ...opts }), { outline: 1.5 },
    );
  }

  /* ------------------------------------------------------------ helpers */

  _bakeProp(def, outline) {
    const s = bakeMesh(def.mesh, { outline });
    s.height = def.height;
    s.radius = def.radius;
    return s;
  }

  _bakeRing(size) {
    const c = makeCanvas(size, Math.round(size * 0.6));
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.translate(size / 2, size * 0.3);
    ctx.scale(1, 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, size / 2 - 6, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
    return { canvas: c, w: size, h: Math.round(size * 0.6), ax: size / 2, ay: size * 0.3 };
  }

  /* -------------------------------------------------- atlante personaggio */

  _newCharAtlas() {
    return {
      dirs: CHAR.dirs,
      walk: [],   // [dir][frame]
      chop: [],   // [dir][frame]  (ascia)
      mine: [],   // [dir][frame]  (piccone)
      idle: [],   // [dir]
      opts: null,
    };
  }

  /** Cuoce tutti i frame di UNA direzione (job di dimensione ragionevole). */
  _bakeCharDir(atlas, d, opts) {
    const yaw = (d / CHAR.dirs) * Math.PI * 2;
    const walk = [];
    for (let f = 0; f < CHAR.walkFrames; f++) {
      walk.push(bakeMesh(
        buildCharacter({ yaw, action: 'walk', t: f / CHAR.walkFrames, ...opts }),
        { outline: 1.6 },
      ));
    }
    const chop = [];
    for (let f = 0; f < CHAR.chopFrames; f++) {
      chop.push(bakeMesh(
        buildCharacter({ yaw, action: 'chop', t: f / (CHAR.chopFrames - 1), ...opts }),
        { outline: 1.6 },
      ));
    }
    // Stessa animazione ma con il piccone in mano: serve solo per i frame di
    // colpo, perché è lì che l'attrezzo si vede davvero.
    const mine = [];
    for (let f = 0; f < CHAR.chopFrames; f++) {
      mine.push(bakeMesh(
        buildCharacter({
          yaw, action: 'chop', t: f / (CHAR.chopFrames - 1),
          ...opts, tool: TOOL.PICK,
        }),
        { outline: 1.6 },
      ));
    }

    const idle = bakeMesh(
      buildCharacter({ yaw, action: 'idle', t: 0, ...opts }),
      { outline: 1.6 },
    );
    atlas.walk[d] = walk;
    atlas.chop[d] = chop;
    atlas.mine[d] = mine;
    atlas.idle[d] = idle;
    atlas.opts = opts;
  }

  /**
   * Avanza la cottura per al massimo `budgetMs` millisecondi.
   * @returns {boolean} true quando ha finito
   */
  step(budgetMs = 12) {
    const t0 = performance.now();
    while (this.done < this.jobs.length) {
      this.jobs[this.done]();
      this.done++;
      if (performance.now() - t0 > budgetMs) break;
    }
    return this.finished;
  }

  /** Cuoce tutto in un colpo solo (utile nei test). */
  all() { while (!this.finished) this.step(1e9); return this.assets; }
}

/**
 * Ri-cottura incrementale dell'atlante del personaggio dopo un potenziamento.
 * Gira in background: l'atlante vecchio resta visibile finché il nuovo non è
 * completo, quindi non c'è alcuno scatto.
 */
export class CharacterRebaker {
  constructor(forge, assets, opts, onDone) {
    this.forge = forge;
    this.assets = assets;
    this.opts = opts;
    this.onDone = onDone;
    this.atlas = forge._newCharAtlas();
    this.d = 0;
  }

  step(budgetMs = 6) {
    const t0 = performance.now();
    while (this.d < CHAR.dirs) {
      this.forge._bakeCharDir(this.atlas, this.d, this.opts);
      this.d++;
      if (performance.now() - t0 > budgetMs) break;
    }
    if (this.d >= CHAR.dirs) {
      this.assets.char = this.atlas;
      this.onDone?.();
      return true;
    }
    return false;
  }
}

export { PAL };
