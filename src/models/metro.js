/**
 * metro.js — Modelli della Fase 5: la metropoli.
 *
 * Qui il gioco affronta il suo limite più duro: un grattacielo alto, in una
 * proiezione inclinata, copre mezzo schermo e nasconde il giocatore.
 * La soluzione adottata è di tenere le torri **slanciate ma non enormi**
 * (7-9 unità) e di collocarle sempre a nord, cioè dietro l'azione: chi gioca
 * le vede svettare sullo sfondo senza mai perdersi il personaggio.
 *
 * Le parti mobili (auto, tram, semafori) sono cotte in più direzioni o stati
 * e scelte a runtime, esattamente come le pale del mulino.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';
import { mixRGB } from '../core/MathUtils.js';

/* ---------------------------------------------------------- grattacieli */

/**
 * Grattacielo a fasce di vetro.
 * @param {object} o { h, w, d, style: 0|1|2, seed }
 */
export function buildSkyscraper(o = {}) {
  // Altezze volutamente contenute: provate a 8-9 unità, le torri coprivano
  // due terzi dello schermo e il giocatore spariva sotto la facciata.
  const { h = 5.6, w = 2.5, d = 2.0, style = 0 } = o;
  const g = M.mesh();

  const bodyC = style === 1 ? PAL.towerWhite : style === 2 ? PAL.towerB : PAL.towerA;
  const glassC = style === 1 ? PAL.towerGlassD : PAL.towerGlass;

  // basamento più largo: ancora la torre al terreno
  const podium = M.box(w + 0.7, 0.8, d + 0.7, PAL.cobbleD);
  M.merge(g, podium);
  const podiumTop = M.box(w + 0.8, 0.12, d + 0.8, PAL.cobble);
  M.translate(podiumTop, 0, 0.8, 0);
  M.merge(g, podiumTop);

  // ingresso vetrato
  const lobby = M.box(w * 0.72, 0.7, 0.12, glassC);
  M.translate(lobby, 0, 0.1, (d + 0.7) / 2);
  M.merge(g, lobby);

  // fusto, con un rientro a due terzi d'altezza
  const h1 = h * 0.62, h2 = h - h1;
  const shaft = M.box(w, h1, d, bodyC, { taper: 0.04 });
  M.translate(shaft, 0, 0.9, 0);
  M.merge(g, shaft);
  const setback = M.box(w + 0.18, 0.14, d + 0.18, PAL.steelD);
  M.translate(setback, 0, 0.9 + h1, 0);
  M.merge(g, setback);
  const upper = M.box(w * 0.76, h2, d * 0.76, bodyC, { taper: 0.05 });
  M.translate(upper, 0, 0.9 + h1 + 0.14, 0);
  M.merge(g, upper);

  // fasce di finestre: sono ciò che dà la scala all'edificio
  const floors = Math.floor(h1 / 0.62);
  for (let i = 0; i < floors; i++) {
    const y = 1.25 + i * 0.62;
    const band = M.box(w + 0.03, 0.34, d + 0.03, glassC);
    M.translate(band, 0, y, 0);
    M.merge(g, band);
    // montanti verticali che spezzano la fascia
    for (let k = 0; k < 3; k++) {
      const mull = M.box(0.09, 0.36, d + 0.05, bodyC);
      M.translate(mull, -w * 0.3 + k * w * 0.3, y - 0.01, 0);
      M.merge(g, mull);
    }
  }
  const upFloors = Math.floor(h2 / 0.62);
  for (let i = 0; i < upFloors; i++) {
    const y = 1.3 + h1 + i * 0.62;
    const band = M.box(w * 0.76 + 0.03, 0.32, d * 0.76 + 0.03, glassC);
    M.translate(band, 0, y, 0);
    M.merge(g, band);
  }

  // coronamento
  const crown = M.box(w * 0.8, 0.2, d * 0.8, PAL.steel);
  M.translate(crown, 0, 0.9 + h + 0.14, 0);
  M.merge(g, crown);
  if (style === 2) {
    // guglia con luce di segnalazione
    const mast = M.cylinder(0.09, 0.05, 1.5, 6, PAL.steelD);
    M.translate(mast, 0, 0.9 + h + 0.34, 0);
    M.merge(g, mast);
    const beacon = M.sphere(0.13, 6, 4, PAL.lightRed);
    M.translate(beacon, 0, 0.9 + h + 1.9, 0);
    M.merge(g, beacon);
  } else {
    // impianti e serbatoi sul tetto
    for (let i = 0; i < 2; i++) {
      const unit = M.box(0.5, 0.34, 0.5, PAL.steelD);
      M.translate(unit, -0.5 + i * 1.0, 0.9 + h + 0.34, -0.2);
      M.merge(g, unit);
    }
    const tank = M.cylinder(0.28, 0.26, 0.5, 8, PAL.steel);
    M.translate(tank, 0.3, 0.9 + h + 0.34, 0.4);
    M.merge(g, tank);
  }

  return { mesh: g, height: 0.9 + h + 2, radius: Math.max(w, d) * 0.62 + 0.35 };
}

/* ------------------------------------------------------------- stazione */

/** Stazione del tram: pensilina, banchina e tabellone. */
export function buildStation() {
  const g = M.mesh();
  const w = 4.4, d = 1.9;

  // banchina rialzata
  const platform = M.box(w, 0.34, d, PAL.cobble);
  M.merge(g, platform);
  const edge = M.box(w + 0.06, 0.1, 0.24, PAL.lightAmber);
  M.translate(edge, 0, 0.34, d / 2 - 0.02);
  M.merge(g, edge);

  // corpo con biglietteria
  const office = M.box(1.7, 1.6, d - 0.2, PAL.towerWhite);
  M.translate(office, -w / 2 + 0.95, 0.34, -0.1);
  M.merge(g, office);
  const win = M.box(1.0, 0.7, 0.1, PAL.glassA);
  M.translate(win, -w / 2 + 0.95, 0.9, d / 2 - 0.18);
  M.merge(g, win);

  // pensilina a sbalzo su pilastrini
  for (let i = 0; i < 3; i++) {
    const post = M.cylinder(0.08, 0.07, 2.1, 6, PAL.steelD);
    M.translate(post, -0.4 + i * 1.5, 0.34, -d / 2 + 0.25);
    M.merge(g, post);
  }
  const canopy = M.box(w * 0.66, 0.12, d + 0.5, PAL.steel);
  M.rotX(canopy, -0.1);
  M.translate(canopy, 0.75, 2.42, 0);
  M.merge(g, canopy);
  const canopyEdge = M.box(w * 0.66, 0.14, 0.12, PAL.tramGreen);
  M.translate(canopyEdge, 0.75, 2.3, (d + 0.5) / 2);
  M.merge(g, canopyEdge);

  // tabellone orari
  const board = M.box(1.0, 0.5, 0.08, PAL.carDark);
  M.translate(board, 1.3, 1.5, -d / 2 + 0.2);
  M.merge(g, board);
  for (let i = 0; i < 3; i++) {
    const line = M.box(0.72, 0.06, 0.05, PAL.lightAmber);
    M.translate(line, 1.3, 1.62 + i * 0.13, -d / 2 + 0.16);
    M.merge(g, line);
  }

  // panchina in banchina
  const bench = M.box(1.1, 0.09, 0.32, PAL.plank);
  M.translate(bench, 1.5, 0.72, 0.3);
  M.merge(g, bench);
  for (const sx of [-1, 1]) {
    const leg = M.box(0.08, 0.38, 0.3, PAL.forge);
    M.translate(leg, 1.5 + sx * 0.45, 0.34, 0.3);
    M.merge(g, leg);
  }

  return { mesh: g, height: 2.6, radius: 2.3 };
}

/* ------------------------------------------------------------- fabbrica */

/** Fabbrica con capannone a shed e ciminiere fumanti. */
export function buildFactory() {
  const g = M.mesh();
  const w = 4.6, d = 2.4, h = 2.0;

  const base = M.box(w + 0.3, 0.2, d + 0.3, PAL.cobbleD);
  M.merge(g, base);
  const body = M.box(w, h, d, PAL.brickB);
  M.translate(body, 0, 0.2, 0);
  M.merge(g, body);
  // corsi di mattoni
  for (let i = 0; i < 3; i++) {
    const course = M.box(w + 0.04, 0.08, d + 0.04, PAL.brickA);
    M.translate(course, 0, 0.5 + i * 0.6, 0);
    M.merge(g, course);
  }

  // portone industriale e finestre a nastro
  const gate = M.box(1.5, 1.25, 0.12, PAL.steelD);
  M.translate(gate, -1.1, 0.2, d / 2);
  M.merge(g, gate);
  for (let i = 0; i < 4; i++) {
    const win = M.box(0.62, 0.55, 0.08, PAL.glassB);
    M.translate(win, 0.4 + (i % 2) * 0.8, 0.7 + Math.floor(i / 2) * 0.75, d / 2 + 0.01);
    M.merge(g, win);
  }

  // tetto a shed: la silhouette inconfondibile dell'archeologia industriale
  const sheds = 4;
  for (let i = 0; i < sheds; i++) {
    const x = -w / 2 + (w / sheds) * (i + 0.5);
    const slope = M.box(w / sheds - 0.05, 0.12, d * 0.62, PAL.steel);
    M.rotX(slope, -0.5, 0, 0);
    M.translate(slope, x, 0.2 + h + 0.26, 0.2);
    M.merge(g, slope);
    const glass = M.box(w / sheds - 0.12, 0.5, 0.1, PAL.glassB);
    M.translate(glass, x, 0.2 + h + 0.1, -0.42);
    M.merge(g, glass);
  }

  // ciminiere
  for (let i = 0; i < 2; i++) {
    const x = w * 0.32 - i * 1.1;
    const stack = M.cylinder(0.3, 0.24, 2.6, 8, PAL.brickA);
    M.translate(stack, x, 0.2 + h, -0.6);
    M.merge(g, stack);
    for (let k = 0; k < 3; k++) {
      const ring = M.cylinder(0.32, 0.3, 0.1, 8, PAL.brickB);
      M.translate(ring, x, 0.2 + h + 0.6 + k * 0.8, -0.6);
      M.merge(g, ring);
    }
    const rim = M.cylinder(0.28, 0.32, 0.16, 8, PAL.carDark);
    M.translate(rim, x, 0.2 + h + 2.55, -0.6);
    M.merge(g, rim);
  }

  // silo laterale
  const silo = M.cylinder(0.62, 0.58, 2.2, 9, PAL.steel);
  M.translate(silo, -w / 2 - 0.5, 0.2, -0.3);
  M.merge(g, silo);
  const siloTop = M.cone(0.66, 0.5, 9, PAL.steelD);
  M.translate(siloTop, -w / 2 - 0.5, 2.4, -0.3);
  M.merge(g, siloTop);

  return { mesh: g, height: 0.2 + h + 3.0, radius: 2.7 };
}

/* ------------------------------------------------------------ aeroporto */

/** Aeroporto: torre di controllo, hangar, aereo in sosta. */
export function buildAirport() {
  const g = M.mesh();

  // piazzale
  const apron = M.box(6.4, 0.14, 3.4, PAL.runway);
  M.merge(g, apron);
  for (let i = 0; i < 5; i++) {
    const line = M.box(0.7, 0.05, 0.12, PAL.roadLine);
    M.translate(line, -2.4 + i * 1.2, 0.14, 1.3);
    M.merge(g, line);
  }

  // torre di controllo
  const shaft = M.cylinder(0.5, 0.42, 3.2, 8, PAL.towerWhite);
  M.translate(shaft, -2.2, 0.14, -0.9);
  M.merge(g, shaft);
  const cabin = M.cylinder(0.95, 0.8, 0.75, 8, PAL.glassB);
  M.translate(cabin, -2.2, 3.3, -0.9);
  M.merge(g, cabin);
  const cabTop = M.cylinder(1.0, 0.86, 0.14, 8, PAL.steel);
  M.translate(cabTop, -2.2, 4.05, -0.9);
  M.merge(g, cabTop);
  const radar = M.box(0.08, 0.5, 0.08, PAL.steelD);
  M.translate(radar, -2.2, 4.19, -0.9);
  M.merge(g, radar);
  const dish = M.cylinder(0.3, 0.1, 0.12, 8, PAL.steel);
  M.rotZ(dish, 0.5);
  M.translate(dish, -2.2, 4.7, -0.9);
  M.merge(g, dish);

  // hangar a volta
  const hangarW = 3.0;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const a = t * Math.PI;
    const rr = 1.3;
    const seg = M.box(0.42, 0.12, 1.9, i % 2 === 0 ? PAL.steel : PAL.steelD);
    M.rotZ(seg, a - Math.PI / 2);
    M.translate(seg, 1.6 + Math.cos(a) * rr, 0.14 + Math.sin(a) * rr, -0.7);
    M.merge(g, seg);
  }
  const hangarBack = M.box(hangarW * 0.86, 1.3, 0.12, PAL.steelD);
  M.translate(hangarBack, 1.6, 0.14, -1.62);
  M.merge(g, hangarBack);

  // aereo in sosta
  const plane = M.mesh();
  const fus = M.cylinder(0.28, 0.2, 2.5, 8, PAL.carWhite, { centerY: true });
  M.rotX(fus, Math.PI / 2);
  M.merge(plane, fus);
  const nose = M.cone(0.26, 0.4, 8, PAL.carWhite);
  M.rotX(nose, Math.PI / 2);
  M.translate(nose, 0, 0, 1.25);
  M.merge(plane, nose);
  const wing = M.box(3.0, 0.09, 0.6, PAL.towerWhite, { taper: 0.25 });
  M.merge(plane, wing);
  const tailWing = M.box(1.1, 0.08, 0.32, PAL.towerWhite, { taper: 0.3 });
  M.translate(tailWing, 0, 0.12, -1.05);
  M.merge(plane, tailWing);
  const fin = M.box(0.09, 0.62, 0.5, PAL.carBlue, { taper: 0.35 });
  M.translate(fin, 0, 0.1, -1.05);
  M.merge(plane, fin);
  for (const sx of [-1, 1]) {
    const engine = M.cylinder(0.16, 0.14, 0.5, 7, PAL.steelD, { centerY: true });
    M.rotX(engine, Math.PI / 2);
    M.translate(engine, sx * 0.95, -0.18, 0.1);
    M.merge(plane, engine);
  }
  M.rotY(plane, 0.35);
  M.translate(plane, 1.5, 0.75, 1.0);
  M.merge(g, plane);

  return { mesh: g, height: 5.0, radius: 3.4 };
}

/* -------------------------------------------------------------- veicoli */

/**
 * Automobile.
 * @param {number[]} color carrozzeria
 * @param {number} kind 0 = berlina, 1 = furgone
 */
export function buildCar(color, kind = 0) {
  const g = M.mesh();
  const len = kind === 1 ? 2.3 : 1.95;
  const wid = 0.95;

  // scocca
  const body = M.box(wid, 0.42, len, color, { taper: 0.06 });
  M.translate(body, 0, 0.26, 0);
  M.merge(g, body);
  // paraurti
  for (const sz of [-1, 1]) {
    const bump = M.box(wid * 0.95, 0.14, 0.12, PAL.carDark);
    M.translate(bump, 0, 0.24, sz * (len / 2 - 0.02));
    M.merge(g, bump);
  }

  if (kind === 1) {
    // Furgone: cassone squadrato ma non troppo alto — visto dall'alto un
    // cubo bianco enorme cancellerebbe il resto del veicolo.
    const box2 = M.box(wid * 0.98, 0.56, len * 0.6, PAL.carWhite, { taper: 0.03 });
    M.translate(box2, 0, 0.66, -len * 0.16);
    M.merge(g, box2);
    const boxRoof = M.box(wid * 0.99, 0.08, len * 0.61, color);
    M.translate(boxRoof, 0, 1.2, -len * 0.16);
    M.merge(g, boxRoof);
    // fascia laterale in tinta con la cabina
    const stripe = M.box(wid + 0.02, 0.12, len * 0.58, color);
    M.translate(stripe, 0, 0.78, -len * 0.16);
    M.merge(g, stripe);
    const cab = M.box(wid * 0.94, 0.42, len * 0.3, color, { taper: 0.12 });
    M.translate(cab, 0, 0.68, len * 0.31);
    M.merge(g, cab);
    const wind = M.box(wid * 0.8, 0.3, 0.08, PAL.carGlass);
    M.translate(wind, 0, 0.74, len * 0.45);
    M.merge(g, wind);
  } else {
    // berlina: abitacolo arretrato e parabrezza inclinato
    const cabin = M.box(wid * 0.88, 0.4, len * 0.5, color, { taper: 0.14 });
    M.translate(cabin, 0, 0.66, -0.05);
    M.merge(g, cabin);
    const roof = M.box(wid * 0.74, 0.06, len * 0.42, mixRGB(color, PAL.white, 0.15));
    M.translate(roof, 0, 1.05, -0.05);
    M.merge(g, roof);
    const wind = M.box(wid * 0.76, 0.3, 0.08, PAL.carGlass);
    M.translate(wind, 0, 0.7, len * 0.2);
    M.merge(g, wind);
    const rear = M.box(wid * 0.72, 0.26, 0.08, PAL.carGlass);
    M.translate(rear, 0, 0.72, -len * 0.29);
    M.merge(g, rear);
    for (const sx of [-1, 1]) {
      const side = M.box(0.07, 0.24, len * 0.34, PAL.carGlass);
      M.translate(side, sx * wid * 0.44, 0.72, -0.05);
      M.merge(g, side);
    }
  }

  // fari e stop
  for (const sx of [-1, 1]) {
    const head = M.box(0.2, 0.11, 0.07, PAL.neonWarm);
    M.translate(head, sx * 0.28, 0.4, len / 2 - 0.01);
    M.merge(g, head);
    const tail = M.box(0.18, 0.1, 0.07, PAL.lightRed);
    M.translate(tail, sx * 0.28, 0.42, -len / 2 + 0.01);
    M.merge(g, tail);
  }

  // ruote
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = M.cylinder(0.21, 0.21, 0.14, 8, PAL.carDark, { centerY: true });
      M.rotZ(wheel, Math.PI / 2);
      M.translate(wheel, sx * (wid / 2 - 0.02), 0.21, sz * len * 0.31);
      M.merge(g, wheel);
    }
  }
  return g;
}

/** Tram a due casse, con presa di corrente sul tetto. */
export function buildTram() {
  const g = M.mesh();
  const len = 4.6, wid = 1.25;

  const carBody = (z, l) => {
    const b = M.box(wid, 0.95, l, PAL.tramCream, { taper: 0.04 });
    M.translate(b, 0, 0.42, z);
    M.merge(g, b);
    // fascia verde e finestrini
    const band = M.box(wid + 0.03, 0.42, l - 0.1, PAL.tramGreen);
    M.translate(band, 0, 0.44, z);
    M.merge(g, band);
    const glassBand = M.box(wid + 0.04, 0.34, l * 0.82, PAL.carGlass);
    M.translate(glassBand, 0, 0.96, z);
    M.merge(g, glassBand);
    // montanti
    const n = Math.round(l / 0.55);
    for (let i = 0; i <= n; i++) {
      const mull = M.box(wid + 0.06, 0.36, 0.07, PAL.tramCream);
      M.translate(mull, 0, 0.95, z - l / 2 + (l / n) * i);
      M.merge(g, mull);
    }
    // tetto
    const roof = M.box(wid * 0.96, 0.12, l, PAL.tramCream, { taper: 0.1 });
    M.translate(roof, 0, 1.32, z);
    M.merge(g, roof);
  };

  carBody(len * 0.26, len * 0.44);
  carBody(-len * 0.26, len * 0.44);
  // soffietto centrale
  const bellows = M.box(wid * 0.9, 0.9, 0.42, PAL.carDark);
  M.translate(bellows, 0, 0.44, 0);
  M.merge(g, bellows);

  // muso e coda
  for (const sz of [-1, 1]) {
    const front = M.box(wid * 0.94, 0.5, 0.18, PAL.tramGreen, { taper: 0.15 });
    M.translate(front, 0, 0.44, sz * (len / 2 - 0.05));
    M.merge(g, front);
    const wind = M.box(wid * 0.8, 0.38, 0.08, PAL.carGlass);
    M.translate(wind, 0, 0.94, sz * (len / 2 - 0.02));
    M.merge(g, wind);
    const lamp = M.box(0.5, 0.1, 0.06, sz > 0 ? PAL.neonWarm : PAL.lightRed);
    M.translate(lamp, 0, 0.56, sz * (len / 2 + 0.01));
    M.merge(g, lamp);
  }

  // pantografo
  const pan1 = M.box(0.06, 0.34, 0.06, PAL.steelD);
  M.rotX(pan1, 0.5);
  M.translate(pan1, 0, 1.44, 0.2);
  M.merge(g, pan1);
  const pan2 = M.box(0.06, 0.34, 0.06, PAL.steelD);
  M.rotX(pan2, -0.5);
  M.translate(pan2, 0, 1.44, -0.2);
  M.merge(g, pan2);
  const shoe = M.box(0.6, 0.06, 0.1, PAL.steel);
  M.translate(shoe, 0, 1.74, 0);
  M.merge(g, shoe);

  // carrelli
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const wheel = M.cylinder(0.19, 0.19, 0.1, 8, PAL.carDark, { centerY: true });
      M.rotZ(wheel, Math.PI / 2);
      M.translate(wheel, sx * (wid / 2 - 0.06), 0.19, sz * len * 0.3);
      M.merge(g, wheel);
    }
  }
  return g;
}

/* -------------------------------------------------------------- semaforo */

/**
 * Semaforo. `state` 0 = verde, 1 = giallo, 2 = rosso.
 * Cotto nei tre stati: cambiarlo costa quanto scegliere una sprite diversa.
 */
export function buildTrafficLight(state = 0) {
  const g = M.mesh();
  const base = M.cylinder(0.22, 0.18, 0.16, 8, PAL.carDark);
  M.merge(g, base);
  const post = M.cylinder(0.08, 0.07, 2.2, 7, PAL.carDark);
  M.translate(post, 0, 0.14, 0);
  M.merge(g, post);

  // testata con tre luci verso +Z
  const head = M.box(0.34, 0.86, 0.28, PAL.carDark, { taper: 0.06 });
  M.translate(head, 0, 2.0, 0.06);
  M.merge(g, head);
  const cols = [PAL.lightRed, PAL.lightAmber, PAL.lightGreen];
  const onIndex = state === 2 ? 0 : state === 1 ? 1 : 2;
  for (let i = 0; i < 3; i++) {
    const lit = i === onIndex;
    const bulb = M.box(0.2, 0.2, 0.1, lit ? cols[i] : mixRGB(cols[i], PAL.carDark, 0.75));
    M.translate(bulb, 0, 2.62 - i * 0.27, 0.2);
    M.merge(g, bulb);
    // visierina
    const visor = M.box(0.28, 0.05, 0.14, PAL.carDark);
    M.translate(visor, 0, 2.74 - i * 0.27, 0.24);
    M.merge(g, visor);
  }
  return { mesh: g, height: 2.9, radius: 0.24 };
}

/* ---------------------------------------------------------------- varie */

/** Fermata: paletta della linea del tram. */
export function buildTramStop() {
  const g = M.mesh();
  const post = M.cylinder(0.07, 0.06, 2.0, 6, PAL.steelD);
  M.merge(g, post);
  const sign = M.box(0.5, 0.44, 0.06, PAL.tramGreen);
  M.translate(sign, 0, 1.7, 0.04);
  M.merge(g, sign);
  const inner = M.box(0.34, 0.28, 0.08, PAL.tramCream);
  M.translate(inner, 0, 1.78, 0.05);
  M.merge(g, inner);
  return { mesh: g, height: 2.2, radius: 0.2 };
}

/** Chiosco dei giornali: arredo minuto della metropoli. */
export function buildKiosk() {
  const g = M.mesh();
  const body = M.box(1.2, 1.5, 1.0, PAL.tramGreen, { taper: 0.05 });
  M.merge(g, body);
  const counter = M.box(1.3, 0.12, 0.5, PAL.plankDark);
  M.translate(counter, 0, 1.0, 0.6);
  M.merge(g, counter);
  const roof = M.box(1.5, 0.14, 1.35, PAL.tramCream);
  M.translate(roof, 0, 1.5, 0.1);
  M.merge(g, roof);
  const awn = M.box(1.5, 0.1, 0.5, PAL.shopRed);
  M.rotX(awn, -0.3);
  M.translate(awn, 0, 1.42, 0.75);
  M.merge(g, awn);
  // giornali esposti
  for (let i = 0; i < 3; i++) {
    const paper = M.box(0.26, 0.04, 0.3, PAL.carWhite);
    M.rotX(paper, -0.5);
    M.translate(paper, -0.36 + i * 0.36, 1.12, 0.62);
    M.merge(g, paper);
  }
  return { mesh: g, height: 1.7, radius: 0.85 };
}
