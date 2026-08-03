/**
 * town.js — Modelli della Fase 3: il paese.
 *
 * Novità rispetto alle fasi precedenti:
 *  - il MULINO ha le pale cotte a parte, in più angoli, così girano davvero;
 *  - il PONTE è lungo e attraversabile, quindi va costruito a campate;
 *  - la FUCINA ha la brace accesa, primo accenno di "luce" nel mondo.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';
import { bandedRoof } from './village.js';
import { mixRGB } from '../core/MathUtils.js';

/* --------------------------------------------------------------- ferro */

/**
 * Vena di ferro: un masso più scuro attraversato da venature arancioni.
 * Si distingue a colpo d'occhio dalla pietra comune, che è ciò che serve
 * quando il giocatore arriva sull'altra sponda per la prima volta.
 */
export function buildIronVein(rnd) {
  const g = M.mesh();
  const s = rnd.range(0.9, 1.15);

  const core = M.sphere(0.5 * s, 7, 5, PAL.stoneDark);
  M.scale(core, 1.15, 0.92, 1);
  M.warp(core, (x, y, z) => [
    x + Math.sin(y * 8 + z * 4) * 0.07,
    y,
    z + Math.cos(x * 7 + y * 3) * 0.07,
  ]);
  M.translate(core, 0, 0.44 * s, 0);
  M.merge(g, core);

  // spuntoni
  for (let i = 0; i < rnd.int(2, 4); i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0.16, 0.28) * s;
    const b = M.sphere(r, 5, 4, mixRGB(PAL.stoneDark, PAL.stone, rnd.range(0, 0.5)));
    M.scale(b, 1.2, 0.85, 1);
    M.translate(b, Math.cos(a) * 0.44 * s, r * 0.8, Math.sin(a) * 0.4 * s);
    M.merge(g, b);
  }

  // venature di minerale: sono il segnale visivo della risorsa
  for (let i = 0; i < 5; i++) {
    const v = M.box(rnd.range(0.1, 0.22) * s, 0.07, rnd.range(0.14, 0.28) * s,
      i % 2 === 0 ? PAL.ironOre : PAL.ironOreD);
    M.rotY(v, rnd.range(0, 3.14));
    M.rotZ(v, rnd.sym(0.4));
    M.translate(v, rnd.sym(0.32) * s, rnd.range(0.42, 0.85) * s, rnd.sym(0.28) * s);
    M.merge(g, v);
  }
  return { mesh: g, height: 1.0 * s, radius: 0.62 * s };
}

/** Blocco di ferro grezzo (drop). */
export function buildIronDrop() {
  const g = M.mesh();
  const core = M.box(0.26, 0.2, 0.24, PAL.stoneDark, { taper: 0.2 });
  M.merge(g, core);
  for (const [x, z] of [[0.06, 0.05], [-0.07, -0.04]]) {
    const ore = M.box(0.12, 0.09, 0.11, PAL.ironOre, { taper: 0.25 });
    M.translate(ore, x, 0.16, z);
    M.merge(g, ore);
  }
  M.translate(g, 0, 0.02, 0);
  return { mesh: g, height: 0.28, radius: 0.2 };
}

/** Il ferro trasportato sulla schiena. */
export function buildCarriedIron() {
  const g = M.box(0.4, 0.17, 0.3, PAL.stoneDark, { taper: 0.14 });
  const ore = M.box(0.3, 0.06, 0.22, PAL.ironOre, { taper: 0.2 });
  M.translate(ore, 0, 0.16, 0);
  M.merge(g, ore);
  M.translate(g, 0, -0.085, 0);
  return g;
}

/* --------------------------------------------------------------- ponte */

/**
 * Ponte di legno in pietra e travi.
 * @param {number} length lunghezza totale (asse Z, attraversa il fiume)
 */
export function buildBridge(length = 7.2) {
  const g = M.mesh();
  const w = 2.1;

  // piloni in pietra alle due estremità
  for (const sz of [-1, 1]) {
    const pier = M.box(w + 0.5, 0.5, 1.0, PAL.stoneDark, { taper: 0.08 });
    M.translate(pier, 0, 0, sz * (length / 2 - 0.3));
    M.merge(g, pier);
  }

  // impalcato: tavole trasversali
  const planks = Math.round(length / 0.42);
  for (let i = 0; i < planks; i++) {
    const t = i / (planks - 1);
    const z = -length / 2 + t * length;
    // il ponte è leggermente inarcato al centro
    const y = 0.42 + Math.sin(t * Math.PI) * 0.22;
    // assi alternate ben contrastate: dall'alto è ciò che rende leggibile
    // il ponte come impalcato invece che come rettangolo pieno
    const plank = M.box(w, 0.11, 0.33, i % 2 === 0 ? PAL.bridgeWood : PAL.bridgeDark);
    M.translate(plank, 0, y, z);
    M.merge(g, plank);
  }

  // travi longitudinali sotto l'impalcato
  for (const sx of [-1, 1]) {
    for (let i = 0; i < planks; i++) {
      const t = i / (planks - 1);
      const z = -length / 2 + t * length;
      const y = 0.3 + Math.sin(t * Math.PI) * 0.22;
      const beam = M.box(0.18, 0.14, 0.44, PAL.bridgeDark);
      M.translate(beam, sx * (w / 2 - 0.15), y, z);
      M.merge(g, beam);
    }
  }

  // parapetti
  for (const sx of [-1, 1]) {
    const posts = Math.round(length / 1.1);
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const z = -length / 2 + t * length;
      const y = 0.53 + Math.sin(t * Math.PI) * 0.22;
      const post = M.box(0.13, 0.62, 0.13, PAL.bridgeDark);
      M.translate(post, sx * (w / 2 + 0.02), y, z);
      M.merge(g, post);
    }
    // corrimano, seguendo l'arco
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const t = (i + 0.5) / segs;
      const z = -length / 2 + t * length;
      const y = 1.12 + Math.sin(t * Math.PI) * 0.22;
      const rail = M.box(0.09, 0.1, (length / segs) * 1.05, PAL.bridgeWood);
      M.translate(rail, sx * (w / 2 + 0.02), y, z);
      M.merge(g, rail);
    }
  }

  return { mesh: g, height: 1.35, radius: w / 2 };
}

/* -------------------------------------------------------------- mulino */

/** Corpo del mulino, senza pale (che ruotano e vanno cotte a parte). */
export function buildMillBody() {
  const g = M.mesh();
  const h = 2.6;

  // torre tronco-conica in pietra
  const tower = M.cylinder(1.15, 0.82, h, 9, PAL.cobble);
  M.merge(g, tower);
  // fasce di pietra più chiare
  for (let i = 0; i < 4; i++) {
    const y = 0.3 + i * 0.6;
    const r = 1.15 + (0.82 - 1.15) * (y / h);
    const band = M.cylinder(r + 0.03, r + 0.01, 0.12, 9, PAL.cobbleL);
    M.translate(band, 0, y, 0);
    M.merge(g, band);
  }

  // base allargata
  const base = M.cylinder(1.3, 1.2, 0.22, 9, PAL.cobbleD);
  M.merge(g, base);

  // porta e finestra
  const door = M.box(0.6, 0.9, 0.1, PAL.barkDark);
  M.translate(door, 0, 0.22, 0.95);
  M.merge(g, door);
  const win = M.box(0.36, 0.36, 0.1, [122, 192, 222]);
  M.translate(win, 0, 1.5, 0.88);
  M.merge(g, win);

  // tettuccio conico
  const cap = M.cone(1.0, 0.85, 9, PAL.roofWood);
  M.translate(cap, 0, h, 0);
  M.merge(g, cap);
  const capRim = M.cylinder(1.02, 0.98, 0.1, 9, PAL.roofWoodD);
  M.translate(capRim, 0, h - 0.04, 0);
  M.merge(g, capRim);

  // mozzo su cui girano le pale (verso +Z, cioè verso la camera)
  const hub = M.cylinder(0.18, 0.15, 0.4, 7, PAL.millWood, { centerY: true });
  M.rotX(hub, Math.PI / 2);
  M.translate(hub, 0, h - 0.35, 0.95);
  M.merge(g, hub);

  // sacchi di farina appoggiati fuori
  for (let i = 0; i < 3; i++) {
    const sack = M.sphere(0.22, 6, 4, PAL.canvasTan);
    M.scale(sack, 1, 1.2, 1);
    M.translate(sack, -1.35 + i * 0.3, 0.24, 1.05 + (i % 2) * 0.3);
    M.merge(g, sack);
  }

  return { mesh: g, height: h + 0.9, radius: 1.35 };
}

/**
 * Le quattro pale del mulino, ruotate di `angle`.
 * Vengono cotte in N angoli e alternate a runtime: il mulino gira davvero.
 */
export function buildMillSails(angle = 0) {
  const g = M.mesh();
  const armLen = 1.85;

  for (let i = 0; i < 4; i++) {
    const a = angle + (i / 4) * Math.PI * 2;
    const arm = M.mesh();

    // trave portante
    const beam = M.box(0.13, armLen, 0.1, PAL.millWood);
    M.merge(arm, beam);
    // telo della vela
    const sail = M.box(0.46, armLen * 0.72, 0.05, PAL.millSail);
    M.translate(sail, 0.32, armLen * 0.24, -0.03);
    M.merge(arm, sail);
    // listelli del telaio
    for (let k = 0; k < 4; k++) {
      const slat = M.box(0.5, 0.045, 0.07, PAL.millWood);
      M.translate(slat, 0.32, armLen * (0.12 + k * 0.2), -0.02);
      M.merge(arm, slat);
    }

    M.rotZ(arm, a);
    M.merge(g, arm);
  }

  // mozzo centrale
  const hub = M.cylinder(0.2, 0.2, 0.16, 8, PAL.roofWoodD, { centerY: true });
  M.rotX(hub, Math.PI / 2);
  M.merge(g, hub);

  // Le pale stanno su un piano verticale rivolto verso la camera.
  return g;
}

/* -------------------------------------------------------------- fucina */

/** Fucina del fabbro: forgia accesa, incudine, barre di ferro. */
export function buildSmithy() {
  const g = M.mesh();
  const w = 3.0, d = 2.3, h = 1.35;

  // basamento e muri in pietra
  const base = M.box(w + 0.24, 0.18, d + 0.24, PAL.cobbleD);
  M.merge(g, base);
  const body = M.box(w, h, d, PAL.cobble);
  M.translate(body, 0, 0.18, 0);
  M.merge(g, body);
  // corsi di pietra
  for (let i = 0; i < 3; i++) {
    const course = M.box(w + 0.03, 0.07, d + 0.03, PAL.cobbleL);
    M.translate(course, 0, 0.4 + i * 0.36, 0);
    M.merge(g, course);
  }

  // apertura della bottega (lato +Z): si vede dentro
  const opening = M.box(1.5, 0.95, 0.12, [46, 40, 44]);
  M.translate(opening, -0.4, 0.28, d / 2);
  M.merge(g, opening);

  // tetto
  const roofH = 0.85;
  const roof = bandedRoof(w + 0.36, roofH, d + 0.44, PAL.roofWood, PAL.roofWoodD, 4);
  M.translate(roof, 0, 0.18 + h, 0);
  M.merge(g, roof);

  // comignolo della forgia, con brace incandescente
  const chim = M.box(0.5, 1.15, 0.5, PAL.cobbleD);
  M.translate(chim, w * 0.32, 0.18 + h - 0.15, -0.2);
  M.merge(g, chim);
  const ember = M.cylinder(0.19, 0.22, 0.14, 7, PAL.forgeHot);
  M.translate(ember, w * 0.32, 0.18 + h + 0.98, -0.2);
  M.merge(g, ember);

  // incudine davanti alla bottega
  const stump = M.cylinder(0.28, 0.26, 0.4, 7, PAL.barkDark);
  M.translate(stump, 0.95, 0.18, d / 2 + 0.55);
  M.merge(g, stump);
  const anvil = M.box(0.62, 0.15, 0.24, PAL.forge, { skew: 0.05 });
  M.translate(anvil, 0.95, 0.58, d / 2 + 0.55);
  M.merge(g, anvil);
  const anvilNeck = M.box(0.22, 0.1, 0.18, PAL.forge);
  M.translate(anvilNeck, 0.95, 0.48, d / 2 + 0.55);
  M.merge(g, anvilNeck);

  // barre di ferro accatastate
  for (let i = 0; i < 4; i++) {
    const bar = M.box(0.7, 0.09, 0.11, PAL.ironBar);
    M.translate(bar, -1.0, 0.24 + Math.floor(i / 2) * 0.1, d / 2 + 0.45 + (i % 2) * 0.16);
    M.merge(g, bar);
  }

  // insegna con ferro di cavallo
  const sign = M.box(0.55, 0.4, 0.07, PAL.plankDark);
  M.translate(sign, -0.4, 1.35, d / 2 + 0.06);
  M.merge(g, sign);
  const horseshoe = M.cylinder(0.14, 0.14, 0.05, 7, PAL.ironBar, { centerY: true });
  M.rotX(horseshoe, Math.PI / 2);
  M.translate(horseshoe, -0.4, 1.5, d / 2 + 0.12);
  M.merge(g, horseshoe);

  return { mesh: g, height: 0.18 + h + roofH, radius: 1.7 };
}

/* --------------------------------------------------------------- arredi */

/** Carro trainato, più grande del carretto a mano: lo spingono gli abitanti. */
export function buildWagon() {
  const g = M.mesh();
  const bed = M.box(1.5, 0.34, 0.9, PAL.plank);
  M.translate(bed, 0, 0.42, 0);
  M.merge(g, bed);
  for (const sz of [-1, 1]) {
    const side = M.box(1.52, 0.34, 0.08, PAL.plankDark);
    M.translate(side, 0, 0.76, sz * 0.42);
    M.merge(g, side);
  }
  for (const sx of [-1, 1]) {
    const head = M.box(0.08, 0.3, 0.9, PAL.plankDark);
    M.translate(head, sx * 0.76, 0.76, 0);
    M.merge(g, head);
  }
  // quattro ruote a raggi
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = M.cylinder(0.3, 0.3, 0.1, 9, PAL.barkDark, { centerY: true });
      M.rotZ(wheel, Math.PI / 2);
      M.translate(wheel, sx * 0.78, 0.3, sz * 0.34);
      M.merge(g, wheel);
      const hub = M.cylinder(0.1, 0.1, 0.13, 6, PAL.handle, { centerY: true });
      M.rotZ(hub, Math.PI / 2);
      M.translate(hub, sx * 0.78, 0.3, sz * 0.34);
      M.merge(g, hub);
    }
  }
  // carico di sacchi
  for (let i = 0; i < 3; i++) {
    const sack = M.sphere(0.24, 6, 4, PAL.canvasTan);
    M.scale(sack, 1.1, 1, 1.1);
    M.translate(sack, -0.35 + i * 0.36, 0.82, (i % 2) * 0.2 - 0.1);
    M.merge(g, sack);
  }
  // timone
  const shaft = M.box(0.1, 0.1, 0.9, PAL.handle);
  M.translate(shaft, 0, 0.5, 0.85);
  M.merge(g, shaft);

  return { mesh: g, height: 1.15, radius: 0.95 };
}

/** Fontanella / abbeveratoio in pietra: arredo urbano del paese. */
export function buildTrough() {
  const g = M.mesh();
  const basin = M.box(1.5, 0.42, 0.7, PAL.cobble);
  M.merge(g, basin);
  const water = M.box(1.34, 0.06, 0.54, PAL.waterA);
  M.translate(water, 0, 0.4, 0);
  M.merge(g, water);
  const rim = M.box(1.56, 0.09, 0.76, PAL.cobbleL);
  M.translate(rim, 0, 0.42, 0);
  M.merge(g, rim);
  // colonnina con cannella
  const col = M.box(0.26, 1.0, 0.26, PAL.cobbleD, { taper: 0.15 });
  M.translate(col, -0.62, 0.42, 0);
  M.merge(g, col);
  const spout = M.box(0.1, 0.1, 0.3, PAL.ironBar);
  M.translate(spout, -0.5, 1.15, 0);
  M.merge(g, spout);
  return { mesh: g, height: 1.45, radius: 0.8 };
}

/** Lampione a olio: il primo passo verso l'illuminazione della città. */
export function buildLamp() {
  const g = M.mesh();
  const base = M.cylinder(0.22, 0.18, 0.14, 7, PAL.cobbleD);
  M.merge(g, base);
  const post = M.box(0.11, 1.9, 0.11, PAL.forge, { taper: 0.2 });
  M.translate(post, 0, 0.12, 0);
  M.merge(g, post);
  // braccio ricurvo
  const arm = M.box(0.09, 0.09, 0.4, PAL.forge);
  M.translate(arm, 0, 1.95, 0.16);
  M.merge(g, arm);
  // lanterna
  const glass = M.box(0.3, 0.34, 0.3, [255, 226, 150], { taper: 0.25 });
  M.translate(glass, 0, 1.72, 0.34);
  M.merge(g, glass);
  const capL = M.cone(0.24, 0.18, 5, PAL.forge);
  M.translate(capL, 0, 2.05, 0.34);
  M.merge(g, capL);
  return { mesh: g, height: 2.25, radius: 0.25 };
}
