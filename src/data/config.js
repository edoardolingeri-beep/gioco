/**
 * config.js — Tutti i numeri "magici" del gioco in un solo posto.
 * Modificare qui per bilanciare il gameplay senza toccare la logica.
 */

export const CFG = {
  /* ---------------------------------------------------------------- render */
  render: {
    // Inclinazione della camera rispetto all'orizzonte (90° = top-down puro).
    pitchDeg: 52,
    // Pixel per unità di mondo alla risoluzione di riferimento.
    basePPU: 52,
    // Larghezza di mondo "ideale" visibile: la camera si adatta per mostrarla.
    // Valore basso = più zoom = personaggio grande e leggibile sul telefono.
    targetViewWidth: 7.6,
    minPPU: 40,
    maxPPU: 96,
    maxDPR: 2,
    shadowAlpha: 0.3,
    // Scala usata per il bake delle sprite (px per unità di mondo).
    // Viene ricalcolata all'avvio in base allo schermo (vedi `idealPPU`).
    bakePPU: 64,
    // Tetto alla risoluzione di cottura: oltre questo valore la nitidezza in
    // più non si nota, mentre la memoria occupata dalle sprite raddoppia.
    maxBakePPU: 88,
  },

  /* ---------------------------------------------------------------- camera */
  camera: {
    // Smorzamento dell'inseguimento (più alto = più reattivo).
    follow: 7.5,
    // Quanto la camera anticipa il movimento del giocatore.
    lookAhead: 1.1,
    lookAheadDamp: 3.2,
    shakeDecay: 6.5,
  },

  /* ---------------------------------------------------------------- player */
  player: {
    speed: 4.7,
    accel: 34,
    friction: 22,
    radius: 0.36,
    turnSpeed: 13,
    // Distanza entro cui si iniziano automaticamente le azioni.
    actionRange: 1.45,
    height: 1.55,
  },

  /* ------------------------------------------------------------- inventario */
  carry: {
    baseCapacity: 12,
    // Geometria della pila sulla schiena.
    stackOrigin: { x: 0, y: 1.02, z: -0.3 },
    logStep: 0.16,      // altezza di ogni tronco impilato
    logJitter: 0.05,    // disallineamento casuale (aspetto "vero")
    swayDamp: 9,
    swayGain: 0.055,
    maxLean: 0.32,
  },

  /* ---------------------------------------------------------------- harvest */
  harvest: {
    chopInterval: 0.44,   // secondi tra un colpo e l'altro
    treeHitsBase: 4,      // colpi necessari con l'ascia di livello 1
    logsPerTree: 3,
    treeRegrowDelay: 22,  // secondi prima che il ceppo ributti
    treeGrowTime: 3.5,
  },

  /* --------------------------------------------------------------- pickups */
  pickup: {
    popSpeed: 3.4,
    gravity: 16,
    magnetDelay: 0.28,   // tempo di "volo libero" prima di essere attratto
    magnetSpeed: 13,
    magnetAccel: 46,
    collectDist: 0.45,
  },

  /* -------------------------------------------------------------- consegna */
  deliver: {
    interval: 0.055,     // secondi tra un'unità e l'altra (raffica veloce)
    flightTime: 0.34,
    arcHeight: 1.6,
  },

  /* -------------------------------------------------------------- economia */
  economy: {
    prices: { wood: 2, stone: 4, iron: 9, gold: 20 },
  },

  /* ----------------------------------------------------------------- mondo */
  world: {
    seed: 20260802,
    radius: 46,          // raggio giocabile
    clearingRadius: 5.5, // radura iniziale senza alberi
    treeCount: 260,
    bushCount: 260,
    // La telecamera è ravvicinata: serve molta densità di dettagli, ma ogni
    // "chiazza" ne contiene già 5-9 in un'unica sprite (vedi buildGrassPatch).
    patchCount: 1100,
    flowerCount: 320,
    pebbleCount: 260,
    cellSize: 4,         // dimensione cella della griglia spaziale
  },

  /* ------------------------------------------------------------------- audio */
  audio: { master: 0.5 },

  /* -------------------------------------------------------------------- fx */
  fx: {
    maxParticles: 420,
    maxTexts: 40,
  },
};

/**
 * Pixel-per-unità ideali per questo schermo, in pixel FISICI.
 * Usata sia dalla camera sia dalla "fonderia" delle sprite: cuocendo alla
 * stessa scala a cui poi disegniamo, i blit non vengono mai riscalati.
 * @param {number} cssWidth  larghezza del viewport in px CSS
 * @param {number} dpr       device pixel ratio (già limitato)
 */
export function idealPPU(cssWidth, dpr) {
  const r = CFG.render;
  const css = Math.min(Math.max(cssWidth / r.targetViewWidth, r.minPPU), r.maxPPU);
  return css * dpr;
}

/** Livelli di potenziamento (Fase 1). Ognuno cambia anche il modello 3D. */
export const UPGRADES = [
  {
    id: 'axe2', label: 'Ascia di Ferro', desc: 'Abbatti gli alberi più in fretta',
    cost: 30, icon: '🪓',
    apply: (s) => { s.axeLevel = 2; },
  },
  {
    id: 'bag1', label: 'Zaino Robusto', desc: '+8 di capienza',
    cost: 60, icon: '🎒',
    apply: (s) => { s.bagLevel = 2; s.capacity += 8; },
  },
  {
    id: 'boots1', label: 'Stivali Leggeri', desc: 'Ti muovi più veloce',
    cost: 90, icon: '👢',
    apply: (s) => { s.bootsLevel = 2; s.speedMul = 1.22; },
  },
  {
    id: 'axe3', label: 'Ascia d\'Acciaio', desc: 'Un albero in due colpi',
    cost: 140, icon: '⚒️',
    apply: (s) => { s.axeLevel = 3; },
  },
];
