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
import { bakeMesh, bakeShadow, bakeGlow, makeCanvas } from './SpriteBaker.js';
import { PAL } from '../data/palette.js';
import * as Nature from '../models/nature.js';
import * as Build from '../models/buildings.js';
import { buildCharacter, buildCarriedLog, CHAR } from '../models/character.js';
import { rotY as rotateMeshY } from './Mesh.js';

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
};

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
      char: null, buildings: {}, fx: {},
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

    /* ------------------------------------------------------------ risorse */
    this._job(() => {
      A.logDrop = this._bakeProp(Nature.buildLogDrop(), 1.5);
      A.coin = this._bakeProp(Nature.buildCoin(), 1.5);
    });

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
      chop: [],   // [dir][frame]
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
    const idle = bakeMesh(
      buildCharacter({ yaw, action: 'idle', t: 0, ...opts }),
      { outline: 1.6 },
    );
    atlas.walk[d] = walk;
    atlas.chop[d] = chop;
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
