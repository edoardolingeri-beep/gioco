/**
 * city.js — Modelli della Fase 4: la grande città.
 *
 * Il salto di scala rispetto al paese si legge in tre cose:
 *  - i materiali (marmo, mattoni, vetro al posto del legno);
 *  - gli edifici pubblici, più alti e simmetrici;
 *  - gli arredi urbani (fontana, lampioni elettrici, aiuole).
 *
 * Restano valide tutte le regole imparate: tetti a fasce, volumi che non
 * coprono il giocatore, silhouette riconoscibili dall'alto.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';
import { bandedRoof } from './village.js';
import { mixRGB } from '../core/MathUtils.js';

/* ----------------------------------------------------------------- oro */

/** Filone d'oro: raro, luminoso, inconfondibile. */
export function buildGoldVein(rnd) {
  const g = M.mesh();
  const s = rnd.range(0.9, 1.1);

  const core = M.sphere(0.48 * s, 7, 5, mixRGB(PAL.stoneDark, PAL.stone, 0.25));
  M.scale(core, 1.12, 0.95, 1);
  M.warp(core, (x, y, z) => [
    x + Math.sin(y * 9 + z * 3) * 0.06, y, z + Math.cos(x * 8 + y * 4) * 0.06,
  ]);
  M.translate(core, 0, 0.44 * s, 0);
  M.merge(g, core);

  for (let i = 0; i < rnd.int(2, 3); i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0.15, 0.26) * s;
    const b = M.sphere(r, 5, 4, PAL.stoneDark);
    M.scale(b, 1.2, 0.85, 1);
    M.translate(b, Math.cos(a) * 0.42 * s, r * 0.8, Math.sin(a) * 0.38 * s);
    M.merge(g, b);
  }

  // pepite: cristalli dorati che sporgono dalla roccia
  for (let i = 0; i < 6; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const nug = M.cone(rnd.range(0.07, 0.12) * s, rnd.range(0.12, 0.22) * s, 5,
      i % 2 === 0 ? PAL.gold : PAL.goldVein);
    M.rotZ(nug, rnd.sym(0.6));
    M.rotX(nug, rnd.sym(0.6));
    M.translate(nug,
      Math.cos(a) * 0.3 * s, rnd.range(0.45, 0.85) * s, Math.sin(a) * 0.26 * s);
    M.merge(g, nug);
  }
  return { mesh: g, height: 1.05 * s, radius: 0.6 * s };
}

export function buildGoldDrop() {
  const g = M.mesh();
  const base = M.box(0.24, 0.13, 0.2, PAL.goldD, { taper: 0.3 });
  M.merge(g, base);
  const top = M.box(0.17, 0.1, 0.14, PAL.gold, { taper: 0.35 });
  M.translate(top, 0, 0.12, 0);
  M.merge(g, top);
  const shine = M.box(0.09, 0.04, 0.07, PAL.goldVein);
  M.translate(shine, -0.02, 0.21, 0);
  M.merge(g, shine);
  M.translate(g, 0, 0.02, 0);
  return { mesh: g, height: 0.28, radius: 0.18 };
}

export function buildCarriedGold() {
  const g = M.box(0.36, 0.14, 0.26, PAL.goldD, { taper: 0.2 });
  const top = M.box(0.26, 0.1, 0.18, PAL.gold, { taper: 0.25 });
  M.translate(top, 0, 0.13, 0);
  M.merge(g, top);
  M.translate(g, 0, -0.07, 0);
  return g;
}

/* ------------------------------------------------------------- municipio */

/** Municipio con torre dell'orologio: il simbolo della città. */
export function buildTownHall() {
  const g = M.mesh();
  const w = 4.2, d = 2.6, h = 2.0;

  // basamento con gradinata
  const base = M.box(w + 0.5, 0.2, d + 0.7, PAL.marbleD);
  M.merge(g, base);
  const step = M.box(w * 0.45, 0.12, 0.5, PAL.marble);
  M.translate(step, 0, 0.2, d / 2 + 0.3);
  M.merge(g, step);

  // corpo in mattoni con cornici in marmo
  const body = M.box(w, h, d, PAL.brickA);
  M.translate(body, 0, 0.2, 0);
  M.merge(g, body);
  const cornice = M.box(w + 0.16, 0.16, d + 0.16, PAL.marble);
  M.translate(cornice, 0, 0.2 + h - 0.16, 0);
  M.merge(g, cornice);
  const plinth = M.box(w + 0.12, 0.22, d + 0.12, PAL.marbleD);
  M.translate(plinth, 0, 0.2, 0);
  M.merge(g, plinth);

  // colonnato sulla facciata
  for (let i = 0; i < 4; i++) {
    const x = -1.35 + i * 0.9;
    const col = M.cylinder(0.16, 0.14, h - 0.3, 8, PAL.marble);
    M.translate(col, x, 0.32, d / 2 + 0.18);
    M.merge(g, col);
    const cap = M.box(0.4, 0.12, 0.4, PAL.marble);
    M.translate(cap, x, 0.32 + h - 0.3, d / 2 + 0.18);
    M.merge(g, cap);
  }
  // architrave del portico
  const arch = M.box(3.5, 0.22, 0.55, PAL.marble);
  M.translate(arch, 0, 0.32 + h - 0.18, d / 2 + 0.18);
  M.merge(g, arch);

  // portone e finestre
  const door = M.box(0.9, 1.15, 0.1, PAL.barkDark);
  M.translate(door, 0, 0.32, d / 2);
  M.merge(g, door);
  for (const x of [-1.55, 1.55]) {
    const win = M.box(0.5, 0.7, 0.08, PAL.glassA);
    M.translate(win, x, 0.85, d / 2 + 0.01);
    M.merge(g, win);
  }

  // tetto
  // Tetto contenuto: da questa angolazione una falda profonda coprirebbe
  // il colonnato, che è ciò che rende riconoscibile il municipio.
  const roofH = 1.0;
  const roof = bandedRoof(w + 0.4, roofH, d + 0.15, PAL.roofRed, PAL.roofRedD, 4);
  M.translate(roof, 0, 0.2 + h, 0);
  M.merge(g, roof);

  // torre dell'orologio
  const tw = 1.1;
  const tower = M.box(tw, 2.5, tw, PAL.brickB);
  M.translate(tower, -w * 0.28, 0.2 + h, 0);
  M.merge(g, tower);
  const towerTop = M.box(tw + 0.22, 0.16, tw + 0.22, PAL.marble);
  M.translate(towerTop, -w * 0.28, 0.2 + h + 2.5, 0);
  M.merge(g, towerTop);
  // quadrante
  const dial = M.cylinder(0.34, 0.34, 0.08, 10, PAL.marble, { centerY: true });
  M.rotX(dial, Math.PI / 2);
  M.translate(dial, -w * 0.28, 0.2 + h + 1.85, tw / 2 + 0.03);
  M.merge(g, dial);
  const hand = M.box(0.05, 0.22, 0.05, [50, 46, 56]);
  M.translate(hand, -w * 0.28, 0.2 + h + 1.95, tw / 2 + 0.08);
  M.merge(g, hand);
  // cuspide
  const spire = M.cone(0.78, 1.0, 6, PAL.roofRedD);
  M.translate(spire, -w * 0.28, 0.2 + h + 2.66, 0);
  M.merge(g, spire);
  const flag = M.box(0.05, 0.5, 0.05, PAL.marbleD);
  M.translate(flag, -w * 0.28, 0.2 + h + 3.66, 0);
  M.merge(g, flag);
  const banner = M.box(0.04, 0.24, 0.36, PAL.shopRed);
  M.translate(banner, -w * 0.28, 0.2 + h + 3.9, 0.2);
  M.merge(g, banner);

  return { mesh: g, height: 0.2 + h + 3.9, radius: 2.4 };
}

/* --------------------------------------------------------------- negozi */

/** Fila di botteghe con vetrine e tendine colorate. */
export function buildShops() {
  const g = M.mesh();
  /*
   * Proporzioni scelte per questa proiezione: un edificio a tetto piano
   * profondo si legge come un rettangolo grigio, perché la copertura occupa
   * più schermo della facciata. Quindi lo teniamo ALTO e POCO PROFONDO, e
   * arrediamo il tetto invece di lasciarlo nudo.
   */
  const unitW = 1.65, d = 1.6, h = 2.15;
  const colors = [PAL.shopRed, PAL.shopBlue, PAL.shopGreen];
  const total = unitW * 3;

  const base = M.box(total + 0.3, 0.18, d + 0.3, PAL.cobbleD);
  M.merge(g, base);

  for (let i = 0; i < 3; i++) {
    const x = -total / 2 + unitW * (i + 0.5);

    // corpo della bottega
    const body = M.box(unitW - 0.06, h, d, i % 2 === 0 ? PAL.marble : PAL.marbleD);
    M.translate(body, x, 0.18, 0);
    M.merge(g, body);

    // vetrina
    const glass = M.box(unitW - 0.5, 0.8, 0.08, PAL.glassA);
    M.translate(glass, x, 0.5, d / 2 + 0.01);
    M.merge(g, glass);
    const frame = M.box(unitW - 0.42, 0.09, 0.11, colors[i]);
    M.translate(frame, x, 0.44, d / 2 + 0.02);
    M.merge(g, frame);

    // porta laterale
    const door = M.box(0.34, 0.85, 0.08, PAL.barkDark);
    M.translate(door, x + unitW * 0.3, 0.18, d / 2 + 0.01);
    M.merge(g, door);

    // tendina a righe, inclinata in avanti
    for (let k = 0; k < 4; k++) {
      const sw = (unitW - 0.1) / 4;
      const seg = M.box(sw * 1.02, 0.07, 0.72, k % 2 === 0 ? colors[i] : PAL.awning);
      M.rotX(seg, -0.4, 0, -0.36);
      M.translate(seg, x - (unitW - 0.1) / 2 + sw * (k + 0.5), 1.42, d / 2 + 0.3);
      M.merge(g, seg);
    }
    // balza
    const frill = M.box(unitW - 0.1, 0.16, 0.06, colors[i]);
    M.translate(frill, x, 1.12, d / 2 + 0.62);
    M.merge(g, frill);

    // insegna sopra la tendina
    const sign = M.box(unitW - 0.55, 0.3, 0.07, colors[i]);
    M.translate(sign, x, 1.52, d / 2 + 0.02);
    M.merge(g, sign);
  }

  // tetto piano, ma arredato: cornicione, lucernari, comignoli, condotti
  const roof = M.box(total + 0.2, 0.16, d + 0.2, PAL.cobbleD);
  M.translate(roof, 0, 0.18 + h, 0);
  M.merge(g, roof);
  // cornicione colorato sul fronte: separa il tetto dalla facciata
  const cornice = M.box(total + 0.34, 0.16, 0.2, PAL.brickA);
  M.translate(cornice, 0, 0.18 + h, (d + 0.2) / 2);
  M.merge(g, cornice);
  const parapet = M.box(total + 0.26, 0.24, 0.14, PAL.marbleD);
  M.translate(parapet, 0, 0.18 + h + 0.16, -(d + 0.2) / 2);
  M.merge(g, parapet);

  for (let i = 0; i < 3; i++) {
    const x = -total / 2 + unitW * (i + 0.5);
    // lucernario
    const sky = M.box(0.6, 0.12, 0.5, PAL.glassB);
    M.translate(sky, x, 0.18 + h + 0.16, -0.1);
    M.merge(g, sky);
    const skyFrame = M.box(0.68, 0.08, 0.58, PAL.marbleD);
    M.translate(skyFrame, x, 0.18 + h + 0.14, -0.1);
    M.merge(g, skyFrame);
  }
  for (let i = 0; i < 2; i++) {
    const chim = M.box(0.28, 0.6, 0.28, PAL.brickB);
    M.translate(chim, -1.4 + i * 2.8, 0.18 + h + 0.16, -0.42);
    M.merge(g, chim);
  }
  // serbatoio sul tetto: dettaglio urbano che spezza la superficie
  const tank = M.cylinder(0.3, 0.28, 0.44, 8, PAL.ironB);
  M.translate(tank, 0.3, 0.18 + h + 0.16, -0.5);
  M.merge(g, tank);

  return { mesh: g, height: 0.18 + h + 0.8, radius: 2.6 };
}

/* --------------------------------------------------------------- banca */

/** Banca con colonne e cupola: la solidità fatta edificio. */
export function buildBank() {
  const g = M.mesh();
  const w = 3.2, d = 2.4, h = 2.1;

  const base = M.box(w + 0.7, 0.24, d + 0.9, PAL.marbleD);
  M.merge(g, base);
  for (let i = 0; i < 3; i++) {
    const st = M.box(w * 0.6 - i * 0.2, 0.1, 0.36, PAL.marble);
    M.translate(st, 0, 0.24 - i * 0.1, d / 2 + 0.62 - i * 0.18);
    M.merge(g, st);
  }

  const body = M.box(w, h, d, PAL.marble);
  M.translate(body, 0, 0.24, 0);
  M.merge(g, body);

  // colonne monumentali
  for (let i = 0; i < 5; i++) {
    const x = -1.28 + i * 0.64;
    const col = M.cylinder(0.15, 0.13, h - 0.2, 8, PAL.marbleD);
    M.translate(col, x, 0.34, d / 2 + 0.34);
    M.merge(g, col);
    const cap = M.box(0.36, 0.13, 0.36, PAL.marble);
    M.translate(cap, x, 0.34 + h - 0.2, d / 2 + 0.34);
    M.merge(g, cap);
  }
  // frontone triangolare
  const ped = M.mesh();
  const pw = w * 0.5, ph = 0.55, pd = 0.2;
  ped.v.push(
    -pw, 0, 0, pw, 0, 0, 0, ph, 0,
    -pw, 0, pd, pw, 0, pd, 0, ph, pd,
  );
  ped.f.push({ i: [3, 4, 5], c: PAL.marble }, { i: [2, 1, 0], c: PAL.marbleD },
    { i: [0, 1, 4, 3], c: PAL.marbleD }, { i: [1, 2, 5, 4], c: PAL.marble },
    { i: [2, 0, 3, 5], c: PAL.marble });
  M.translate(ped, 0, 0.34 + h - 0.05, d / 2 + 0.28);
  M.merge(g, ped);

  // cupola
  const drum = M.cylinder(0.95, 0.9, 0.42, 10, PAL.marbleD);
  M.translate(drum, 0, 0.24 + h, -0.1);
  M.merge(g, drum);
  const dome = M.sphere(0.92, 10, 5, PAL.glassB);
  M.scale(dome, 1, 0.72, 1);
  M.warp(dome, (x, y, z) => [x, Math.max(y, 0), z]);   // mezza sfera
  M.translate(dome, 0, 0.24 + h + 0.42, -0.1);
  M.merge(g, dome);
  const finial = M.cylinder(0.1, 0.06, 0.34, 6, PAL.gold);
  M.translate(finial, 0, 0.24 + h + 1.1, -0.1);
  M.merge(g, finial);
  const coin = M.cylinder(0.24, 0.24, 0.07, 10, PAL.gold, { centerY: true });
  M.rotX(coin, Math.PI / 2);
  M.translate(coin, 0, 0.24 + h + 1.55, -0.1);
  M.merge(g, coin);

  // portone con cancellata dorata
  const door = M.box(0.85, 1.15, 0.1, PAL.forge);
  M.translate(door, 0, 0.34, d / 2 + 0.02);
  M.merge(g, door);
  for (let i = 0; i < 4; i++) {
    const bar = M.box(0.05, 1.05, 0.05, PAL.gold);
    M.translate(bar, -0.3 + i * 0.2, 0.4, d / 2 + 0.08);
    M.merge(g, bar);
  }

  return { mesh: g, height: 0.24 + h + 1.7, radius: 2.0 };
}

/* ------------------------------------------------------------- ospedale */

/** Ospedale: bianco, con croce rossa e ambulanza sul retro. */
export function buildHospital() {
  const g = M.mesh();
  const w = 3.6, d = 1.9, h = 2.5;

  const base = M.box(w + 0.3, 0.2, d + 0.4, PAL.cobbleD);
  M.merge(g, base);
  const body = M.box(w, h, d, PAL.marble);
  M.translate(body, 0, 0.2, 0);
  M.merge(g, body);

  // fascia colorata alla base
  const band = M.box(w + 0.04, 0.24, d + 0.04, PAL.glassB);
  M.translate(band, 0, 0.2, 0);
  M.merge(g, band);

  // finestre su due piani
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 4; i++) {
      const win = M.box(0.5, 0.52, 0.08, PAL.glassA);
      M.translate(win, -1.35 + i * 0.9, 0.68 + f * 0.92, d / 2 + 0.01);
      M.merge(g, win);
    }
  }

  // ingresso con pensilina
  const door = M.box(1.0, 1.0, 0.1, PAL.glassB);
  M.translate(door, 0, 0.2, d / 2);
  M.merge(g, door);
  const canopy = M.box(1.6, 0.12, 0.7, PAL.marbleD);
  M.translate(canopy, 0, 1.2, d / 2 + 0.3);
  M.merge(g, canopy);
  for (const sx of [-1, 1]) {
    const post = M.cylinder(0.07, 0.06, 1.2, 6, PAL.marbleD);
    M.translate(post, sx * 0.68, 0.2, d / 2 + 0.58);
    M.merge(g, post);
  }

  // tetto piano con parapetto, vano scale e impianti
  const roof = M.box(w + 0.16, 0.18, d + 0.16, PAL.cobbleD);
  M.translate(roof, 0, 0.2 + h, 0);
  M.merge(g, roof);
  const parapet = M.box(w + 0.24, 0.26, d + 0.24, PAL.marbleD, { taper: 0.02 });
  M.translate(parapet, 0, 0.2 + h + 0.18, 0);
  M.merge(g, parapet);
  const stairBox = M.box(0.9, 0.5, 0.7, PAL.marble);
  M.translate(stairBox, -w * 0.28, 0.2 + h + 0.18, -0.2);
  M.merge(g, stairBox);
  for (let i = 0; i < 2; i++) {
    const unit = M.box(0.44, 0.3, 0.44, PAL.ironB);
    M.translate(unit, 0.2 + i * 0.62, 0.2 + h + 0.18, 0.3);
    M.merge(g, unit);
  }

  // croce rossa: sull'insegna e sul tetto
  const cross = (x, y, z, s, depth) => {
    const a = M.box(0.7 * s, 0.22 * s, depth, PAL.medical);
    const b = M.box(0.22 * s, 0.7 * s, depth, PAL.medical);
    M.merge(a, b);
    M.translate(a, x, y, z);
    M.merge(g, a);
  };
  cross(0, 1.55, d / 2 + 0.04, 1, 0.08);
  cross(w * 0.3, 0.2 + h + 0.62, 0.1, 1.3, 0.16);

  return { mesh: g, height: 0.2 + h + 1.1, radius: 2.1 };
}

/* -------------------------------------------------------------- fontana */

/** Vasca della fontana (i getti d'acqua sono animati a parte). */
export function buildFountain() {
  const g = M.mesh();

  // vasca ottagonale
  const outer = M.cylinder(1.85, 1.8, 0.42, 10, PAL.marbleD);
  M.merge(g, outer);
  const rim = M.cylinder(1.95, 1.9, 0.12, 10, PAL.marble);
  M.translate(rim, 0, 0.42, 0);
  M.merge(g, rim);
  const water = M.cylinder(1.72, 1.72, 0.06, 10, PAL.waterA);
  M.translate(water, 0, 0.4, 0);
  M.merge(g, water);

  // colonna centrale a due coppe
  const pedestal = M.cylinder(0.42, 0.34, 0.55, 8, PAL.marble);
  M.translate(pedestal, 0, 0.4, 0);
  M.merge(g, pedestal);
  const bowl1 = M.cylinder(0.78, 0.86, 0.16, 10, PAL.marbleD);
  M.translate(bowl1, 0, 0.95, 0);
  M.merge(g, bowl1);
  const w1 = M.cylinder(0.74, 0.74, 0.05, 10, PAL.waterA);
  M.translate(w1, 0, 1.09, 0);
  M.merge(g, w1);

  const stem = M.cylinder(0.24, 0.2, 0.5, 8, PAL.marble);
  M.translate(stem, 0, 1.11, 0);
  M.merge(g, stem);
  const bowl2 = M.cylinder(0.44, 0.5, 0.13, 9, PAL.marbleD);
  M.translate(bowl2, 0, 1.61, 0);
  M.merge(g, bowl2);
  const top = M.sphere(0.16, 6, 4, PAL.gold);
  M.translate(top, 0, 1.86, 0);
  M.merge(g, top);

  return { mesh: g, height: 2.1, radius: 1.9 };
}

/**
 * Getti d'acqua della fontana, in `phase` (0..1).
 * Cotti in pochi fotogrammi e alternati: l'acqua sembra scorrere davvero.
 */
export function buildFountainJets(phase = 0) {
  const g = M.mesh();
  const n = 10;
  const light = mixRGB(PAL.waterA, PAL.white, 0.55);
  const mid = mixRGB(PAL.waterA, PAL.white, 0.3);

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + phase * 0.6;
    const t = (phase + i / n) % 1;

    // Archetto d'acqua: tre segmenti che scendono verso la vasca. Un unico
    // cilindro verticale sembrerebbe uno stecco, non uno spruzzo.
    for (let k = 0; k < 3; k++) {
      const kt = k / 2;
      const r = 0.46 + kt * 0.52;
      const y = 1.62 + Math.sin(t * Math.PI) * 0.16 - kt * kt * 0.62;
      const sz = 0.15 - k * 0.03;
      const drop = M.box(sz, sz * 1.5, sz, k === 0 ? light : mid, { taper: 0.35 });
      M.translate(drop, Math.cos(a) * r, y, Math.sin(a) * r);
      M.merge(g, drop);
    }

    // increspature sul pelo dell'acqua
    if (i % 2 === 0) {
      const ring = M.box(0.2, 0.04, 0.14, light);
      M.translate(ring, Math.cos(a) * 1.24, 0.44, Math.sin(a) * 1.24);
      M.merge(g, ring);
    }
  }

  // zampillo centrale, corto e panciuto
  const jet = M.cylinder(0.13, 0.05, 0.34 + Math.sin(phase * Math.PI * 2) * 0.1, 6, light);
  M.translate(jet, 0, 1.88, 0);
  M.merge(g, jet);
  const crown = M.sphere(0.12, 6, 4, light);
  M.translate(crown, 0, 2.24 + Math.sin(phase * Math.PI * 2) * 0.08, 0);
  M.merge(g, crown);
  return g;
}

/* --------------------------------------------------------- arredo urbano */

/** Lampione elettrico a doppio braccio. */
export function buildCityLamp() {
  const g = M.mesh();
  const base = M.cylinder(0.24, 0.19, 0.2, 8, PAL.asphaltD);
  M.merge(g, base);
  const post = M.cylinder(0.09, 0.07, 2.5, 7, PAL.forge);
  M.translate(post, 0, 0.18, 0);
  M.merge(g, post);
  // due bracci ricurvi
  for (const sx of [-1, 1]) {
    const arm = M.box(0.5, 0.08, 0.08, PAL.forge);
    M.translate(arm, sx * 0.25, 2.6, 0);
    M.merge(g, arm);
    const head = M.box(0.36, 0.14, 0.26, PAL.forge, { taper: 0.25 });
    M.translate(head, sx * 0.48, 2.5, 0);
    M.merge(g, head);
    const light = M.box(0.3, 0.09, 0.2, PAL.neonWarm);
    M.translate(light, sx * 0.48, 2.44, 0);
    M.merge(g, light);
  }
  const capT = M.cylinder(0.11, 0.06, 0.14, 6, PAL.forge);
  M.translate(capT, 0, 2.68, 0);
  M.merge(g, capT);
  return { mesh: g, height: 2.85, radius: 0.3 };
}

/** Panchina cittadina in ghisa e listelli. */
export function buildCityBench() {
  const g = M.mesh();
  for (let i = 0; i < 4; i++) {
    const slat = M.box(1.3, 0.06, 0.11, PAL.plank);
    M.translate(slat, 0, 0.42, -0.16 + i * 0.11);
    M.merge(g, slat);
  }
  for (let i = 0; i < 3; i++) {
    const slat = M.box(1.3, 0.1, 0.06, PAL.plank);
    M.translate(slat, 0, 0.52 + i * 0.13, -0.22);
    M.merge(g, slat);
  }
  for (const sx of [-1, 1]) {
    const leg = M.box(0.1, 0.42, 0.44, PAL.forge);
    M.translate(leg, sx * 0.58, 0, 0);
    M.merge(g, leg);
    const armr = M.box(0.09, 0.24, 0.34, PAL.forge);
    M.translate(armr, sx * 0.58, 0.42, 0.02);
    M.merge(g, armr);
  }
  return { mesh: g, height: 0.92, radius: 0.62 };
}

/** Aiuola fiorita del parco. */
export function buildFlowerBed(rnd) {
  const g = M.mesh();
  const ring = M.cylinder(0.92, 0.88, 0.24, 9, PAL.brickA);
  M.merge(g, ring);
  const soil = M.cylinder(0.8, 0.8, 0.06, 9, PAL.soil);
  M.translate(soil, 0, 0.22, 0);
  M.merge(g, soil);
  const cols = [PAL.flowerA, PAL.flowerB, PAL.flowerC, PAL.shopRed];
  for (let i = 0; i < 14; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0, 0.66);
    const st = M.box(0.03, 0.2, 0.03, PAL.grassDark);
    M.translate(st, Math.cos(a) * r, 0.26, Math.sin(a) * r);
    M.merge(g, st);
    const bloom = M.cylinder(0.1, 0.09, 0.06, 5, rnd.pick(cols));
    M.translate(bloom, Math.cos(a) * r, 0.45, Math.sin(a) * r);
    M.merge(g, bloom);
  }
  return { mesh: g, height: 0.6, radius: 0.92 };
}

/** Siepe squadrata: delimita i vialetti del parco. */
export function buildHedge() {
  const g = M.mesh();
  const body = M.box(1.5, 0.72, 0.62, PAL.hedge, { taper: 0.08 });
  M.merge(g, body);
  const top = M.box(1.46, 0.1, 0.58, mixRGB(PAL.hedge, PAL.leafC, 0.4));
  M.translate(top, 0, 0.68, 0);
  M.merge(g, top);
  return { mesh: g, height: 0.82, radius: 0.78 };
}

/** Statua commemorativa al centro del parco. */
export function buildStatue() {
  const g = M.mesh();
  const base = M.box(1.15, 0.28, 1.15, PAL.marbleD);
  M.merge(g, base);
  const plinth = M.box(0.85, 1.0, 0.85, PAL.marble, { taper: 0.12 });
  M.translate(plinth, 0, 0.28, 0);
  M.merge(g, plinth);
  const plaque = M.box(0.5, 0.28, 0.06, PAL.gold);
  M.translate(plaque, 0, 0.62, 0.42);
  M.merge(g, plaque);

  // figura stilizzata del boscaiolo: chiude il cerchio con l'inizio del gioco
  const legs = M.box(0.34, 0.42, 0.26, PAL.marbleD);
  M.translate(legs, 0, 1.28, 0);
  M.merge(g, legs);
  const torso = M.box(0.42, 0.46, 0.3, PAL.marble);
  M.translate(torso, 0, 1.68, 0);
  M.merge(g, torso);
  const head = M.box(0.28, 0.3, 0.28, PAL.marble, { taper: 0.12 });
  M.translate(head, 0, 2.14, 0);
  M.merge(g, head);
  // ascia alzata
  const arm = M.box(0.13, 0.44, 0.13, PAL.marble);
  M.rotZ(arm, -0.9);
  M.translate(arm, 0.28, 1.98, 0);
  M.merge(g, arm);
  const handle = M.cylinder(0.04, 0.035, 0.6, 5, PAL.marbleD);
  M.rotZ(handle, -0.7);
  M.translate(handle, 0.5, 2.16, 0);
  M.merge(g, handle);
  const blade = M.box(0.06, 0.2, 0.26, PAL.marble, { taper: 0.4 });
  M.translate(blade, 0.86, 2.5, 0);
  M.merge(g, blade);

  return { mesh: g, height: 2.9, radius: 0.7 };
}

/** Cestino dei rifiuti: dettaglio che rende urbano un vialetto. */
export function buildBin() {
  const g = M.mesh();
  const body = M.cylinder(0.2, 0.24, 0.5, 8, PAL.hedge);
  M.translate(body, 0, 0.08, 0);
  M.merge(g, body);
  const rim = M.cylinder(0.26, 0.26, 0.06, 8, PAL.forge);
  M.translate(rim, 0, 0.58, 0);
  M.merge(g, rim);
  const post = M.box(0.07, 0.66, 0.07, PAL.forge);
  M.translate(post, 0, 0, -0.24);
  M.merge(g, post);
  return { mesh: g, height: 0.7, radius: 0.28 };
}
