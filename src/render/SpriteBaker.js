/**
 * SpriteBaker.js — Converte una mesh low-poly in una sprite (canvas offscreen).
 *
 * Poiché la camera ha un'inclinazione FISSA e non ruota mai, ogni mesh viene
 * proiettata sempre allo stesso modo: possiamo quindi rasterizzarla una volta
 * sola all'avvio e poi limitarci a fare `drawImage` ad ogni frame.
 * È la chiave delle prestazioni su smartphone: niente centinaia di path da
 * riempire per frame, solo blit.
 *
 * Il risultato è una "Sprite":
 *   { canvas, w, h, ax, ay }
 * dove (ax, ay) è la posizione dell'origine del mondo (0,0,0) dentro il canvas.
 */

import { CFG } from '../data/config.js';
import { SIN_P, COS_P, CAM_DIR, LIGHT_DIR } from './Projection.js';
import { clamp } from '../core/MathUtils.js';

const AMBIENT = 0.52;
const DIFFUSE = 0.48;
// Leggero "rim light" freddo sulle facce rivolte verso la camera-basso.
const RIM = 0.06;

/** Crea un canvas offscreen (usa OffscreenCanvas se disponibile). */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
}

/**
 * Cuoce una mesh in una sprite.
 * @param {object} m       mesh
 * @param {object} opts    { ppu, pad, outline, alpha }
 */
export function bakeMesh(m, opts = {}) {
  const ppu = opts.ppu ?? CFG.render.bakePPU;
  // Il contorno cartoon sborda: allarghiamo il bordo di conseguenza.
  const pad = opts.pad ?? Math.ceil(2 + (opts.outline ?? 0));
  const v = m.v;
  const n = v.length / 3;

  // --- 1. proiezione dei vertici in pixel ---------------------------------
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
    const sx = x * ppu;
    const sy = (z * SIN_P - y * COS_P) * ppu;
    px[i] = sx; py[i] = sy;
    if (sx < minX) minX = sx;
    if (sy < minY) minY = sy;
    if (sx > maxX) maxX = sx;
    if (sy > maxY) maxY = sy;
  }

  const w = Math.ceil(maxX - minX) + pad * 2;
  const h = Math.ceil(maxY - minY) + pad * 2;
  const ax = -minX + pad;   // dove finisce l'origine del mondo
  const ay = -minY + pad;

  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.translate(ax, ay);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;

  // --- 2. selezione e ordinamento delle facce -----------------------------
  const faces = [];
  for (const f of m.f) {
    const idx = f.i;
    // normale con Newell (robusta anche per poligoni non perfettamente piani)
    let nx = 0, ny = 0, nz = 0;
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < idx.length; k++) {
      const a = idx[k] * 3, b = idx[(k + 1) % idx.length] * 3;
      const ax1 = v[a], ay1 = v[a + 1], az1 = v[a + 2];
      const bx1 = v[b], by1 = v[b + 1], bz1 = v[b + 2];
      nx += (ay1 - by1) * (az1 + bz1);
      ny += (az1 - bz1) * (ax1 + bx1);
      nz += (ax1 - bx1) * (ay1 + by1);
      cx += ax1; cy += ay1; cz += az1;
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    const facing = nx * CAM_DIR[0] + ny * CAM_DIR[1] + nz * CAM_DIR[2];
    if (facing <= 0.0001) continue;              // backface culling

    const k = 1 / idx.length;
    cx *= k; cy *= k; cz *= k;
    // profondità: più alto = più vicino alla camera → disegnato dopo
    const depth = cy * CAM_DIR[1] + cz * CAM_DIR[2] + cx * CAM_DIR[0];

    // --- 3. illuminazione flat ---
    let light;
    if (f.flat != null) {
      light = f.flat;
    } else {
      const nl = nx * LIGHT_DIR[0] + ny * LIGHT_DIR[1] + nz * LIGHT_DIR[2];
      light = AMBIENT + DIFFUSE * Math.max(0, nl) + RIM * facing;
    }
    const c = f.c;
    const r = clamp(c[0] * light, 0, 255) | 0;
    const g = clamp(c[1] * light, 0, 255) | 0;
    const b = clamp(c[2] * light, 0, 255) | 0;

    faces.push({ idx, depth, css: `rgb(${r},${g},${b})` });
  }
  faces.sort((a, b) => a.depth - b.depth);

  // --- 4. rasterizzazione -------------------------------------------------
  // Ogni faccia viene anche "strokata" con il proprio colore: elimina le
  // fessure di anti-aliasing tra facce adiacenti senza costi percettibili.
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1;
  for (const f of faces) {
    ctx.beginPath();
    const idx = f.idx;
    ctx.moveTo(px[idx[0]], py[idx[0]]);
    for (let k = 1; k < idx.length; k++) ctx.lineTo(px[idx[k]], py[idx[k]]);
    ctx.closePath();
    ctx.fillStyle = f.css;
    ctx.strokeStyle = f.css;
    ctx.fill();
    ctx.stroke();
  }

  // --- 5. contorno cartoon opzionale --------------------------------------
  if (opts.outline) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.outline;
    ctx.strokeStyle = 'rgba(24,26,38,0.5)';
    for (const f of faces) {
      ctx.beginPath();
      const idx = f.idx;
      ctx.moveTo(px[idx[0]], py[idx[0]]);
      for (let k = 1; k < idx.length; k++) ctx.lineTo(px[idx[k]], py[idx[k]]);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  return { canvas, w, h, ax, ay, ppu };
}

/**
 * Sprite dell'ombra: un'ellisse sfumata, schiacciata secondo la proiezione.
 * Ne cuociamo una sola e la riusiamo scalata per ogni entità.
 */
export function bakeShadow(size = 96) {
  const h = Math.max(2, Math.round(size * SIN_P));
  const canvas = makeCanvas(size, h);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, h / 2, 0, size / 2, h / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.72)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(size / 2, h / 2);
  ctx.scale(1, SIN_P);
  ctx.translate(-size / 2, -h / (2 * SIN_P));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  return { canvas, w: size, h, ax: size / 2, ay: h / 2 };
}

/** Sprite radiale morbida usata per bagliori, particelle e alone. */
export function bakeGlow(size, color, softness = 0.5) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},1)`);
  g.addColorStop(softness, `rgba(${color[0]},${color[1]},${color[2]},0.45)`);
  g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return { canvas, w: size, h: size, ax: size / 2, ay: size / 2 };
}
