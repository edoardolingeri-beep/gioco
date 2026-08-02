/**
 * VillageSystem.js — L'evoluzione del mondo.
 *
 * È il cuore concettuale del gioco: il villaggio ha un LIVELLO che sale ogni
 * volta che completi una costruzione, e ogni livello trasforma il paesaggio.
 * La trasformazione è graduale e visibile: gli arredi spuntano uno alla volta
 * con un ritardo scalato, così sembra che il villaggio "cresca" davvero.
 *
 * Gestisce anche i PUNTI DI INTERESSE: le mete che gli abitanti useranno per
 * le loro routine. Più il villaggio cresce, più cose hanno da fare.
 *
 * La struttura è già pronta per le fasi successive: basta aggiungere voci a
 * `STAGES` con altri arredi e altri abitanti.
 */

import { CFG } from '../data/config.js';
import { GrowProp } from '../entities/GrowProp.js';
import { NPCEntity } from '../entities/NPCEntity.js';
import { PAL } from '../data/palette.js';
import { FENCE_DIRS } from '../render/AssetForge.js';
import { fxRand } from '../core/Rand.js';
import { TAU } from '../core/MathUtils.js';

/**
 * Cosa compare a ogni livello del villaggio.
 * `props` è una funzione perché le posizioni dipendono dalla mappa generata.
 */
const STAGES = [
  /* liv. 1 — la capanna: nascono i primi due abitanti */
  {
    name: 'Accampamento',
    npcs: 2,
    props: (v) => [
      { sprite: 'garden', x: v.hut.x + 2.4, z: v.hut.z + 1.5, shadow: 0.9,
        poi: { kind: 'work', stopDist: 1.3 } },
      { sprite: 'bench', x: 1.9, z: 1.4, shadow: 0.5, solid: true, radius: 0.5,
        poi: { kind: 'sit', stopDist: 0.85, yaw: Math.PI } },
    ],
  },

  /* liv. 2 — la segheria: arrivano gli attrezzi e i carretti */
  {
    name: 'Piccolo villaggio',
    npcs: 2,
    props: (v) => [
      { sprite: 'cart', x: -2.6, z: -1.8, shadow: 0.5, solid: true, radius: 0.55,
        poi: { kind: 'work', stopDist: 1.1 } },
      { sprite: 'garden', x: -4.4, z: -3.4, shadow: 0.9,
        poi: { kind: 'work', stopDist: 1.3 } },
      { sprite: 'brazier', x: 2.6, z: -2.4, shadow: 0.42, solid: true, radius: 0.36 },
    ],
  },

  /* liv. 3 — la cava: il villaggio prende forma attorno al pozzo */
  {
    name: 'Villaggio',
    npcs: 3,
    props: (v) => [
      { sprite: 'well', x: -1.8, z: 2.6, shadow: 0.62, solid: true, radius: 0.62,
        poi: { kind: 'work', stopDist: 1.2 } },
      { sprite: 'bench', x: -3.4, z: 3.6, shadow: 0.5, solid: true, radius: 0.5,
        poi: { kind: 'sit', stopDist: 0.85, yaw: -Math.PI / 2 } },
      { sprite: 'garden', x: 4.2, z: 3.4, shadow: 0.9,
        poi: { kind: 'work', stopDist: 1.3 } },
      { sprite: 'brazier', x: -0.6, z: -3.6, shadow: 0.42, solid: true, radius: 0.36 },
    ],
  },

  /* liv. 4 — la casa: si chiude il perimetro con la staccionata */
  {
    name: 'Villaggio prospero',
    npcs: 3,
    fenceRing: true,
    props: () => [
      { sprite: 'cart', x: 3.4, z: -3.4, shadow: 0.5, solid: true, radius: 0.55,
        poi: { kind: 'work', stopDist: 1.1 } },
      { sprite: 'bench', x: 2.8, z: 4.4, shadow: 0.5, solid: true, radius: 0.5,
        poi: { kind: 'sit', stopDist: 0.85, yaw: 0 } },
    ],
  },

  /* liv. 5 — il magazzino: il villaggio è completo (fine Fase 2) */
  {
    name: 'Borgo',
    npcs: 4,
    props: () => [
      { sprite: 'garden', x: -5.4, z: -2.2, shadow: 0.9,
        poi: { kind: 'work', stopDist: 1.3 } },
      { sprite: 'brazier', x: 5.2, z: 1.2, shadow: 0.42, solid: true, radius: 0.36 },
      { sprite: 'brazier', x: -5.4, z: 4.6, shadow: 0.42, solid: true, radius: 0.36 },
    ],
  },
];

export class VillageSystem {
  constructor(game) {
    this.game = game;
    this.level = 0;
    /** Mete per le routine degli abitanti. */
    this.pointsOfInterest = [];
    this.npcs = [];
    this.stageName = 'Radura';
  }

  get maxLevel() { return STAGES.length; }

  /** Registra un punto di interesse per gli abitanti. */
  addPOI(x, z, kind = 'work', stopDist = 1.2, yaw = null) {
    this.pointsOfInterest.push({ x, z, kind, stopDist, yaw });
  }

  /**
   * Sale di livello: fa comparire arredi e abitanti.
   * @param {boolean} instant true durante il caricamento di un salvataggio
   */
  levelUp(instant = false) {
    if (this.level >= STAGES.length) return;
    const stage = STAGES[this.level];
    this.level++;
    this.stageName = stage.name;

    const g = this.game;
    const v = { hut: g.world.hut, world: g.world };

    // Gli arredi spuntano a cascata: il ritardo crescente rende la crescita
    // del villaggio uno spettacolo invece di un lampo.
    const list = stage.props ? stage.props(v) : [];
    list.forEach((p, i) => {
      const sprite = g.assets.village[p.sprite];
      if (!sprite) return;
      const prop = new GrowProp(p.x, p.z, sprite, {
        solid: p.solid, radius: p.radius, shadow: p.shadow,
        scale: p.scale ?? 1, flip: p.flip,
        delay: instant ? 0 : 0.25 + i * 0.22,
        instant, silent: instant,
      });
      g.world.add(prop, !instant);
      if (p.poi) this.addPOI(p.x, p.z, p.poi.kind, p.poi.stopDist, p.poi.yaw);
    });

    if (stage.fenceRing) this._buildFenceRing(instant);

    for (let i = 0; i < (stage.npcs ?? 0); i++) {
      this.spawnNPC(instant ? 0 : 0.6 + i * 0.5);
    }

    // il sentiero centrale si allarga a ogni livello
    g.world.terrain.addDecal(0, 0, 4.6 + this.level * 0.9, PAL.dirt, 0.12);

    if (!instant) {
      g.hud.toast(`Il villaggio cresce: ${stage.name}! 🎉`);
      g.audio.villageGrow();
      g.cam.addShake(0.2);
    }
    g.bus.emit('village:level', this.level);
  }

  /** Staccionata perimetrale con un varco verso il bosco. */
  _buildFenceRing(instant) {
    const g = this.game;
    const R = CFG.village.fenceRadius;
    const n = CFG.village.fenceSegments;
    const gateAngle = Math.PI * 0.25;    // direzione del varco

    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      // lascia aperto un settore: è l'ingresso del villaggio
      const delta = Math.abs(((a - gateAngle + Math.PI) % TAU) - Math.PI);
      if (delta < 0.34) continue;

      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;

      // Ogni segmento è TANGENTE al cerchio: scegliamo la sprite già cotta
      // nell'orientamento più vicino a quello richiesto.
      const tangent = a + Math.PI / 2;
      const fences = g.assets.village.fences;
      if (!fences) continue;
      const idx = ((Math.round((tangent / Math.PI) * FENCE_DIRS) % FENCE_DIRS) + FENCE_DIRS) % FENCE_DIRS;

      const prop = new GrowProp(x, z, fences[idx], {
        solid: true, radius: 0.6, shadow: 0.34,
        delay: instant ? 0 : 0.3 + i * 0.04,
        instant, silent: instant,
      });
      g.world.add(prop, !instant);
    }

    // il cancello vero e proprio
    const gx = Math.cos(gateAngle) * R, gz = Math.sin(gateAngle) * R;
    const gate = g.assets.village.gate;
    if (gate) {
      g.world.add(new GrowProp(gx, gz, gate, {
        solid: false, radius: 0.9, shadow: 0.5,
        delay: instant ? 0 : 1.2, instant, silent: instant,
      }), !instant);
    }
  }

  /** Aggiunge un abitante che entra nel villaggio dal bosco. */
  spawnNPC(delay = 0) {
    const g = this.game;
    const variants = g.assets.npc?.length ?? 0;
    if (!variants) return;

    // entra dal bordo del villaggio, così lo vedi arrivare
    const a = fxRand.range(0, TAU);
    const r = CFG.village.fenceRadius + fxRand.range(1, 3);
    const npc = new NPCEntity(
      Math.cos(a) * r, Math.sin(a) * r,
      (Math.random() * variants) | 0, g,
    );
    npc.actTimer = delay;
    g.world.add(npc, true);
    this.npcs.push(npc);
    g.bus.emit('npc:arrived', npc);
    return npc;
  }

  /** Popolazione corrente (mostrata nell'HUD). */
  get population() { return this.npcs.length; }

  /** Riporta il villaggio a un livello salvato, senza animazioni. */
  restore(level) {
    while (this.level < level) this.levelUp(true);
  }
}
