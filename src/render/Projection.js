/**
 * Projection.js — Proiezione ortografica inclinata (2.5D).
 *
 * Il mondo è in 3D: X = est/ovest, Y = altezza, Z = sud (verso lo schermo).
 * La camera guarda dall'alto con un'inclinazione fissa e NON ruota mai:
 * questo è ciò che ci permette di "cuocere" (bake) ogni mesh in una sprite
 * una sola volta e poi disegnarla come immagine — velocissimo su mobile.
 *
 *   screenX = x
 *   screenY = z * SIN_P - y * COS_P
 *
 * (in unità di mondo; il Renderer moltiplica poi per i pixel-per-unità)
 */

import { CFG } from '../data/config.js';

const PITCH = (CFG.render.pitchDeg * Math.PI) / 180;

/** Compressione dell'asse Z (piano di terra). */
export const SIN_P = Math.sin(PITCH);
/** Scala dell'altezza Y sullo schermo. */
export const COS_P = Math.cos(PITCH);

/** Direzione dalla superficie verso la camera (normalizzata). */
export const CAM_DIR = [0, SIN_P, COS_P];

/** Direzione della luce principale (normalizzata), da dietro-sinistra-alto. */
const L = [-0.42, 0.86, 0.29];
const LLEN = Math.hypot(L[0], L[1], L[2]);
export const LIGHT_DIR = [L[0] / LLEN, L[1] / LLEN, L[2] / LLEN];

/** Proietta un punto 3D in coordinate schermo (unità di mondo). */
export function project(x, y, z, out) {
  out[0] = x;
  out[1] = z * SIN_P - y * COS_P;
  return out;
}

/** Solo la componente verticale schermo (usata spessissimo). */
export const projectY = (y, z) => z * SIN_P - y * COS_P;

/**
 * Profondità di ordinamento: valori più alti = più vicino alla camera,
 * quindi vanno disegnati per ultimi (algoritmo del pittore).
 */
export const depthOf = (y, z) => y * SIN_P + z * COS_P;

/** Converte un delta schermo (px) in delta di mondo sul piano di terra. */
export function screenDeltaToWorld(dx, dy, ppu, out) {
  out[0] = dx / ppu;
  out[1] = dy / (ppu * SIN_P);
  return out;
}
