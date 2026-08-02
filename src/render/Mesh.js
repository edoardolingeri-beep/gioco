/**
 * Mesh.js — Mini libreria di geometria low-poly.
 *
 * Una mesh è un oggetto leggerissimo:
 *   { v: [x,y,z, x,y,z, ...],           // vertici
 *     f: [ {i:[a,b,c,...], c:[r,g,b], flat?:number} ] }   // facce convesse
 *
 * `flat` (opzionale) forza una luminosità fissa per la faccia: utile per
 * dettagli piatti (foglie, decalcomanie) che non devono ombreggiare.
 *
 * Tutte le operazioni di trasformazione modificano la mesh **in place** e la
 * restituiscono, così si possono concatenare. Le mesh vengono costruite una
 * sola volta in fase di bake, quindi non c'è alcun costo a runtime.
 */

/* -------------------------------------------------------------- costruzione */

export function mesh() {
  return { v: [], f: [] };
}

/** Unisce `src` dentro `dst` (rimappando gli indici). */
export function merge(dst, src) {
  const off = dst.v.length / 3;
  for (let i = 0; i < src.v.length; i++) dst.v.push(src.v[i]);
  for (const face of src.f) {
    dst.f.push({
      i: face.i.map((k) => k + off),
      c: face.c,
      flat: face.flat,
    });
  }
  return dst;
}

/** Unisce più mesh in una nuova. */
export function group(...meshes) {
  const m = mesh();
  for (const s of meshes) if (s) merge(m, s);
  return m;
}

export function clone(src) {
  return {
    v: src.v.slice(),
    f: src.f.map((f) => ({ i: f.i.slice(), c: f.c, flat: f.flat })),
  };
}

/* ------------------------------------------------------------ trasformazioni */

export function translate(m, dx, dy, dz) {
  const v = m.v;
  for (let i = 0; i < v.length; i += 3) {
    v[i] += dx; v[i + 1] += dy; v[i + 2] += dz;
  }
  return m;
}

export function scale(m, sx, sy = sx, sz = sx) {
  const v = m.v;
  for (let i = 0; i < v.length; i += 3) {
    v[i] *= sx; v[i + 1] *= sy; v[i + 2] *= sz;
  }
  return m;
}

/** Rotazione attorno all'asse Y (imbardata / direzione). */
export function rotY(m, a, px = 0, pz = 0) {
  if (!a) return m;
  const c = Math.cos(a), s = Math.sin(a), v = m.v;
  for (let i = 0; i < v.length; i += 3) {
    const x = v[i] - px, z = v[i + 2] - pz;
    v[i] = px + x * c + z * s;
    v[i + 2] = pz - x * s + z * c;
  }
  return m;
}

/** Rotazione attorno all'asse X (oscillazione avanti/indietro degli arti). */
export function rotX(m, a, py = 0, pz = 0) {
  if (!a) return m;
  const c = Math.cos(a), s = Math.sin(a), v = m.v;
  for (let i = 0; i < v.length; i += 3) {
    const y = v[i + 1] - py, z = v[i + 2] - pz;
    v[i + 1] = py + y * c - z * s;
    v[i + 2] = pz + y * s + z * c;
  }
  return m;
}

/** Rotazione attorno all'asse Z (inclinazione laterale). */
export function rotZ(m, a, px = 0, py = 0) {
  if (!a) return m;
  const c = Math.cos(a), s = Math.sin(a), v = m.v;
  for (let i = 0; i < v.length; i += 3) {
    const x = v[i] - px, y = v[i + 1] - py;
    v[i] = px + x * c - y * s;
    v[i + 1] = py + x * s + y * c;
  }
  return m;
}

/* -------------------------------------------------------------- primitive */

/**
 * Parallelepipedo. Di default è centrato su X/Z e appoggiato a terra (y da 0 a h),
 * comportamento comodissimo per costruire personaggi e edifici.
 * `taper` restringe la faccia superiore (0 = nessuna, 0.5 = metà).
 */
export function box(w, h, d, color, opts = {}) {
  const { taper = 0, centerY = false, skew = 0 } = opts;
  const hw = w / 2, hd = d / 2;
  const tw = hw * (1 - taper), td = hd * (1 - taper);
  const y0 = centerY ? -h / 2 : 0;
  const y1 = y0 + h;

  const m = mesh();
  m.v.push(
    -hw, y0, -hd,   hw, y0, -hd,   hw, y0, hd,   -hw, y0, hd,        // base
    -tw + skew, y1, -td,  tw + skew, y1, -td,  tw + skew, y1, td,  -tw + skew, y1, td, // cima
  );
  const c = color;
  m.f.push(
    { i: [4, 5, 6, 7], c },        // top
    { i: [3, 2, 1, 0], c },        // bottom
    { i: [0, 1, 5, 4], c },        // -Z (dietro)
    { i: [2, 3, 7, 6], c },        // +Z (davanti)
    { i: [1, 2, 6, 5], c },        // +X
    { i: [3, 0, 4, 7], c },        // -X
  );
  return m;
}

/**
 * Cilindro / tronco di cono lungo l'asse Y, base a y=0.
 * Con `seg` basso (5-7) si ottiene il classico look low-poly sfaccettato.
 */
export function cylinder(rBottom, rTop, h, seg, color, opts = {}) {
  const { centerY = false, cap = true, phase = 0 } = opts;
  const m = mesh();
  const y0 = centerY ? -h / 2 : 0, y1 = y0 + h;

  for (let i = 0; i < seg; i++) {
    const a = phase + (i / seg) * Math.PI * 2;
    m.v.push(Math.cos(a) * rBottom, y0, Math.sin(a) * rBottom);
  }
  for (let i = 0; i < seg; i++) {
    const a = phase + (i / seg) * Math.PI * 2;
    m.v.push(Math.cos(a) * rTop, y1, Math.sin(a) * rTop);
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    m.f.push({ i: [i, j, seg + j, seg + i], c: color });
  }
  if (cap) {
    const top = []; for (let i = 0; i < seg; i++) top.push(seg + i);
    m.f.push({ i: top, c: color });
    const bot = []; for (let i = seg - 1; i >= 0; i--) bot.push(i);
    m.f.push({ i: bot, c: color });
  }
  return m;
}

/** Cono con la punta in alto (base a y=0). */
export function cone(r, h, seg, color, opts = {}) {
  const { phase = 0 } = opts;
  const m = mesh();
  for (let i = 0; i < seg; i++) {
    const a = phase + (i / seg) * Math.PI * 2;
    m.v.push(Math.cos(a) * r, 0, Math.sin(a) * r);
  }
  m.v.push(0, h, 0);
  const apex = seg;
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    m.f.push({ i: [i, j, apex], c: color });
  }
  const bot = []; for (let i = seg - 1; i >= 0; i--) bot.push(i);
  m.f.push({ i: bot, c: color });
  return m;
}

/** Sfera a bassa risoluzione (UV sphere). Ottima per chiome e teste tonde. */
export function sphere(r, segU, segV, color) {
  const m = mesh();
  // poli
  m.v.push(0, r, 0);
  for (let vI = 1; vI < segV; vI++) {
    const phi = (vI / segV) * Math.PI;
    const y = Math.cos(phi) * r, rr = Math.sin(phi) * r;
    for (let uI = 0; uI < segU; uI++) {
      const th = (uI / segU) * Math.PI * 2;
      m.v.push(Math.cos(th) * rr, y, Math.sin(th) * rr);
    }
  }
  m.v.push(0, -r, 0);
  const bottomIdx = 1 + (segV - 1) * segU;
  const ring = (vI, uI) => 1 + (vI - 1) * segU + (uI % segU);

  for (let uI = 0; uI < segU; uI++) {
    m.f.push({ i: [0, ring(1, uI), ring(1, uI + 1)], c: color });
  }
  for (let vI = 1; vI < segV - 1; vI++) {
    for (let uI = 0; uI < segU; uI++) {
      m.f.push({
        i: [ring(vI, uI), ring(vI + 1, uI), ring(vI + 1, uI + 1), ring(vI, uI + 1)],
        c: color,
      });
    }
  }
  for (let uI = 0; uI < segU; uI++) {
    m.f.push({ i: [bottomIdx, ring(segV - 1, uI + 1), ring(segV - 1, uI)], c: color });
  }
  return m;
}

/**
 * Quad piatto orizzontale (per decalcomanie a terra: sentieri, macchie).
 * Sempre "flat" perché non deve ricevere ombreggiatura direzionale.
 */
export function ground(w, d, color, y = 0.01, bright = 1) {
  const m = mesh();
  const hw = w / 2, hd = d / 2;
  m.v.push(-hw, y, -hd, hw, y, -hd, hw, y, hd, -hw, y, hd);
  m.f.push({ i: [0, 1, 2, 3], c: color, flat: bright });
  return m;
}

/**
 * Prisma triangolare orientato lungo X — la forma perfetta per i tetti
 * a doppia falda e per le lame delle asce.
 */
export function wedge(w, h, d, color) {
  const m = mesh();
  const hw = w / 2, hd = d / 2;
  m.v.push(
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, // base
    -hw, h, 0, hw, h, 0,                            // cresta
  );
  m.f.push(
    { i: [3, 2, 5, 4], c: color },  // falda +Z
    { i: [1, 0, 4, 5], c: color },  // falda -Z
    { i: [0, 1, 2, 3], c: color },  // fondo
    { i: [1, 5, 2], c: color },     // timpano +X
    { i: [0, 3, 4], c: color },     // timpano -X
  );
  return m;
}

/* ------------------------------------------------------------------ helper */

/** Bounding box della mesh: [minX,minY,minZ, maxX,maxY,maxZ]. */
export function bounds(m) {
  const v = m.v;
  let a = Infinity, b = Infinity, c = Infinity, d = -Infinity, e = -Infinity, f = -Infinity;
  for (let i = 0; i < v.length; i += 3) {
    if (v[i] < a) a = v[i];
    if (v[i + 1] < b) b = v[i + 1];
    if (v[i + 2] < c) c = v[i + 2];
    if (v[i] > d) d = v[i];
    if (v[i + 1] > e) e = v[i + 1];
    if (v[i + 2] > f) f = v[i + 2];
  }
  return [a, b, c, d, e, f];
}

/** Applica una funzione a ogni vertice: `fn(x,y,z,i) -> [x,y,z]`. */
export function warp(m, fn) {
  const v = m.v;
  for (let i = 0; i < v.length; i += 3) {
    const r = fn(v[i], v[i + 1], v[i + 2], i / 3);
    v[i] = r[0]; v[i + 1] = r[1]; v[i + 2] = r[2];
  }
  return m;
}

/** Cambia il colore di tutte le facce (utile per varianti stagionali). */
export function recolor(m, color) {
  for (const f of m.f) f.c = color;
  return m;
}
