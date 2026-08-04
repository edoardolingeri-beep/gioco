/**
 * nature.js — Modelli low-poly della natura: alberi, cespugli, ciuffi d'erba,
 * fiori, sassi. Ogni funzione riceve un `Rand` per generare varianti uniche.
 */

import { PAL } from '../data/palette.js';
import * as M from '../render/Mesh.js';
import { mixRGB } from '../core/MathUtils.js';

/* --------------------------------------------------------------- alberi */

/** Albero "a palla": tronco + 2-3 sfere di fogliame. Il classico cartoon. */
function blobTree(rnd) {
  const g = M.mesh();
  const h = rnd.range(1.5, 2.3);
  const r = rnd.range(0.15, 0.2);

  const trunk = M.cylinder(r * 1.25, r * 0.85, h, 6, PAL.bark, { phase: rnd.range(0, 1) });
  M.merge(g, trunk);

  // radici svasate
  const flare = M.cylinder(r * 1.7, r * 1.15, 0.16, 6, PAL.barkDark);
  M.merge(g, flare);

  const leafBase = rnd.pick([PAL.leafA, PAL.leafB, PAL.leafC]);
  const blobs = rnd.int(2, 3);
  for (let i = 0; i < blobs; i++) {
    const br = rnd.range(0.5, 0.72) * (i === 0 ? 1 : 0.82);
    const s = M.sphere(br, 7, 5, mixRGB(leafBase, PAL.white, i * 0.09));
    M.scale(s, 1, 0.86, 1);
    M.translate(
      s,
      rnd.sym(0.3),
      h + rnd.range(0.05, 0.35) + i * 0.22,
      rnd.sym(0.3),
    );
    M.merge(g, s);
  }
  return { mesh: g, height: h + 1.1, radius: 0.42 };
}

/** Pino conico, tipico dei bordi della foresta. */
function pineTree(rnd) {
  const g = M.mesh();
  const h = rnd.range(0.9, 1.3);
  const trunk = M.cylinder(0.15, 0.11, h, 6, PAL.barkDark);
  M.merge(g, trunk);

  const layers = rnd.int(3, 4);
  let y = h * 0.55;
  let r = rnd.range(0.68, 0.85);
  for (let i = 0; i < layers; i++) {
    const c = M.cone(r, r * 1.35, 7, mixRGB(PAL.leafPine, PAL.white, i * 0.08));
    M.translate(c, 0, y, 0);
    M.merge(g, c);
    y += r * 0.72;
    r *= 0.74;
  }
  return { mesh: g, height: y + 0.3, radius: 0.38 };
}

/** Albero "a chioma piatta", stile savana/parco. */
function roundTree(rnd) {
  const g = M.mesh();
  const h = rnd.range(1.7, 2.1);
  const trunk = M.cylinder(0.2, 0.13, h, 5, PAL.barkLight);
  M.merge(g, trunk);

  const leafBase = rnd.pick([PAL.leafA, PAL.leafC]);
  const crown = M.cylinder(rnd.range(0.75, 0.95), rnd.range(0.5, 0.7), 0.5, 7, leafBase);
  M.translate(crown, 0, h - 0.06, 0);
  M.merge(g, crown);
  const top = M.cylinder(rnd.range(0.5, 0.66), 0.22, 0.34, 7, mixRGB(leafBase, PAL.white, 0.12));
  M.translate(top, 0, h + 0.42, 0);
  M.merge(g, top);

  return { mesh: g, height: h + 0.8, radius: 0.44 };
}

export const TREE_BUILDERS = [blobTree, blobTree, pineTree, roundTree];

/** Genera una variante d'albero completa. */
export function buildTree(rnd, kind = null) {
  const fn = kind != null ? TREE_BUILDERS[kind] : rnd.pick(TREE_BUILDERS);
  return fn(rnd);
}

/** Ceppo che resta dopo l'abbattimento. */
export function buildStump(rnd) {
  const g = M.mesh();
  const h = 0.24;
  const trunk = M.cylinder(0.26, 0.23, h, 7, PAL.barkDark);
  M.merge(g, trunk);
  const top = M.cylinder(0.235, 0.235, 0.03, 7, PAL.woodEnd);
  M.translate(top, 0, h, 0);
  M.merge(g, top);
  // anelli di crescita
  const ring = M.cylinder(0.13, 0.13, 0.032, 7, mixRGB(PAL.woodEnd, PAL.bark, 0.35));
  M.translate(ring, 0, h + 0.002, 0);
  M.merge(g, ring);
  void rnd;
  return { mesh: g, height: h, radius: 0.28 };
}

/** Alberello che ricresce dal ceppo. */
export function buildSapling(rnd) {
  const g = M.mesh();
  const trunk = M.cylinder(0.06, 0.045, 0.42, 5, PAL.bark);
  M.merge(g, trunk);
  const s = M.sphere(0.24, 6, 4, PAL.leafC);
  M.scale(s, 1, 0.8, 1);
  M.translate(s, 0, 0.5, 0);
  M.merge(g, s);
  void rnd;
  return { mesh: g, height: 0.75, radius: 0.2 };
}

/* ---------------------------------------------------------- sottobosco */

export function buildBush(rnd) {
  const g = M.mesh();
  const n = rnd.int(2, 3);
  for (let i = 0; i < n; i++) {
    const r = rnd.range(0.24, 0.4);
    const s = M.sphere(r, 6, 3, mixRGB(PAL.bush, PAL.white, rnd.range(-0.05, 0.12)));
    M.scale(s, 1, 0.72, 1);
    M.translate(s, rnd.sym(0.22), r * 0.6, rnd.sym(0.22));
    M.merge(g, s);
  }
  if (rnd.chance(0.35)) {
    // bacche
    for (let i = 0; i < 3; i++) {
      const b = M.sphere(0.055, 4, 3, PAL.clothRed);
      M.translate(b, rnd.sym(0.28), rnd.range(0.3, 0.5), rnd.range(0.1, 0.3));
      M.merge(g, b);
    }
  }
  return { mesh: g, height: 0.55, radius: 0.35 };
}

export function buildTuft(rnd) {
  const g = M.mesh();
  const blades = rnd.int(3, 5);
  const c = mixRGB(PAL.grassDark, PAL.grassLight, rnd.next());
  for (let i = 0; i < blades; i++) {
    const h = rnd.range(0.16, 0.32);
    const b = M.box(0.045, h, 0.035, c, { taper: 0.75, skew: rnd.sym(0.06) });
    M.translate(b, rnd.sym(0.12), 0, rnd.sym(0.1));
    M.merge(g, b);
  }
  return { mesh: g, height: 0.3, radius: 0.15 };
}

export function buildFlower(rnd) {
  const g = M.mesh();
  const stem = M.box(0.028, 0.22, 0.028, PAL.grassDark);
  M.merge(g, stem);
  const c = rnd.pick([PAL.flowerA, PAL.flowerB, PAL.flowerC]);
  const petals = M.cylinder(0.085, 0.075, 0.05, 5, c);
  M.translate(petals, 0, 0.21, 0);
  M.merge(g, petals);
  const heart = M.cylinder(0.032, 0.032, 0.02, 5, PAL.flowerA);
  M.translate(heart, 0, 0.255, 0);
  M.merge(g, heart);
  return { mesh: g, height: 0.28, radius: 0.1 };
}

/**
 * "Chiazza di prato": più ciuffi, qualche fiore e un sassolino cotti in
 * UNA SOLA sprite.
 *
 * È l'ottimizzazione più importante del terreno: invece di migliaia di blit
 * minuscoli (uno per filo d'erba) ne facciamo qualche decina, mantenendo
 * la stessa densità visiva.
 */
export function buildGrassPatch(rnd) {
  const g = M.mesh();
  const spread = 0.85;

  const tufts = rnd.int(4, 7);
  for (let i = 0; i < tufts; i++) {
    const t = buildTuft(rnd).mesh;
    M.scale(t, rnd.range(0.8, 1.3));
    M.translate(t, rnd.sym(spread), 0, rnd.sym(spread * 0.8));
    M.merge(g, t);
  }
  const flowers = rnd.chance(0.45) ? 1 : 0;
  for (let i = 0; i < flowers; i++) {
    const f = buildFlower(rnd).mesh;
    M.scale(f, rnd.range(0.85, 1.15));
    M.translate(f, rnd.sym(spread), 0, rnd.sym(spread * 0.8));
    M.merge(g, f);
  }
  if (rnd.chance(0.4)) {
    const p = buildPebble(rnd).mesh;
    M.scale(p, rnd.range(0.7, 1));
    M.translate(p, rnd.sym(spread), 0, rnd.sym(spread * 0.8));
    M.merge(g, p);
  }
  return { mesh: g, height: 0.35, radius: spread };
}

export function buildPebble(rnd) {
  const g = M.mesh();
  const n = rnd.int(1, 3);
  for (let i = 0; i < n; i++) {
    const r = rnd.range(0.09, 0.17);
    const s = M.sphere(r, 5, 3, mixRGB(PAL.stone, PAL.stoneLight, rnd.next()));
    M.scale(s, 1.1, 0.62, 0.95);
    M.translate(s, rnd.sym(0.16), r * 0.4, rnd.sym(0.14));
    M.merge(g, s);
  }
  return { mesh: g, height: 0.22, radius: 0.2 };
}

/** Sasso grande decorativo (diventerà raccoglibile nella Fase 2). */
export function buildRock(rnd) {
  const g = M.mesh();
  const r = rnd.range(0.4, 0.6);
  const s = M.sphere(r, 7, 5, PAL.stone);
  M.scale(s, 1.15, 0.78, 1);
  M.warp(s, (x, y, z) => [x + Math.sin(y * 9) * 0.05, y, z + Math.cos(x * 8) * 0.05]);
  M.translate(s, 0, r * 0.5, 0);
  M.merge(g, s);
  const s2 = M.sphere(r * 0.55, 5, 3, PAL.stoneDark);
  M.scale(s2, 1.1, 0.7, 1);
  M.translate(s2, r * 0.7, r * 0.3, r * 0.3);
  M.merge(g, s2);
  return { mesh: g, height: r * 1.3, radius: r * 0.9 };
}

/**
 * Masso raccoglibile col piccone (Fase 2).
 * Più grande e squadrato del sasso decorativo, con venature chiare che lo
 * rendono riconoscibile a colpo d'occhio come "risorsa".
 */
export function buildOreRock(rnd) {
  const g = M.mesh();
  const s = rnd.range(0.85, 1.15);

  // blocco principale: sfera deformata e sfaccettata
  const core = M.sphere(0.52 * s, 7, 5, PAL.stone);
  M.scale(core, 1.1, 0.86, 1);
  M.warp(core, (x, y, z) => [
    x + Math.sin(y * 7 + z * 3) * 0.06,
    y,
    z + Math.cos(x * 6 + y * 4) * 0.06,
  ]);
  M.translate(core, 0, 0.42 * s, 0);
  M.merge(g, core);

  // spuntoni secondari
  const n = rnd.int(2, 3);
  for (let i = 0; i < n; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0.18, 0.3) * s;
    const b = M.sphere(r, 5, 4, mixRGB(PAL.stone, PAL.stoneDark, rnd.range(0.1, 0.6)));
    M.scale(b, 1.2, 0.8, 1);
    M.translate(b, Math.cos(a) * 0.42 * s, r * 0.7, Math.sin(a) * 0.38 * s);
    M.merge(g, b);
  }

  // venature chiare
  for (let i = 0; i < 3; i++) {
    const v = M.box(rnd.range(0.1, 0.2) * s, 0.05, rnd.range(0.16, 0.3) * s, PAL.stoneLight);
    M.rotY(v, rnd.range(0, 3.14));
    M.translate(v, rnd.sym(0.28) * s, rnd.range(0.5, 0.78) * s, rnd.sym(0.24) * s);
    M.merge(g, v);
  }
  return { mesh: g, height: 0.95 * s, radius: 0.62 * s };
}

/** Ciò che resta di un masso frantumato: ricrescerà. */
export function buildRubble(rnd) {
  const g = M.mesh();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd.sym(0.4);
    const r = rnd.range(0.11, 0.19);
    const s = M.sphere(r, 5, 3, mixRGB(PAL.stoneDark, PAL.stone, rnd.next()));
    M.scale(s, 1.2, 0.6, 1);
    M.translate(s, Math.cos(a) * 0.24, r * 0.35, Math.sin(a) * 0.2);
    M.merge(g, s);
  }
  return { mesh: g, height: 0.22, radius: 0.34 };
}

/* ------------------------------------------------------- risorse a terra */

/** Tronco a terra (drop raccoglibile). */
export function buildLogDrop() {
  const g = M.cylinder(0.115, 0.115, 0.46, 7, PAL.wood, { centerY: true });
  M.rotZ(g, Math.PI / 2);
  const cap = (side) => {
    const c = M.cylinder(0.118, 0.118, 0.025, 7, PAL.woodEnd, { centerY: true });
    M.rotZ(c, Math.PI / 2);
    M.translate(c, side * 0.225, 0, 0);
    return c;
  };
  M.merge(g, cap(-1));
  M.merge(g, cap(1));
  M.translate(g, 0, 0.115, 0);
  return { mesh: g, height: 0.23, radius: 0.25 };
}

/** Blocco di pietra a terra (drop raccoglibile). */
export function buildStoneDrop() {
  const g = M.mesh();
  const core = M.box(0.3, 0.22, 0.26, PAL.stone, { taper: 0.22 });
  M.merge(g, core);
  const top = M.box(0.22, 0.06, 0.2, PAL.stoneLight, { taper: 0.3 });
  M.translate(top, 0, 0.2, 0);
  M.merge(g, top);
  const chip = M.box(0.12, 0.1, 0.11, PAL.stoneDark, { taper: 0.3 });
  M.translate(chip, 0.14, 0.02, 0.1);
  M.merge(g, chip);
  M.translate(g, 0, 0.02, 0);
  return { mesh: g, height: 0.28, radius: 0.22 };
}

/** Il blocco di pietra trasportato sulla schiena (impilabile). */
export function buildCarriedStone() {
  const g = M.box(0.44, 0.2, 0.34, PAL.stone, { taper: 0.16 });
  const top = M.box(0.34, 0.05, 0.26, PAL.stoneLight, { taper: 0.2 });
  M.translate(top, 0, 0.19, 0);
  M.merge(g, top);
  M.translate(g, 0, -0.1, 0);
  return g;
}

/** Pesciolino a terra (drop raccoglibile del pescatore). */
export function buildFishDrop() {
  const g = M.mesh();
  const body = M.sphere(0.14, 6, 5, PAL.fishBody);
  M.scale(body, 1.5, 0.6, 0.8);
  M.merge(g, body);
  const belly = M.sphere(0.09, 5, 4, PAL.fishBelly);
  M.scale(belly, 1.2, 0.38, 0.55);
  M.translate(belly, 0.01, -0.05, 0);
  M.merge(g, belly);
  const tail = M.sphere(0.065, 5, 4, PAL.fishFin);
  M.scale(tail, 1, 1.7, 0.3);
  M.translate(tail, -0.18, 0, 0);
  M.merge(g, tail);
  const fin = M.sphere(0.045, 4, 3, PAL.fishFin);
  M.scale(fin, 0.9, 1.2, 0.3);
  M.translate(fin, 0.02, 0.12, 0);
  M.merge(g, fin);
  M.translate(g, 0, 0.15, 0);
  return { mesh: g, height: 0.24, radius: 0.2 };
}

/** Lo stesso pesce, trasportato sulla schiena (impilabile). */
export function buildCarriedFish() {
  const g = M.mesh();
  const body = M.sphere(0.15, 6, 5, PAL.fishBody);
  M.scale(body, 1.4, 0.6, 0.78);
  M.merge(g, body);
  const belly = M.sphere(0.095, 5, 4, PAL.fishBelly);
  M.scale(belly, 1.15, 0.38, 0.52);
  M.translate(belly, 0.01, -0.04, 0);
  M.merge(g, belly);
  const tail = M.sphere(0.07, 5, 4, PAL.fishFin);
  M.scale(tail, 1, 1.6, 0.3);
  M.translate(tail, -0.19, 0, 0);
  M.merge(g, tail);
  const fin = M.sphere(0.05, 4, 3, PAL.fishFin);
  M.scale(fin, 0.9, 1.2, 0.3);
  M.translate(fin, 0.02, 0.13, 0);
  M.merge(g, fin);
  M.translate(g, 0, -0.08, 0);
  return g;
}

/** Moneta (ruotata di taglio, stile arcade). */
export function buildCoin() {
  const g = M.cylinder(0.16, 0.16, 0.04, 8, PAL.coin, { centerY: true });
  M.rotX(g, Math.PI / 2);
  const inner = M.cylinder(0.1, 0.1, 0.05, 8, PAL.coinDark, { centerY: true });
  M.rotX(inner, Math.PI / 2);
  M.merge(g, inner);
  M.translate(g, 0, 0.16, 0);
  return { mesh: g, height: 0.32, radius: 0.16 };
}
