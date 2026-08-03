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
import { FenceGateEntity } from '../entities/FenceGateEntity.js';
import { NPCEntity } from '../entities/NPCEntity.js';
import { PAL } from '../data/palette.js';
import { FENCE_DIRS } from '../render/AssetForge.js';
import { fxRand } from '../core/Rand.js';
import { TAU } from '../core/MathUtils.js';

/** Quanti tratti, a cavallo del centro di ogni lato, diventano cancelli
 *  automatici (distanza in unità di mondo dal centro del varco). */
const GATE_HALF_WIDTH = 0.75;

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

  /* ------------------------------ Fase 3: da borgo a paese ------------ */

  /* liv. 6 — il ponte: il paese si apre verso nord */
  {
    name: 'Crocevia',
    npcs: 3,
    props: () => [
      { sprite: 'trough', x: 2.2, z: 0.4, shadow: 0.8, solid: true, radius: 0.75,
        poi: { kind: 'work', stopDist: 1.2 } },
      { sprite: 'wagon', x: -3.2, z: -5.2, shadow: 0.85, solid: true, radius: 0.9,
        poi: { kind: 'work', stopDist: 1.4 } },
    ],
  },

  /* liv. 7 — il mulino: arrivano le STRADE LASTRICATE */
  {
    name: 'Paese',
    npcs: 4,
    cobbleRoads: true,
    haulers: 2,
    props: () => [
      { sprite: 'lamp', x: 3.6, z: 2.2, shadow: 0.28, solid: true, radius: 0.25 },
      { sprite: 'lamp', x: -3.8, z: -1.2, shadow: 0.28, solid: true, radius: 0.25 },
      { sprite: 'wagon', x: 5.4, z: -3.6, shadow: 0.85, solid: true, radius: 0.9,
        poi: { kind: 'work', stopDist: 1.4 } },
      { sprite: 'bench', x: -1.2, z: -6.4, shadow: 0.5, solid: true, radius: 0.5,
        poi: { kind: 'sit', stopDist: 0.85, yaw: 0 } },
    ],
  },

  /* liv. 8 — la fucina: il paese è completo (fine Fase 3) */
  {
    name: 'Paese fiorente',
    npcs: 5,
    haulers: 2,
    props: () => [
      { sprite: 'lamp', x: 6.4, z: 4.2, shadow: 0.28, solid: true, radius: 0.25 },
      { sprite: 'lamp', x: -6.6, z: 1.6, shadow: 0.28, solid: true, radius: 0.25 },
      { sprite: 'lamp', x: 0.4, z: 6.6, shadow: 0.28, solid: true, radius: 0.25 },
      { sprite: 'trough', x: -7.2, z: -4.4, shadow: 0.8, solid: true, radius: 0.75,
        poi: { kind: 'work', stopDist: 1.2 } },
      { sprite: 'garden', x: 7.0, z: -1.4, shadow: 0.9,
        poi: { kind: 'work', stopDist: 1.3 } },
    ],
  },

  /* ------------------------------ Fase 4: la grande città -------------- */

  /*
   * liv. 9 — il municipio. È il momento in cui la città supera il villaggio:
   * la staccionata viene smontata e le strade diventano asfalto.
   */
  {
    name: 'Città',
    npcs: 5,
    haulers: 2,
    removeFence: true,
    asphaltRoads: true,
    props: () => [
      { sprite: 'cityLamp', x: 2.6, z: 9.2, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityLamp', x: -2.6, z: 9.2, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityBench', x: 3.4, z: 11.4, shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: Math.PI } },
      { sprite: 'bin', x: 2.0, z: 11.6, shadow: 0.28, solid: true, radius: 0.28 },
    ],
  },

  /* liv. 10 — le botteghe: la via dello struscio */
  {
    name: 'Città vivace',
    npcs: 6,
    haulers: 2,
    props: () => [
      { sprite: 'cityLamp', x: -9.4, z: 2.2, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityLamp', x: -9.4, z: -1.6, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityBench', x: -10.6, z: 0.4, shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: Math.PI / 2 } },
      { sprite: 'flowerBed', x: -7.6, z: 4.2, shadow: 0.9 },
      { sprite: 'bin', x: -8.4, z: -3.2, shadow: 0.28, solid: true, radius: 0.28 },
    ],
  },

  /* liv. 11 — il parco: verde, siepi e la statua del boscaiolo */
  {
    name: 'Città verde',
    npcs: 6,
    parkProps: true,
    props: () => [
      { sprite: 'cityLamp', x: 9.6, z: 6.4, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityLamp', x: 9.6, z: 11.2, shadow: 0.3, solid: true, radius: 0.28 },
    ],
  },

  /* liv. 12 — la banca */
  {
    name: 'Città ricca',
    npcs: 6,
    haulers: 2,
    props: () => [
      { sprite: 'cityLamp', x: -5.2, z: 12.4, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityBench', x: -10.8, z: 12.6, shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: 0 } },
      { sprite: 'flowerBed', x: -6.0, z: 16.4, shadow: 0.9 },
      { sprite: 'hedge', x: -10.4, z: 16.6, shadow: 0.75, solid: true, radius: 0.75 },
    ],
  },

  /* liv. 13 — l'ospedale: la grande città è completa (fine Fase 4) */
  {
    name: 'Grande città',
    npcs: 7,
    haulers: 3,
    props: () => [
      { sprite: 'cityLamp', x: 7.0, z: 12.6, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityLamp', x: 13.0, z: 13.0, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'flowerBed', x: 8.0, z: 17.2, shadow: 0.9 },
      { sprite: 'hedge', x: 12.6, z: 17.4, shadow: 0.75, solid: true, radius: 0.75 },
      { sprite: 'bin', x: 6.2, z: 16.0, shadow: 0.28, solid: true, radius: 0.28 },
    ],
  },

  /* ------------------------------ Fase 5: la metropoli ----------------- */

  /* liv. 14 — il primo grattacielo: la città si mette in moto */
  {
    name: 'Metropoli',
    npcs: 6,
    props: () => [
      { sprite: 'cityLamp', x: -2.4, z: -8.6, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityLamp', x: -7.0, z: -9.4, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'kiosk', x: -1.6, z: -6.6, shadow: 0.8, solid: true, radius: 0.85,
        poi: { kind: 'work', stopDist: 1.4 } },
      { sprite: 'bin', x: -3.6, z: -6.8, shadow: 0.28, solid: true, radius: 0.28 },
    ],
  },

  /* liv. 15 — la stazione: entra in servizio il tram */
  {
    name: 'Metropoli in corsa',
    npcs: 6,
    props: () => [
      { sprite: 'tramStop', x: 13.2, z: -2.0, shadow: 0.24, solid: true, radius: 0.22,
        poi: { kind: 'work', stopDist: 1.1 } },
      { sprite: 'tramStop', x: -13.6, z: -6.2, shadow: 0.24, solid: true, radius: 0.22,
        poi: { kind: 'work', stopDist: 1.1 } },
      { sprite: 'cityBench', x: 13.8, z: -0.4, shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: Math.PI } },
      { sprite: 'cityLamp', x: 12.4, z: -4.4, shadow: 0.3, solid: true, radius: 0.28 },
    ],
  },

  /* liv. 16 — la torre panoramica */
  {
    name: 'Skyline',
    npcs: 7,
    haulers: 2,
    props: () => [
      { sprite: 'cityLamp', x: 5.0, z: -10.2, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'kiosk', x: 5.4, z: -8.2, shadow: 0.8, solid: true, radius: 0.85,
        poi: { kind: 'work', stopDist: 1.4 } },
      { sprite: 'flowerBed', x: 0.2, z: -9.4, shadow: 0.9 },
      { sprite: 'cityBench', x: -0.6, z: -7.6, shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: 0 } },
    ],
  },

  /* liv. 17 — la fabbrica */
  {
    name: 'Metropoli industriale',
    npcs: 7,
    haulers: 3,
    props: () => [
      { sprite: 'cityLamp', x: -13.0, z: -8.0, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'bin', x: -13.8, z: -6.4, shadow: 0.28, solid: true, radius: 0.28 },
      { sprite: 'hedge', x: -18.4, z: -6.0, shadow: 0.75, solid: true, radius: 0.75 },
    ],
  },

  /* liv. 18 — l'aeroporto: il gioco è completo */
  {
    name: 'Capitale',
    npcs: 8,
    haulers: 2,
    props: () => [
      { sprite: 'cityLamp', x: 16.6, z: 12.4, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityLamp', x: 22.4, z: 12.6, shadow: 0.3, solid: true, radius: 0.28 },
      { sprite: 'cityBench', x: 17.6, z: 11.0, shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: Math.PI } },
      { sprite: 'kiosk', x: 21.2, z: 10.8, shadow: 0.8, solid: true, radius: 0.85,
        poi: { kind: 'work', stopDist: 1.4 } },
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
    /** Segmenti della staccionata: la città li smonterà. */
    this.fenceProps = [];
    /** Lanterne alle porte: rimosse insieme alla staccionata. */
    this.fenceLights = [];
    /** Semilato della staccionata quadrata, 0 quando non esiste: gli
     *  abitanti lo usano per capire se sono fuori dal recinto. */
    this.fenceHalfExtent = 0;
    /** Centro di ogni varco, nello stesso ordine dei lati. */
    this.gateCenters = [];
  }

  get maxLevel() { return STAGES.length; }

  /**
   * Fase narrativa 1..5 — foresta, villaggio, paese, città, metropoli.
   * I livelli sono diciotto perché il mondo cresce a piccoli passi; la fase
   * è la lettura "grossa" che serve a chi deve cambiare registro tutto
   * insieme (la musica, per esempio).
   */
  get phase() {
    const l = this.level;
    return l <= 1 ? 1 : l <= 5 ? 2 : l <= 8 ? 3 : l <= 13 ? 4 : 5;
  }

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

      // Bracieri e lampioni illuminano: il braciere tremola come una fiamma,
      // il lampione elettrico no.
      if (p.sprite === 'brazier') {
        g.world.addLight(p.x, 1.3, p.z, { radius: 1.9, alpha: 0.78, flicker: true });
      } else if (p.sprite === 'lamp') {
        g.world.addLight(p.x, 1.75, p.z + 0.3, { radius: 1.7, alpha: 0.72, flicker: true });
      } else if (p.sprite === 'cityLamp') {
        g.world.addLight(p.x, 2.45, p.z, { radius: 2.1, alpha: 0.72, cold: true });
      } else if (p.sprite === 'kiosk') {
        g.world.addLight(p.x, 1.2, p.z + 0.6, { radius: 1.2, alpha: 0.6, cold: true });
      }
    });

    if (stage.fenceRing) this._buildFenceRing(instant);
    if (stage.removeFence) this._removeFence(instant);
    if (stage.cobbleRoads) this._paveRoads();
    if (stage.asphaltRoads) this._paveAsphalt();
    if (stage.parkProps) this._buildPark(instant);

    for (let i = 0; i < (stage.npcs ?? 0); i++) {
      this.spawnNPC(instant ? 0 : 0.6 + i * 0.5);
    }
    // I carrettieri fanno la spola fra gli edifici: sono la parte del paese
    // che si "muove" anche quando il giocatore sta fermo.
    for (let i = 0; i < (stage.haulers ?? 0); i++) {
      const npc = this.spawnNPC(instant ? 0 : 1.2 + i * 0.7);
      if (npc) npc.hauling = true;
    }

    // La piazza si allarga di poco a ogni livello. Il raggio è volutamente
    // contenuto: una decalcomania molto grande costa, da sola, più di tutto
    // il resto del frame (è il costo di riempire lo schermo in alpha).
    if (this.level <= 4) {
      g.world.terrain.addDecal(0, 0, 3.0 + this.level * 0.35, PAL.dirt, 0.1);
    }

    if (!instant) {
      g.hud.toast(`Il villaggio cresce: ${stage.name}! 🎉`);
      g.audio.villageGrow();
      g.cam.addShake(0.2);
    }
    g.bus.emit('village:level', this.level);
  }

  /**
   * Staccionata perimetrale: un QUADRATO, non un cerchio.
   *
   * Le sprite dei segmenti sono cotte in un numero fisso di orientamenti
   * (`FENCE_DIRS`): su un cerchio ogni tratto deve arrotondare alla
   * direzione cotta più vicina, e con soli 12 angoli disponibili l'errore si
   * vede — il recinto sembra storto e spezzato invece che una linea pulita.
   * Un quadrato non ha questo problema: i quattro lati sono perfettamente
   * orizzontali o verticali, cioè esattamente due degli orientamenti già
   * cotti (nessun arrotondamento, nessun errore).
   *
   * Alcuni tratti, al centro di ogni lato, sono `FenceGateEntity`: sprofondano
   * da soli quando ti avvicini e risalgono quando te ne vai. Per farli
   * riconoscere subito ci sono un arco, un sentiero di terra battuta e due
   * lanterne — di notte i varchi sono i punti più illuminati del recinto.
   */
  _buildFenceRing(instant) {
    const g = this.game;
    const H = CFG.village.fenceRadius;     // ora è il semilato del quadrato
    const fences = g.assets.village.fences;
    const gates = g.assets.village.gates;
    if (!fences) return;

    this.fenceHalfExtent = H;

    const H_IDX = 0;                  // orientamento orizzontale, esatto
    const V_IDX = FENCE_DIRS / 2;      // orientamento verticale, esatto

    // I quattro lati: per ognuno, l'asse che percorriamo, il valore fisso
    // dell'altro asse, l'orientamento della sprite e dove si apre il varco.
    const sides = [
      { along: 'x', fixed: -H, dir: H_IDX, gx: 0, gz: -H },   // nord
      { along: 'x', fixed: H, dir: H_IDX, gx: 0, gz: H },     // sud
      { along: 'z', fixed: -H, dir: V_IDX, gx: -H, gz: 0 },   // ovest
      { along: 'z', fixed: H, dir: V_IDX, gx: H, gz: 0 },      // est
    ];
    this.gateCenters = sides.map((s) => ({ x: s.gx, z: s.gz }));

    // Passo leggermente più corto della larghezza reale del segmento: i pali
    // si sovrappongono un po' invece di lasciare fessure fra un tratto e
    // l'altro.
    const step = 1.28;
    const n = Math.max(2, Math.round((2 * H) / step));
    let delayIdx = 0;

    for (const side of sides) {
      const sprite = fences[side.dir];
      for (let i = 0; i <= n; i++) {
        const t = -H + (i / n) * (2 * H);
        const x = side.along === 'x' ? t : side.fixed;
        const z = side.along === 'x' ? side.fixed : t;

        const dGate = Math.hypot(x - side.gx, z - side.gz);
        if (dGate < GATE_HALF_WIDTH) {
          const seg = new FenceGateEntity(x, z, side.gx, side.gz, sprite, { radius: 0.6, shadow: 0.34 });
          g.world.add(seg, true);
          this.fenceProps.push(seg);
          continue;
        }

        const prop = new GrowProp(x, z, sprite, {
          solid: true, radius: 0.6, shadow: 0.34,
          delay: instant ? 0 : 0.3 + delayIdx * 0.025,
          instant, silent: instant,
        });
        g.world.add(prop, !instant);
        this.fenceProps.push(prop);
        delayIdx++;
      }
    }

    // Le porte vere e proprie: arco (orientato come il lato su cui si trova,
    // altrimenti sui lati est/ovest resterebbe di traverso), sentiero di
    // terra battuta dal colore acceso e due lanterne — così un varco si
    // riconosce subito anche da lontano, di giorno per il colore e di notte
    // per la luce.
    if (gates) {
      for (const side of sides) {
        const { gx, gz } = side;
        const arch = gates[side.dir === V_IDX ? 1 : 0];
        this.fenceProps.push(g.world.add(new GrowProp(gx, gz, arch, {
          solid: false, radius: 0.9, shadow: 0.5,
          delay: instant ? 0 : 1.2, instant, silent: instant,
        }), !instant));

        g.world.terrain.addDecal(gx * 1.06, gz * 1.06, 2.3, PAL.gold, 0.22);
        g.world.terrain.addDecal(gx * 1.06, gz * 1.06, 1.7, PAL.dirt, 0.42);
        this.fenceLights.push(g.world.addLight(gx * 0.9, 1.55, gz * 0.9, {
          radius: 2.3, alpha: 0.62, flicker: true,
        }));
      }
    }
  }

  /**
   * Lastrica in pietra i sentieri principali del paese.
   *
   * Non sostituiamo il terreno: sovrapponiamo una decalcomania più chiara e
   * netta a quella di terra battuta. Il risultato è che le strade "diventano"
   * di pietra sotto gli occhi del giocatore, senza rigenerare nulla.
   */
  _paveRoads() {
    const g = this.game;
    const t = g.world.terrain;
    const hubs = [
      { x: 0, z: 0 },
      g.world.hutSpot,
      g.world.merchantSpot,
      g.world.benchSpot,
      { x: g.world.buildings.sawmill.x, z: g.world.buildings.sawmill.z },
      { x: g.world.buildings.quarry.x, z: g.world.buildings.quarry.z },
      { x: g.world.buildings.house.x, z: g.world.buildings.house.z },
      { x: g.world.buildings.warehouse.x, z: g.world.buildings.warehouse.z },
      { x: g.world.buildings.bridge.x, z: g.world.buildings.bridge.z + 3.2 },
    ];
    for (let i = 1; i < hubs.length; i++) {
      t.addPath(hubs[0].x, hubs[0].z, hubs[i].x, hubs[i].z, 1.1, 1.4, PAL.cobble, 0.9, 'cobble');
    }
    // piazza centrale lastricata
    t.addDecal(0, 0, 3.6, PAL.cobble, 0.9, 'cobble');

    g.hud.toast('Le strade sono state lastricate 🧱');
  }

  /**
   * Smonta la staccionata: la città è cresciuta oltre il vecchio perimetro.
   * È il segnale più forte del passaggio da paese a città.
   */
  _removeFence(instant) {
    const g = this.game;
    for (const p of this.fenceProps) {
      if (instant) { g.world.remove(p); continue; }
      // sprofondano nel terreno una dopo l'altra, con un po' di polvere
      p.solid = false;
      g.world.remove(p);
      g.fx.puff(p.x, 0.05, p.z, 3, 'rgba(206,190,160,0.8)', 0.5, 0.2);
    }
    this.fenceProps.length = 0;
    // Le lanterne delle porte se ne vanno con loro: restare accese senza
    // nessun palo sotto sembrerebbe un errore, non un'atmosfera.
    for (const L of this.fenceLights) g.world.removeLight(L);
    this.fenceLights.length = 0;
    this.fenceHalfExtent = 0;
    this.gateCenters.length = 0;
    if (!instant) {
      g.hud.toast('La città ha superato il vecchio recinto 🏙️');
      g.cam.addShake(0.15);
    }
  }

  /** Asfalto: le strade di pietra diventano carreggiate con la segnaletica. */
  _paveAsphalt() {
    const g = this.game;
    const t = g.world.terrain;
    const B = g.world.buildings;
    const hubs = [
      { x: 0, z: 0 },
      { x: B.townhall.x, z: B.townhall.z - 3.2 },
      { x: B.shops.x + 3.0, z: B.shops.z },
      { x: B.park.x - 3.0, z: B.park.z },
      { x: B.bank.x + 1.5, z: B.bank.z - 3.0 },
      { x: B.hospital.x - 1.5, z: B.hospital.z - 3.0 },
      g.world.merchantSpot,
      { x: B.mill.x, z: B.mill.z + 2.5 },
      { x: B.smithy.x, z: B.smithy.z + 2.5 },
      { x: B.bridge.x, z: B.bridge.z + 4.0 },
    ];
    for (let i = 1; i < hubs.length; i++) {
      t.addPath(hubs[0].x, hubs[0].z, hubs[i].x, hubs[i].z, 1.35, 1.7,
        PAL.asphalt, 0.95, 'asphalt');
    }
    t.addDecal(0, 0, 4.0, PAL.asphalt, 0.95, 'asphalt');
    g.hud.toast('Strade asfaltate 🛣️');
  }

  /** Il parco attorno alla fontana: siepi, aiuole, panchine e la statua. */
  _buildPark(instant) {
    const g = this.game;
    const b = g.world.buildings.park;
    const A = g.assets.village;
    const items = [
      ['statue', -3.4, -0.6, { shadow: 0.6, solid: true, radius: 0.7 }],
      ['flowerBed', 2.6, -1.8, { shadow: 0.9 }],
      ['flowerBed', -2.4, 2.6, { shadow: 0.9 }],
      ['hedge', 3.2, 2.2, { shadow: 0.75, solid: true, radius: 0.75 }],
      ['hedge', -3.6, 2.6, { shadow: 0.75, solid: true, radius: 0.75 }],
      ['cityBench', 0.2, 3.0, { shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: Math.PI } }],
      ['cityBench', -0.2, -3.2, { shadow: 0.55, solid: true, radius: 0.55,
        poi: { kind: 'sit', stopDist: 0.85, yaw: 0 } }],
      ['bin', 2.4, 3.2, { shadow: 0.28, solid: true, radius: 0.28 }],
    ];
    items.forEach(([id, dx, dz, o], i) => {
      const sprite = A[id];
      if (!sprite) return;
      const prop = new GrowProp(b.x + dx, b.z + dz, sprite, {
        ...o, delay: instant ? 0 : 0.4 + i * 0.18, instant, silent: instant,
      });
      g.world.add(prop, !instant);
      if (o.poi) this.addPOI(b.x + dx, b.z + dz, o.poi.kind, o.poi.stopDist, o.poi.yaw);
    });
    // il prato del parco
    g.world.terrain.addDecal(b.x, b.z, 4.6, PAL.parkGrass, 0.5);
    this.addPOI(b.x, b.z + 2.4, 'work', 1.6);
  }

  /** Aggiunge un abitante che entra nel villaggio dal bosco. */
  spawnNPC(delay = 0) {
    const g = this.game;
    const variants = g.assets.npc?.length ?? 0;
    if (!variants || this.npcs.length >= CFG.npc.maxCount) return;

    // entra dal bordo del villaggio, così lo vedi arrivare
    const a = fxRand.range(0, TAU);
    // Con la città che si allarga, i nuovi arrivati entrano da più lontano.
    const r = CFG.village.fenceRadius + this.level * 0.9 + fxRand.range(1, 4);
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
