/**
 * character.js — Rig procedurale del personaggio.
 *
 * Costruisce la mesh del protagonista in una posa specifica (frame di
 * animazione + direzione). L'AssetForge la usa per pre-cuocere un atlante di
 * sprite: N direzioni × M frame. A runtime disegniamo una sola immagine.
 *
 * Il personaggio è costruito guardando verso +Z (verso il basso dello schermo),
 * poi ruotato di `yaw`.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';

/* Proporzioni (in unità di mondo, altezza totale ≈ 1.55) */
const P = {
  legH: 0.46, legW: 0.19, legD: 0.21,
  hipY: 0.46,
  torsoH: 0.5, torsoW: 0.46, torsoD: 0.3,
  shoulderY: 0.96,
  armH: 0.44, armW: 0.15, armD: 0.16,
  headR: 0.2, headY: 0.98,
};

/** Numero di direzioni e frame dell'atlante (usati anche dall'AssetForge). */
export const CHAR = {
  dirs: 16,
  walkFrames: 8,
  chopFrames: 4,
};

/** Attrezzi impugnabili. */
export const TOOL = { AXE: 'axe', PICK: 'pick' };

/* --------------------------------------------------------------- attrezzo */

/** Ascia: il modello cambia con il livello di potenziamento. */
function makeAxe(level) {
  const g = M.mesh();
  const len = level >= 3 ? 0.66 : level >= 2 ? 0.6 : 0.54;

  // manico
  const handle = M.cylinder(0.032, 0.028, len, 6, PAL.handle);
  M.merge(g, handle);

  // testa
  const bladeC = level >= 3 ? PAL.steelA : level >= 2 ? PAL.ironA : PAL.stoneLight;
  const bladeD = level >= 3 ? PAL.steelB : level >= 2 ? PAL.ironB : PAL.stoneDark;
  const bw = level >= 3 ? 0.3 : level >= 2 ? 0.26 : 0.2;
  const bh = level >= 3 ? 0.2 : level >= 2 ? 0.17 : 0.14;

  const head = M.box(0.07, bh, bw, bladeD);
  M.translate(head, 0, len - bh * 0.75, 0);
  M.merge(g, head);

  // lama a cuneo (sporge in avanti)
  const blade = M.wedge(0.05, bw * 0.55, bh);
  const bladeMesh = M.box(0.045, bh * 0.92, bw * 0.5, bladeC, { taper: 0.55 });
  M.rotZ(bladeMesh, Math.PI / 2);
  M.translate(bladeMesh, 0, len - bh * 0.75 + bh * 0.46, bw * 0.5);
  M.merge(g, bladeMesh);
  void blade;

  if (level >= 3) {
    // decorazione dorata sul collo del manico
    const ring = M.cylinder(0.042, 0.042, 0.05, 6, PAL.coin);
    M.translate(ring, 0, len - bh * 1.05, 0);
    M.merge(g, ring);
  }
  return g;
}

/** Piccone: sblocca la pietra. Anche lui cresce coi potenziamenti. */
function makePickaxe(level) {
  const g = M.mesh();
  const len = level >= 2 ? 0.62 : 0.56;

  const handle = M.cylinder(0.032, 0.028, len, 6, PAL.handle);
  M.merge(g, handle);

  const headC = level >= 2 ? PAL.steelA : PAL.ironA;
  const headD = level >= 2 ? PAL.steelB : PAL.ironB;

  // testa a doppia punta, orientata lungo Z
  const core = M.box(0.075, 0.11, 0.16, headD);
  M.translate(core, 0, len - 0.09, 0);
  M.merge(g, core);

  for (const side of [1, -1]) {
    const tip = M.box(0.06, 0.085, 0.26, side > 0 ? headC : headD, { taper: 0.7 });
    M.rotX(tip, side * 0.28);
    M.translate(tip, 0, len - 0.085, side * 0.2);
    M.merge(g, tip);
  }
  if (level >= 2) {
    const ring = M.cylinder(0.042, 0.042, 0.05, 6, PAL.coin);
    M.translate(ring, 0, len - 0.17, 0);
    M.merge(g, ring);
  }
  return g;
}

/* -------------------------------------------------------------- accessori */

/** Zaino: compare/cresce con i potenziamenti. */
function makeBackpack(level) {
  const g = M.mesh();
  const w = level >= 2 ? 0.4 : 0.34;
  const h = level >= 2 ? 0.42 : 0.34;
  const body = M.box(w, h, 0.2, PAL.belt, { taper: 0.08 });
  M.translate(body, 0, P.shoulderY - h * 0.86, -P.torsoD * 0.52);
  M.merge(g, body);

  const flap = M.box(w * 0.96, 0.09, 0.21, PAL.bootUp);
  M.translate(flap, 0, P.shoulderY - h * 0.34, -P.torsoD * 0.53);
  M.merge(g, flap);
  return g;
}

/* ------------------------------------------------------------ animazione */

/**
 * Calcola i parametri di posa per un dato stato.
 * @returns {{legL:number, legR:number, armL:number, armR:number,
 *            bob:number, lean:number, roll:number, axeExtra:number}}
 */
function pose(action, t) {
  if (action === 'walk') {
    const ph = t * Math.PI * 2;
    const s = Math.sin(ph);
    return {
      legL: s * 0.72,
      legR: -s * 0.72,
      armL: -s * 0.58,
      armR: s * 0.58,
      bob: Math.abs(Math.sin(ph * 2)) * 0.055,
      lean: 0.1,
      roll: Math.cos(ph) * 0.04,
      axeExtra: 0,
    };
  }
  if (action === 'chop') {
    // 0 = carica in alto, 1 = colpo in basso (con anticipazione)
    const k = t;
    const swing = k < 0.34
      ? -1.9 - k * 0.9                        // carica
      : -2.2 + Math.pow((k - 0.34) / 0.66, 0.6) * 3.4; // discesa rapida
    return {
      legL: 0.16, legR: -0.14,
      armL: swing * 0.55, armR: swing,
      bob: k > 0.5 ? -0.05 : 0.03,
      lean: k > 0.45 ? 0.34 : -0.1,
      roll: 0,
      axeExtra: 0,
    };
  }
  // idle: respiro lento
  const s = Math.sin(t * Math.PI * 2);
  return {
    legL: 0, legR: 0,
    armL: 0.06 + s * 0.04, armR: -0.06 - s * 0.04,
    bob: s * 0.018,
    lean: 0.03,
    roll: 0,
    axeExtra: 0,
  };
}

/**
 * Costruisce la mesh del personaggio.
 * @param {object} o { yaw, action:'idle'|'walk'|'chop', t:0..1, axeLevel, bagLevel }
 */
export function buildCharacter(o) {
  const {
    yaw = 0, action = 'idle', t = 0,
    axeLevel = 1, bagLevel = 1, pickLevel = 1,
    tool = TOOL.AXE,
    skin = PAL.skin, shirt = PAL.shirt, shirtAlt = PAL.shirtAlt,
    pants = PAL.pants, hair = PAL.hair,
    withTool = true,
  } = o;
  const p = pose(action, t);
  const g = M.mesh();

  /* --- gambe (oscillano attorno all'anca) --- */
  const legMesh = (swing, side) => {
    const leg = M.box(P.legW, P.legH, P.legD, pants);
    // stivale
    const boot = M.box(P.legW * 1.1, 0.13, P.legD * 1.25, PAL.boot);
    M.translate(boot, 0, 0, 0.02);
    M.merge(leg, boot);
    M.translate(leg, side * 0.12, 0, 0);
    // pivot sull'anca
    M.rotX(leg, swing, P.hipY, 0);
    return leg;
  };
  M.merge(g, legMesh(p.legL, -1));
  M.merge(g, legMesh(p.legR, 1));

  /* --- torso --- */
  const torso = M.box(P.torsoW, P.torsoH, P.torsoD, shirt, { taper: -0.06 });
  M.translate(torso, 0, P.hipY, 0);
  // cintura
  const belt = M.box(P.torsoW * 1.04, 0.08, P.torsoD * 1.06, PAL.belt);
  M.translate(belt, 0, P.hipY + 0.01, 0);
  M.merge(torso, belt);
  // colletto
  const collar = M.box(P.torsoW * 0.86, 0.06, P.torsoD * 0.9, shirtAlt);
  M.translate(collar, 0, P.hipY + P.torsoH - 0.05, 0);
  M.merge(torso, collar);

  /* --- braccia --- */
  const armMesh = (swing, side) => {
    const arm = M.box(P.armW, P.armH, P.armD, shirtAlt);
    const hand = M.box(P.armW * 1.05, 0.11, P.armD * 1.05, skin);
    M.merge(arm, hand);
    M.translate(arm, side * (P.torsoW / 2 + P.armW / 2 - 0.02), P.shoulderY - P.armH, 0);
    M.rotX(arm, swing, P.shoulderY, 0);
    return arm;
  };
  M.merge(torso, armMesh(p.armL, -1));

  // braccio destro + attrezzo impugnato
  const rightArm = armMesh(p.armR, 1);
  if (withTool) {
    const held = tool === TOOL.PICK ? makePickaxe(pickLevel) : makeAxe(axeLevel);
    M.rotZ(held, -0.25);
    M.rotX(held, -0.5);
    // posizione della mano destra a riposo
    M.translate(held, P.torsoW / 2 + P.armW / 2 - 0.02, P.shoulderY - P.armH + 0.02, 0.04);
    M.rotX(held, p.armR, P.shoulderY, 0);
    M.merge(rightArm, held);
  }
  M.merge(torso, rightArm);

  /* --- testa --- */
  const head = M.mesh();
  const skull = M.box(P.headR * 1.8, P.headR * 1.85, P.headR * 1.7, skin, { taper: 0.12 });
  M.merge(head, skull);
  // capelli
  const hairMesh = M.box(P.headR * 1.86, P.headR * 0.72, P.headR * 1.76, hair, { taper: 0.16 });
  M.translate(hairMesh, 0, P.headR * 1.28, 0);
  M.merge(head, hairMesh);
  // ciuffo frontale
  const fringe = M.box(P.headR * 1.7, P.headR * 0.34, P.headR * 0.3, hair);
  M.translate(fringe, 0, P.headR * 1.12, P.headR * 0.74);
  M.merge(head, fringe);
  // occhi (piccoli quad scuri sulla faccia +Z)
  const eye = (side) => {
    const e = M.box(0.055, 0.075, 0.03, [40, 40, 52]);
    M.translate(e, side * 0.085, P.headR * 0.72, P.headR * 0.86);
    return e;
  };
  M.merge(head, eye(-1));
  M.merge(head, eye(1));

  M.translate(head, 0, P.headY, 0);
  M.merge(torso, head);

  /* --- zaino --- */
  if (withTool) M.merge(torso, makeBackpack(bagLevel));

  /* --- inclinazione generale del busto + rimbalzo --- */
  M.rotX(torso, p.lean, P.hipY, 0);
  M.merge(g, torso);
  M.translate(g, 0, p.bob, 0);
  if (p.roll) M.rotZ(g, p.roll, 0, 0.6);

  /* --- orientamento finale --- */
  M.rotY(g, yaw);
  return g;
}

/**
 * Mesh del tronco trasportato: un cilindro coricato lungo X.
 * Viene disegnato più volte impilato sulla schiena.
 */
export function buildCarriedLog() {
  const g = M.cylinder(0.115, 0.115, 0.62, 7, PAL.wood, { centerY: true });
  M.rotZ(g, Math.PI / 2);
  // estremità più chiare (venatura)
  const cap = (side) => {
    const c = M.cylinder(0.117, 0.117, 0.03, 7, PAL.woodEnd, { centerY: true });
    M.rotZ(c, Math.PI / 2);
    M.translate(c, side * 0.305, 0, 0);
    return c;
  };
  M.merge(g, cap(-1));
  M.merge(g, cap(1));
  return g;
}
