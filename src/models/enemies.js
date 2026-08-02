/**
 * enemies.js — Modelli low-poly dei nemici (Fase 2: il lupo).
 *
 * Come per il protagonista, il lupo è un rig parametrico: l'AssetForge lo
 * cuoce in tutte le direzioni e nei frame di corsa e di morso.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';

/** Direzioni e frame dell'atlante dei nemici. */
export const ENEMY = {
  dirs: 12,
  walkFrames: 6,
  attackFrames: 3,
};

/*
 * Proporzioni del lupo. Visto dall'alto un quadrupede "realistico" si legge
 * male: lo alziamo sulle zampe e gli allarghiamo la groppa, così resta
 * riconoscibile anche quando è piccolo sullo schermo.
 */
const W = {
  bodyW: 0.42, bodyH: 0.4, bodyL: 1.0,
  bodyY: 0.5,
  legW: 0.13, legH: 0.48,
  headR: 0.24,
};

function wolfPose(action, t) {
  if (action === 'walk') {
    const ph = t * Math.PI * 2;
    const s = Math.sin(ph);
    return {
      frontL: s * 0.85, frontR: -s * 0.85,
      backL: -s * 0.8, backR: s * 0.8,
      bob: Math.abs(Math.sin(ph * 2)) * 0.05,
      headPitch: 0.05 + s * 0.05,
      tail: s * 0.5,
      jaw: 0,
      lunge: 0,
    };
  }
  if (action === 'attack') {
    // si raccoglie e poi scatta in avanti con le fauci aperte
    const k = t;
    return {
      frontL: -1.1 + k * 0.6, frontR: -1.2 + k * 0.6,
      backL: 0.5, backR: 0.4,
      bob: 0.12 * Math.sin(k * Math.PI),
      headPitch: -0.25 - k * 0.2,
      tail: 0.6,
      jaw: 0.45 + k * 0.35,
      lunge: k * 0.22,
    };
  }
  const s = Math.sin(t * Math.PI * 2);
  return {
    frontL: 0, frontR: 0, backL: 0, backR: 0,
    bob: s * 0.012, headPitch: 0.02, tail: s * 0.25, jaw: 0, lunge: 0,
  };
}

/**
 * Costruisce la mesh del lupo.
 * @param {object} o { yaw, action:'idle'|'walk'|'attack', t }
 */
export function buildWolf(o = {}) {
  const { yaw = 0, action = 'idle', t = 0 } = o;
  const p = wolfPose(action, t);
  const g = M.mesh();

  /* --- zampe --- */
  const leg = (swing, sx, sz) => {
    const l = M.box(W.legW, W.legH, W.legW * 1.15, PAL.wolfB);
    const paw = M.box(W.legW * 1.15, 0.07, W.legW * 1.4, PAL.wolfA);
    M.merge(l, paw);
    M.translate(l, sx * 0.13, 0, sz);
    M.rotX(l, swing, W.bodyY, sz);
    return l;
  };
  const zF = W.bodyL * 0.3, zB = -W.bodyL * 0.32;
  M.merge(g, leg(p.frontL, -1, zF));
  M.merge(g, leg(p.frontR, 1, zF));
  M.merge(g, leg(p.backL, -1, zB));
  M.merge(g, leg(p.backR, 1, zB));

  /* --- corpo --- */
  const body = M.box(W.bodyW, W.bodyH, W.bodyL, PAL.wolfA, { taper: 0.05 });
  M.translate(body, 0, W.bodyY, 0);
  M.merge(g, body);
  // pancia chiara
  const belly = M.box(W.bodyW * 0.82, 0.1, W.bodyL * 0.86, PAL.wolfBelly);
  M.translate(belly, 0, W.bodyY, 0);
  M.merge(g, belly);
  // groppa più alta (le spalle del predatore)
  const hump = M.box(W.bodyW * 0.9, 0.12, W.bodyL * 0.36, PAL.wolfB, { taper: 0.2 });
  M.translate(hump, 0, W.bodyY + W.bodyH - 0.02, W.bodyL * 0.16);
  M.merge(g, hump);

  /* --- coda --- */
  const tail = M.box(0.11, 0.1, 0.42, PAL.wolfB, { taper: 0.45 });
  M.rotZ(tail, 0);
  M.rotX(tail, -1.15 + p.tail * 0.25, 0, 0);
  M.rotY(tail, p.tail * 0.35);
  M.translate(tail, 0, W.bodyY + 0.16, -W.bodyL * 0.5);
  M.merge(g, tail);

  /* --- testa --- */
  const head = M.mesh();
  const skull = M.box(W.headR * 1.55, W.headR * 1.4, W.headR * 1.5, PAL.wolfA, { taper: 0.1 });
  M.merge(head, skull);
  // muso
  const snout = M.box(W.headR * 0.9, W.headR * 0.62, W.headR * 1.05, PAL.wolfB, { taper: 0.2 });
  M.translate(snout, 0, W.headR * 0.16, W.headR * 1.15);
  M.merge(head, snout);
  const nose = M.box(W.headR * 0.4, W.headR * 0.3, 0.05, [40, 40, 48]);
  M.translate(nose, 0, W.headR * 0.36, W.headR * 1.66);
  M.merge(head, nose);
  // mascella (si apre durante il morso)
  const jaw = M.box(W.headR * 0.8, W.headR * 0.3, W.headR * 0.95, PAL.wolfB);
  M.rotX(jaw, p.jaw, 0, 0);
  M.translate(jaw, 0, W.headR * 0.06, W.headR * 1.1);
  M.merge(head, jaw);
  if (p.jaw > 0.1) {
    for (const sx of [-1, 1]) {
      const fang = M.box(0.045, 0.09, 0.045, PAL.fang, { taper: 0.6 });
      M.rotZ(fang, Math.PI);
      M.translate(fang, sx * 0.06, W.headR * 0.34, W.headR * 1.4);
      M.merge(head, fang);
    }
  }
  // orecchie a punta
  for (const sx of [-1, 1]) {
    const ear = M.cone(0.075, 0.17, 4, PAL.wolfB);
    M.translate(ear, sx * 0.1, W.headR * 1.32, -0.02);
    M.merge(head, ear);
  }
  // occhi gialli
  for (const sx of [-1, 1]) {
    const eye = M.box(0.05, 0.045, 0.03, PAL.wolfEye);
    M.translate(eye, sx * 0.075, W.headR * 0.78, W.headR * 0.72);
    M.merge(head, eye);
  }

  M.rotX(head, p.headPitch, 0, 0);
  M.translate(head, 0, W.bodyY + 0.24, W.bodyL * 0.46 + p.lunge);
  M.merge(g, head);

  M.translate(g, 0, p.bob, 0);
  M.rotY(g, yaw);
  return g;
}

/** Piccolo indicatore di allerta che compare sopra il nemico. */
export function buildAlertMark() {
  const g = M.mesh();
  const bar = M.box(0.1, 0.28, 0.1, [255, 90, 80], { taper: 0.25 });
  M.translate(bar, 0, 0.12, 0);
  M.merge(g, bar);
  const dot = M.box(0.11, 0.1, 0.11, [255, 90, 80]);
  M.merge(g, dot);
  return { mesh: g, height: 0.42, radius: 0.1 };
}
