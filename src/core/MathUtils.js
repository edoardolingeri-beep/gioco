/**
 * MathUtils.js — Piccole utility matematiche usate ovunque.
 * Tutte le funzioni sono pure e allocation-free (importante per il GC su mobile).
 */

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);

/** Interpolazione indipendente dal frame-rate: `damp(cur, target, rate, dt)`. */
export const damp = (cur, target, rate, dt) =>
  target + (cur - target) * Math.exp(-rate * dt);

/** Differenza angolare minima nel range [-PI, PI]. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Ruota `a` verso `b` di al massimo `maxStep` radianti. */
export function angleTowards(a, b, maxStep) {
  const d = angleDelta(a, b);
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}

export const dist2 = (ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az;
  return dx * dx + dz * dz;
};

export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

/* ------------------------------------------------------------------ easing */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutQuad = (t) => t * (2 - t);
export const easeInQuad = (t) => t * t;
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t) => {
  if (t === 0 || t === 1) return t;
  const p = 0.35;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * TAU) / p) + 1;
};
/** Rimbalzo simmetrico 0→1→0, utile per i "pop". */
export const pulse = (t) => Math.sin(clamp(t, 0, 1) * Math.PI);

/* ------------------------------------------------------------------ colori */
/** Mescola due colori RGB (array [r,g,b] 0-255). */
export function mixRGB(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function rgbToCss(c) {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

/** Schiarisce/scurisce un colore RGB. `k` > 1 schiarisce. */
export function shade(c, k) {
  return [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)];
}

/** Converte "#rrggbb" in [r,g,b]. */
export function hexToRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
