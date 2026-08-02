/**
 * buildings.js — Modelli low-poly degli edifici (Fase 1).
 * Ogni builder restituisce { mesh, height, radius }.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';
import { mixRGB } from '../core/MathUtils.js';

/**
 * Tetto a due falde "di paglia".
 *
 * Da una visuale dall'alto un cuneo liscio si legge come un rettangolo piatto:
 * per questo ogni falda è costruita con più fasce sovrapposte di colore
 * alternato, che dall'alto restituiscono la texture della paglia e rendono
 * evidente la pendenza.
 *
 * @param {number} w larghezza (asse X, direzione del colmo)
 * @param {number} h altezza dal bordo al colmo
 * @param {number} d profondità totale (asse Z)
 * @param {number[]} cA colore chiaro  @param {number[]} cB colore scuro
 * @param {number} bands numero di fasce per falda
 */
function thatchRoof(w, h, d, cA, cB, bands = 4) {
  const g = M.mesh();
  const hd = d / 2;
  const slope = Math.atan2(h, hd);      // pendenza della falda
  const slopeLen = Math.hypot(h, hd);
  const bandLen = slopeLen / bands;

  for (const side of [1, -1]) {         // +Z (davanti) e -Z (dietro)
    for (let i = 0; i < bands; i++) {
      // la fascia più bassa sporge leggermente: effetto "gronda"
      const t = (i + 0.5) / bands;      // 0 = gronda, 1 = colmo
      const c = i % 2 === 0 ? cA : cB;
      const seg = M.box(w, 0.09, bandLen * 1.06, c);
      M.rotX(seg, -side * slope, 0, 0);
      M.translate(
        seg,
        0,
        h * t - 0.03,
        side * (hd * (1 - t)),
      );
      M.merge(g, seg);
    }
    // bordo spesso della gronda
    const eave = M.box(w * 1.01, 0.14, 0.16, cB, { taper: 0.15 });
    M.translate(eave, 0, -0.04, side * (hd + 0.02));
    M.merge(g, eave);
  }

  // timpani laterali che chiudono il volume
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

/* ------------------------------------------------------------- capanna */

/** Capanna di legno con tetto di paglia: la prima costruzione del gioco. */
export function buildHut() {
  const g = M.mesh();
  const w = 2.5, d = 2.0, wallH = 1.4;

  // basamento in pietra
  const base = M.box(w + 0.22, 0.16, d + 0.22, PAL.stoneDark);
  M.merge(g, base);

  // pareti
  const walls = M.box(w, wallH, d, PAL.plank);
  M.translate(walls, 0, 0.16, 0);
  M.merge(g, walls);

  // travi verticali agli angoli
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const beam = M.box(0.16, wallH + 0.06, 0.16, PAL.plankDark);
      M.translate(beam, sx * (w / 2 - 0.04), 0.16, sz * (d / 2 - 0.04));
      M.merge(g, beam);
    }
  }

  // porta (sulla faccia +Z, verso la camera)
  const door = M.box(0.62, 0.86, 0.06, PAL.barkDark);
  M.translate(door, 0, 0.16, d / 2);
  M.merge(g, door);
  const knob = M.box(0.08, 0.08, 0.06, PAL.coin);
  M.translate(knob, 0.2, 0.6, d / 2 + 0.03);
  M.merge(g, knob);

  // finestre
  for (const sx of [-1, 1]) {
    const win = M.box(0.46, 0.4, 0.06, [120, 190, 220]);
    M.translate(win, sx * 0.82, 0.72, d / 2 + 0.01);
    M.merge(g, win);
    const frame = M.box(0.54, 0.06, 0.07, PAL.plankDark);
    M.translate(frame, sx * 0.82, 0.9, d / 2 + 0.01);
    M.merge(g, frame);
  }

  // tetto di paglia a doppia falda, ripido e a fasce
  const roofH = 1.02;
  const roof = thatchRoof(w + 0.36, roofH, d + 0.44, PAL.strawA, PAL.strawB, 4);
  M.translate(roof, 0, 0.16 + wallH, 0);
  M.merge(g, roof);

  // colmo
  const ridge = M.box(w + 0.42, 0.12, 0.17, PAL.barkDark, { taper: 0.1 });
  M.translate(ridge, 0, 0.16 + wallH + roofH - 0.05, 0);
  M.merge(g, ridge);

  // comignolo (sporge dalla falda posteriore)
  const chim = M.box(0.34, 0.85, 0.34, PAL.stone);
  M.translate(chim, -w * 0.28, 0.16 + wallH + 0.35, -0.3);
  M.merge(g, chim);
  const chimTop = M.box(0.42, 0.12, 0.42, PAL.stoneDark);
  M.translate(chimTop, -w * 0.28, 0.16 + wallH + 1.2, -0.3);
  M.merge(g, chimTop);

  return { mesh: g, height: 0.16 + wallH + roofH, radius: 1.5 };
}

/* ----------------------------------------------------------- mercante */

/** Bancarella del mercante con tendone a righe. */
export function buildMerchantStall() {
  const g = M.mesh();
  const w = 2.3, d = 1.5;

  // banco
  const counter = M.box(w, 0.75, d, PAL.plank);
  M.merge(g, counter);
  const top = M.box(w + 0.22, 0.1, d + 0.22, PAL.plankDark);
  M.translate(top, 0, 0.75, 0);
  M.merge(g, top);

  // pali (quelli dietro sono più alti: la tettoia è inclinata in avanti)
  for (const sx of [-1, 1]) {
    const back = M.cylinder(0.06, 0.055, 2.05, 5, PAL.handle);
    M.translate(back, sx * (w / 2 - 0.02), 0, -(d / 2 - 0.02));
    M.merge(g, back);
    const front = M.cylinder(0.06, 0.055, 1.5, 5, PAL.handle);
    M.translate(front, sx * (w / 2 - 0.02), 0, d / 2 - 0.02);
    M.merge(g, front);
  }

  // Tettoia a righe INCLINATA in avanti: vista dall'alto lascia scoperto il
  // banco (un tetto a due falde, da questa angolazione, coprirebbe tutto).
  const tw = w + 0.55, td = d + 0.75;
  const stripes = 7;
  const sw = tw / stripes;
  const tilt = -0.42;                     // radianti di inclinazione
  for (let i = 0; i < stripes; i++) {
    const c = i % 2 === 0 ? PAL.clothRed : PAL.cloth;
    const seg = M.box(sw * 1.02, 0.07, td, c);
    M.rotX(seg, tilt, 0, -td / 2);        // pivot sul bordo posteriore
    M.translate(seg, -tw / 2 + sw * (i + 0.5), 2.02, 0);
    M.merge(g, seg);
    // balza verticale sul bordo anteriore
    const frill = M.box(sw * 1.02, 0.22, 0.07, c, { taper: 0.1 });
    M.translate(frill, -tw / 2 + sw * (i + 0.5), 1.53, td * 0.47);
    M.merge(g, frill);
  }

  // merce sul banco: casse e sacchi
  const crate = M.box(0.4, 0.34, 0.36, PAL.barkLight);
  M.translate(crate, -0.7, 0.85, 0);
  M.merge(g, crate);
  const crate2 = M.box(0.3, 0.26, 0.28, PAL.bark);
  M.translate(crate2, -0.72, 1.19, 0.02);
  M.merge(g, crate2);

  const sack = M.sphere(0.24, 7, 5, PAL.strawB);
  M.scale(sack, 1, 1.15, 1);
  M.translate(sack, 0.62, 1.05, 0);
  M.merge(g, sack);

  // cartello con moneta
  const sign = M.box(0.5, 0.42, 0.06, PAL.plankDark);
  M.translate(sign, 0.05, 1.24, d / 2 + 0.06);
  M.merge(g, sign);
  const coin = M.cylinder(0.14, 0.14, 0.05, 8, PAL.coin, { centerY: true });
  M.rotX(coin, Math.PI / 2);
  M.translate(coin, 0.3, 1.45, d / 2 + 0.12);
  M.merge(g, coin);

  return { mesh: g, height: 2.45, radius: 1.5 };
}

/* --------------------------------------------------------- potenziamenti */

/** Banco dell'artigiano: sblocca i potenziamenti del giocatore. */
export function buildWorkbench() {
  const g = M.mesh();

  // piattaforma in pietra
  const pad = M.cylinder(1.15, 1.05, 0.14, 8, PAL.stoneDark);
  M.merge(g, pad);
  const pad2 = M.cylinder(1, 0.95, 0.06, 8, PAL.stoneLight);
  M.translate(pad2, 0, 0.14, 0);
  M.merge(g, pad2);

  // incudine su ceppo
  const stump = M.cylinder(0.3, 0.28, 0.42, 7, PAL.barkDark);
  M.translate(stump, 0, 0.2, -0.05);
  M.merge(g, stump);

  const anvilBase = M.box(0.36, 0.14, 0.26, PAL.stoneDark);
  M.translate(anvilBase, 0, 0.62, -0.05);
  M.merge(g, anvilBase);
  const anvilNeck = M.box(0.2, 0.1, 0.18, PAL.stone);
  M.translate(anvilNeck, 0, 0.76, -0.05);
  M.merge(g, anvilNeck);
  const anvilTop = M.box(0.62, 0.16, 0.24, PAL.stone, { skew: 0.06 });
  M.translate(anvilTop, 0, 0.86, -0.05);
  M.merge(g, anvilTop);

  // rastrelliera con attrezzi
  const rack = M.box(1.5, 0.1, 0.12, PAL.plankDark);
  M.translate(rack, 0, 1.15, -0.55);
  M.merge(g, rack);
  for (const sx of [-1, 1]) {
    const post = M.box(0.1, 1.2, 0.1, PAL.handle);
    M.translate(post, sx * 0.7, 0.1, -0.55);
    M.merge(g, post);
  }

  // martello appoggiato
  const hHandle = M.cylinder(0.03, 0.028, 0.4, 5, PAL.handle);
  M.rotZ(hHandle, 0.35);
  M.translate(hHandle, 0.42, 0.94, -0.05);
  M.merge(g, hHandle);
  const hHead = M.box(0.2, 0.12, 0.13, PAL.ironB);
  M.translate(hHead, 0.55, 1.3, -0.05);
  M.merge(g, hHead);

  return { mesh: g, height: 1.35, radius: 1.1 };
}

/* --------------------------------------------------------- decorazioni */

/** Cartello di legno con freccia (guida il giocatore). */
export function buildSignpost() {
  const g = M.mesh();
  const post = M.cylinder(0.07, 0.06, 1.1, 6, PAL.handle);
  M.merge(g, post);
  const plank = M.box(0.9, 0.3, 0.08, PAL.plank);
  M.translate(plank, 0.15, 0.75, 0.02);
  M.merge(g, plank);
  const plank2 = M.box(0.7, 0.24, 0.08, PAL.plankDark);
  M.translate(plank2, 0.1, 0.44, 0.02);
  M.merge(g, plank2);
  return { mesh: g, height: 1.15, radius: 0.3 };
}

/** Falò della radura iniziale: punto di riferimento visivo. */
export function buildCampfire() {
  const g = M.mesh();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = M.sphere(0.14, 5, 3, mixRGB(PAL.stone, PAL.stoneDark, (i % 3) / 3));
    M.scale(s, 1.1, 0.7, 1);
    M.translate(s, Math.cos(a) * 0.52, 0.06, Math.sin(a) * 0.52);
    M.merge(g, s);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const log = M.cylinder(0.07, 0.06, 0.62, 5, PAL.bark);
    M.rotZ(log, 0.9);
    M.rotY(log, a);
    M.translate(log, 0, 0.05, 0);
    M.merge(g, log);
  }
  return { mesh: g, height: 0.45, radius: 0.7 };
}
