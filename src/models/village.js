/**
 * village.js — Edifici e arredi della Fase 2 (il villaggio).
 *
 * Tutti i modelli seguono le regole imparate nella Fase 1:
 *  - i tetti sono a fasce, altrimenti dall'alto si leggono come rettangoli;
 *  - i volumi restano bassi e larghi, così non coprono il giocatore;
 *  - i colori sono saturi e i contrasti netti, per la leggibilità sul telefono.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';
import { mixRGB } from '../core/MathUtils.js';

/* ------------------------------------------------------------- utilità */

/**
 * Tetto a due falde costruito con fasce alternate (vedi Fase 1).
 * Esportato perché lo usano più edifici.
 */
export function bandedRoof(w, h, d, cA, cB, bands = 4) {
  const g = M.mesh();
  const hd = d / 2;
  const slope = Math.atan2(h, hd);
  const bandLen = Math.hypot(h, hd) / bands;

  for (const side of [1, -1]) {
    for (let i = 0; i < bands; i++) {
      const t = (i + 0.5) / bands;
      const seg = M.box(w, 0.09, bandLen * 1.06, i % 2 === 0 ? cA : cB);
      M.rotX(seg, -side * slope, 0, 0);
      M.translate(seg, 0, h * t - 0.03, side * (hd * (1 - t)));
      M.merge(g, seg);
    }
    const eave = M.box(w * 1.01, 0.13, 0.15, cB, { taper: 0.15 });
    M.translate(eave, 0, -0.04, side * (hd + 0.02));
    M.merge(g, eave);
  }
  for (const sx of [-1, 1]) {
    const gable = M.mesh();
    gable.v.push(
      0, 0, -hd, 0, 0, hd, 0, h, 0,
      0.06 * sx, 0, -hd, 0.06 * sx, 0, hd, 0.06 * sx, h, 0,
    );
    gable.f.push({ i: [0, 1, 2], c: cB }, { i: [5, 4, 3], c: cB });
    M.translate(gable, sx * w / 2, 0, 0);
    M.merge(g, gable);
  }
  return g;
}

/** Parete con travi d'angolo, porta e finestre: base comune delle case. */
function walls(w, h, d, color, opts = {}) {
  const g = M.mesh();
  const base = M.box(w + 0.2, 0.15, d + 0.2, PAL.stoneDark);
  M.merge(g, base);

  const body = M.box(w, h, d, color);
  M.translate(body, 0, 0.15, 0);
  M.merge(g, body);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const beam = M.box(0.15, h + 0.05, 0.15, PAL.plankDark);
      M.translate(beam, sx * (w / 2 - 0.03), 0.15, sz * (d / 2 - 0.03));
      M.merge(g, beam);
    }
  }
  if (opts.door !== false) {
    const door = M.box(0.6, 0.85, 0.06, PAL.barkDark);
    M.translate(door, opts.doorX ?? 0, 0.15, d / 2);
    M.merge(g, door);
    const knob = M.box(0.07, 0.07, 0.06, PAL.coin);
    M.translate(knob, (opts.doorX ?? 0) + 0.19, 0.58, d / 2 + 0.03);
    M.merge(g, knob);
  }
  for (const wx of opts.windows ?? []) {
    const win = M.box(0.44, 0.38, 0.06, [122, 192, 222]);
    M.translate(win, wx, 0.68, d / 2 + 0.01);
    M.merge(g, win);
    const sill = M.box(0.52, 0.06, 0.08, PAL.plankDark);
    M.translate(sill, wx, 0.62, d / 2 + 0.02);
    M.merge(g, sill);
  }
  return g;
}

/* ------------------------------------------------------------- edifici */

/** Casa del villaggio: come la capanna ma in muratura e con tetto in coppi. */
export function buildHouse() {
  const g = M.mesh();
  const w = 2.7, d = 2.1, h = 1.5;

  M.merge(g, walls(w, h, d, PAL.plank, { windows: [-0.88, 0.88] }));

  const roofH = 1.05;
  const roof = bandedRoof(w + 0.4, roofH, d + 0.46, PAL.roofRed, PAL.roofRedD, 4);
  M.translate(roof, 0, 0.15 + h, 0);
  M.merge(g, roof);

  const ridge = M.box(w + 0.46, 0.12, 0.16, PAL.roofWoodD, { taper: 0.1 });
  M.translate(ridge, 0, 0.15 + h + roofH - 0.05, 0);
  M.merge(g, ridge);

  const chim = M.box(0.32, 0.8, 0.32, PAL.stone);
  M.translate(chim, w * 0.3, 0.15 + h + 0.3, -0.32);
  M.merge(g, chim);

  // vaso di fiori sul davanzale: dà vita alla facciata
  const pot = M.cylinder(0.11, 0.13, 0.14, 6, PAL.roofRedD);
  M.translate(pot, -0.88, 0.66, d / 2 + 0.08);
  M.merge(g, pot);
  const bloom = M.sphere(0.11, 5, 3, PAL.flowerB);
  M.translate(bloom, -0.88, 0.84, d / 2 + 0.08);
  M.merge(g, bloom);

  return { mesh: g, height: 0.15 + h + roofH, radius: 1.6 };
}

/** Segheria: tettoia aperta, sega circolare e cataste di tronchi. */
export function buildSawmill() {
  const g = M.mesh();
  const w = 3.0, d = 2.2;

  // piattaforma di assi
  const deck = M.box(w, 0.18, d, PAL.plank);
  M.merge(g, deck);
  for (let i = 0; i < 5; i++) {
    const plank = M.box(w * 0.98, 0.04, d / 5.4, PAL.plankDark);
    M.translate(plank, 0, 0.18, -d / 2 + (i + 0.5) * (d / 5));
    if (i % 2 === 0) M.merge(g, plank);
  }

  // Pilastri e tettoia. La copertura sta solo sulla metà POSTERIORE: vista
  // dall'alto un tetto pieno nasconderebbe tutta la segheria.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = M.box(0.14, sz < 0 ? 1.75 : 1.2, 0.14, PAL.handle);
      M.translate(post, sx * (w / 2 - 0.12), 0.18, sz * (d / 2 - 0.12));
      M.merge(g, post);
    }
  }
  const roofD = d * 0.72;
  const roof = bandedRoof(w + 0.3, 0.66, roofD, PAL.roofWood, PAL.roofWoodD, 3);
  M.translate(roof, 0, 1.86, -d * 0.24);
  M.merge(g, roof);
  // trave di colmo visibile
  const ridge = M.box(w + 0.34, 0.1, 0.13, PAL.barkDark);
  M.translate(ridge, 0, 1.86 + 0.62, -d * 0.24);
  M.merge(g, ridge);

  // banco con lama circolare
  const bench = M.box(1.3, 0.42, 0.7, PAL.plankDark);
  M.translate(bench, -0.5, 0.18, 0.1);
  M.merge(g, bench);
  const blade = M.cylinder(0.34, 0.34, 0.045, 12, PAL.ironA, { centerY: true });
  M.rotZ(blade, Math.PI / 2);
  M.translate(blade, -0.5, 0.74, 0.1);
  M.merge(g, blade);
  const hub = M.cylinder(0.1, 0.1, 0.07, 6, PAL.ironB, { centerY: true });
  M.rotZ(hub, Math.PI / 2);
  M.translate(hub, -0.5, 0.74, 0.1);
  M.merge(g, hub);

  // catasta di tronchi pronta
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3 - row; i++) {
      const log = M.cylinder(0.13, 0.13, 0.9, 7, PAL.wood, { centerY: true });
      M.rotZ(log, Math.PI / 2);
      M.translate(log, 0.95, 0.31 + row * 0.25, -0.5 + i * 0.28 + row * 0.14);
      M.merge(g, log);
    }
  }

  return { mesh: g, height: 2.45, radius: 1.75 };
}

/** Cava: scavo nella roccia, argano e carrello. */
export function buildQuarry() {
  const g = M.mesh();

  // terrazzamento in pietra
  const pad = M.cylinder(1.75, 1.6, 0.2, 9, PAL.stoneDark);
  M.merge(g, pad);
  const pad2 = M.cylinder(1.45, 1.3, 0.12, 9, mixRGB(PAL.stone, PAL.dirt, 0.35));
  M.translate(pad2, 0, 0.2, 0);
  M.merge(g, pad2);

  // parete rocciosa sul retro
  for (let i = 0; i < 4; i++) {
    const b = M.box(0.7, 0.5 + i * 0.22, 0.55, mixRGB(PAL.stone, PAL.stoneDark, (i % 2) * 0.5));
    M.translate(b, -0.95 + i * 0.62, 0.2, -1.05 + (i % 2) * 0.14);
    M.merge(g, b);
  }

  // impalcatura con argano
  for (const sx of [-1, 1]) {
    const post = M.box(0.12, 1.5, 0.12, PAL.handle);
    M.translate(post, sx * 0.72, 0.2, 0.42);
    M.merge(g, post);
  }
  const beam = M.box(1.7, 0.14, 0.14, PAL.handle);
  M.translate(beam, 0, 1.7, 0.42);
  M.merge(g, beam);
  const rope = M.box(0.035, 0.55, 0.035, PAL.strawB);
  M.translate(rope, 0.2, 1.15, 0.42);
  M.merge(g, rope);
  const bucket = M.cylinder(0.2, 0.24, 0.28, 7, PAL.ironB);
  M.translate(bucket, 0.2, 0.87, 0.42);
  M.merge(g, bucket);

  // blocchi estratti
  for (let i = 0; i < 4; i++) {
    const s = 0.22 + (i % 2) * 0.07;
    const blk = M.box(s * 1.6, s, s * 1.3, PAL.stone, { taper: 0.14 });
    M.translate(blk, 0.75 - i * 0.1, 0.32 + Math.floor(i / 2) * s, 0.05 + (i % 2) * 0.36);
    M.merge(g, blk);
  }

  // piccone conficcato
  const handle = M.cylinder(0.035, 0.03, 0.7, 5, PAL.handle);
  M.rotZ(handle, 0.5);
  M.translate(handle, -0.75, 0.3, 0.55);
  M.merge(g, handle);
  const head = M.box(0.07, 0.1, 0.44, PAL.ironA, { taper: 0.5 });
  M.translate(head, -1.06, 0.92, 0.55);
  M.merge(g, head);

  return { mesh: g, height: 1.9, radius: 1.7 };
}

/** Magazzino: capannone lungo con casse e sacchi. */
export function buildWarehouse() {
  const g = M.mesh();
  const w = 3.4, d = 2.3, h = 1.35;

  M.merge(g, walls(w, h, d, PAL.plankDark, { doorX: 0, windows: [-1.15, 1.15] }));

  const roofH = 0.9;
  const roof = bandedRoof(w + 0.42, roofH, d + 0.48, PAL.canvasTan, mixRGB(PAL.canvasTan, PAL.bark, 0.3), 5);
  M.translate(roof, 0, 0.15 + h, 0);
  M.merge(g, roof);

  // insegna
  const sign = M.box(0.8, 0.34, 0.07, PAL.plank);
  M.translate(sign, -1.0, 1.1, d / 2 + 0.05);
  M.merge(g, sign);

  // casse impilate all'esterno
  const crate = (x, z, y, s) => {
    const c = M.box(0.42 * s, 0.38 * s, 0.4 * s, PAL.barkLight);
    const band = M.box(0.44 * s, 0.06 * s, 0.42 * s, PAL.bark);
    M.translate(band, 0, 0.18 * s, 0);
    M.merge(c, band);
    M.translate(c, x, y, z);
    M.merge(g, c);
  };
  crate(1.35, d / 2 + 0.42, 0, 1);
  crate(1.35, d / 2 + 0.42, 0.38, 0.86);
  crate(0.85, d / 2 + 0.5, 0, 0.92);

  return { mesh: g, height: 0.15 + h + roofH, radius: 1.9 };
}

/* ------------------------------------------------------------- arredi */

/**
 * Segmento di staccionata.
 *
 * Dall'alto una staccionata bassa si confonde con una panchina: per questo i
 * pali sono alti e a punta, e le traverse sono sottili e distanziate — la
 * silhouette resta inequivocabile anche a colpo d'occhio.
 */
export function buildFence() {
  const g = M.mesh();
  for (const sx of [-1, 1]) {
    const post = M.box(0.13, 0.98, 0.13, PAL.fenceDark);
    M.translate(post, sx * 0.6, 0, 0);
    M.merge(g, post);
    // punta piramidale
    const tip = M.cone(0.1, 0.16, 4, PAL.fence);
    M.translate(tip, sx * 0.6, 0.98, 0);
    M.merge(g, tip);
  }
  for (const y of [0.4, 0.72]) {
    const rail = M.box(1.32, 0.075, 0.055, PAL.fence);
    M.translate(rail, 0, y, 0);
    M.merge(g, rail);
  }
  // pali intermedi, sottili
  const mid = M.box(0.08, 0.86, 0.08, PAL.fenceDark);
  M.merge(g, mid);
  return { mesh: g, height: 1.14, radius: 0.66 };
}

/** Cancelletto: interrompe la staccionata all'ingresso del villaggio. */
export function buildGate() {
  const g = M.mesh();
  for (const sx of [-1, 1]) {
    const post = M.box(0.17, 1.15, 0.17, PAL.fenceDark, { taper: 0.1 });
    M.translate(post, sx * 0.85, 0, 0);
    M.merge(g, post);
    const cap = M.box(0.24, 0.1, 0.24, PAL.bark);
    M.translate(cap, sx * 0.85, 1.15, 0);
    M.merge(g, cap);
  }
  const arch = M.box(1.95, 0.16, 0.14, PAL.fence);
  M.translate(arch, 0, 1.16, 0);
  M.merge(g, arch);
  const sign = M.box(0.9, 0.3, 0.07, PAL.plank);
  M.translate(sign, 0, 0.82, 0.04);
  M.merge(g, sign);
  return { mesh: g, height: 1.35, radius: 0.95 };
}

/** Pozzo del villaggio. */
export function buildWell() {
  const g = M.mesh();
  const ring = M.cylinder(0.56, 0.52, 0.5, 9, PAL.stone);
  M.merge(g, ring);
  const inner = M.cylinder(0.42, 0.42, 0.06, 9, PAL.waterB);
  M.translate(inner, 0, 0.46, 0);
  M.merge(g, inner);
  const lip = M.cylinder(0.6, 0.58, 0.09, 9, PAL.stoneLight);
  M.translate(lip, 0, 0.5, 0);
  M.merge(g, lip);

  for (const sx of [-1, 1]) {
    const post = M.box(0.1, 0.95, 0.1, PAL.handle);
    M.translate(post, sx * 0.42, 0.5, 0);
    M.merge(g, post);
  }
  const roof = bandedRoof(1.3, 0.42, 1.0, PAL.roofWood, PAL.roofWoodD, 3);
  M.translate(roof, 0, 1.45, 0);
  M.merge(g, roof);

  const bucket = M.cylinder(0.14, 0.16, 0.2, 6, PAL.bark);
  M.translate(bucket, 0, 0.78, 0);
  M.merge(g, bucket);
  return { mesh: g, height: 1.9, radius: 0.62 };
}

/** Orto coltivato: file di ortaggi su terra smossa. */
export function buildGarden(rnd) {
  const g = M.mesh();
  const soil = M.box(1.9, 0.09, 1.5, PAL.soil);
  M.merge(g, soil);
  for (let r = 0; r < 3; r++) {
    const ridge = M.box(1.8, 0.07, 0.2, mixRGB(PAL.soil, PAL.dirtDark, 0.4));
    M.translate(ridge, 0, 0.09, -0.45 + r * 0.45);
    M.merge(g, ridge);
    for (let i = 0; i < 4; i++) {
      const ripe = rnd.chance(0.4);
      const plant = M.sphere(rnd.range(0.11, 0.16), 5, 3, ripe ? PAL.cropRipe : PAL.crop);
      M.scale(plant, 1, 0.85, 1);
      M.translate(plant, -0.7 + i * 0.47, 0.2, -0.45 + r * 0.45);
      M.merge(g, plant);
    }
  }
  return { mesh: g, height: 0.35, radius: 1.0 };
}

/** Panchina: gli abitanti ci si siedono davvero. */
export function buildBench() {
  const g = M.mesh();
  const seat = M.box(1.15, 0.09, 0.36, PAL.plank);
  M.translate(seat, 0, 0.4, 0);
  M.merge(g, seat);
  const back = M.box(1.15, 0.34, 0.08, PAL.plank);
  M.translate(back, 0, 0.49, -0.16);
  M.merge(g, back);
  for (const sx of [-1, 1]) {
    const leg = M.box(0.09, 0.4, 0.3, PAL.plankDark);
    M.translate(leg, sx * 0.48, 0, 0);
    M.merge(g, leg);
  }
  return { mesh: g, height: 0.85, radius: 0.55 };
}

/** Carretto a mano: trasportato dagli abitanti operai. */
export function buildCart() {
  const g = M.mesh();
  const bed = M.box(1.0, 0.28, 0.68, PAL.plank);
  M.translate(bed, 0, 0.36, 0);
  M.merge(g, bed);
  for (const sz of [-1, 1]) {
    const side = M.box(1.02, 0.22, 0.07, PAL.plankDark);
    M.translate(side, 0, 0.62, sz * 0.31);
    M.merge(g, side);
  }
  for (const sx of [-1, 1]) {
    const wheel = M.cylinder(0.28, 0.28, 0.09, 9, PAL.barkDark, { centerY: true });
    M.rotZ(wheel, Math.PI / 2);
    M.translate(wheel, sx * 0.54, 0.28, 0);
    M.merge(g, wheel);
  }
  for (const sx of [-1, 1]) {
    const shaft = M.box(0.07, 0.07, 0.7, PAL.handle);
    M.translate(shaft, sx * 0.3, 0.48, 0.62);
    M.merge(g, shaft);
  }
  // carico
  for (let i = 0; i < 3; i++) {
    const log = M.cylinder(0.1, 0.1, 0.85, 6, PAL.wood, { centerY: true });
    M.rotZ(log, Math.PI / 2);
    M.translate(log, 0, 0.6 + Math.floor(i / 2) * 0.19, -0.12 + (i % 2) * 0.22);
    M.merge(g, log);
  }
  return { mesh: g, height: 0.95, radius: 0.6 };
}

/** Braciere acceso: illumina la piazza (e nella Fase 4 diventerà lampione). */
export function buildBrazier() {
  const g = M.mesh();
  const base = M.cylinder(0.3, 0.24, 0.1, 8, PAL.stoneDark);
  M.merge(g, base);
  // tre gambe, non un palo unico: si legge molto meglio dall'alto
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const legM = M.box(0.08, 1.0, 0.08, PAL.ironB);
    M.rotZ(legM, Math.cos(a) * 0.12);
    M.rotX(legM, -Math.sin(a) * 0.12);
    M.translate(legM, Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16);
    M.merge(g, legM);
  }
  const bowl = M.cylinder(0.3, 0.42, 0.3, 8, PAL.ironA);
  M.translate(bowl, 0, 1.0, 0);
  M.merge(g, bowl);
  const rim = M.cylinder(0.44, 0.44, 0.07, 8, PAL.ironB);
  M.translate(rim, 0, 1.28, 0);
  M.merge(g, rim);
  // legna e fiamme: coni sovrapposti sempre più chiari
  for (let i = 0; i < 4; i++) {
    const flame = M.cone(0.3 - i * 0.06, 0.34 - i * 0.05, 5,
      [[255, 128, 50], [255, 168, 62], [255, 206, 96], [255, 240, 168]][i]);
    M.translate(flame, 0, 1.24 + i * 0.1, 0);
    M.merge(g, flame);
  }
  return { mesh: g, height: 1.95, radius: 0.42 };
}
