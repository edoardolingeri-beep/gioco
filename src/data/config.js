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
    // Salute e combattimento (Fase 2)
    maxHp: 100,
    regenDelay: 5,      // secondi senza danni prima di rigenerare
    regenRate: 7,       // punti al secondo
    invulnTime: 0.6,    // invulnerabilità dopo un colpo
    attackRange: 1.5,
    attackInterval: 0.5,
    baseDamage: 12,
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
    // Pietra (Fase 2)
    rockHits: 6,          // picconate con il piccone di livello 1
    stonePerRock: 2,
    rockRegrowDelay: 30,
    // Ferro (Fase 3): richiede il piccone d'acciaio
    ironHits: 9,
    ironPerVein: 2,
    ironRegrowDelay: 45,
    // Oro (Fase 4): raro, richiede il piccone da minatore
    goldHits: 13,
    goldPerVein: 1,
    goldRegrowDelay: 70,
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
    prices: { wood: 2, stone: 5, iron: 14, gold: 46 },
  },

  /* ------------------------------------------------------------- fiume */
  river: {
    baseZ: -19,     // posizione media del corso
    width: 4.6,
    amp1: 2.2,      // serpeggiamento principale
    amp2: 1.3,      // seconda armonica: rende il corso meno regolare
  },

  /* ------------------------------------------------------------- villaggio */
  village: {
    fenceRadius: 8.6,     // raggio della staccionata perimetrale
    fenceSegments: 44,
    safeRadius: 10,       // dentro questo raggio i nemici non compaiono
  },

  /* -------------------------------------------------------------- abitanti */
  npc: {
    speed: 1.85,
    maxCount: 46,
  },

  /* ---------------------------------------------------------------- nemici */
  enemies: {
    firstWaveDelay: 25,
    spawnInterval: [14, 26],
    baseMax: 2,
    maxTotal: 7,
    minSpawnDist: 9,
    maxSpawnDist: 22,
    wolf: {
      hp: 34,
      speed: 3.5,
      damage: 9,
      aggroRange: 7.5,
      leashRange: 15,
      attackRange: 1.25,
      attackTime: 0.55,
      attackCooldown: 1.15,
      wanderRadius: 6,
      stealChance: 0.35,
      reward: 4,          // monete per ogni lupo abbattuto
    },
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
    rockCount: 90,        // massi raccoglibili col piccone (Fase 2)
    ironCount: 55,        // vene di ferro, solo oltre il fiume (Fase 3)
    goldCount: 20,        // filoni d'oro, rari e lontani (Fase 4)
    patchCount: 1100,
    flowerCount: 130,
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

/**
 * Potenziamenti, in ordine di sblocco.
 * Ognuno cambia anche il modello 3D del personaggio: il piccone compare
 * davvero in mano, lo zaino diventa più grande, l'ascia più imponente.
 */
export const UPGRADES = [
  {
    id: 'axe2', label: 'Ascia di Ferro', desc: 'Abbatti gli alberi più in fretta',
    cost: 30, icon: '🪓',
    apply: (s) => { s.axeLevel = 2; },
  },
  {
    id: 'pick1', label: 'Piccone', desc: 'Ora puoi rompere la pietra',
    cost: 55, icon: '⛏️',
    apply: (s) => { s.pickLevel = 1; s.hasPick = true; },
  },
  {
    id: 'bag1', label: 'Zaino Robusto', desc: '+8 di capienza',
    cost: 85, icon: '🎒',
    apply: (s) => { s.bagLevel = 2; },
  },
  {
    id: 'boots1', label: 'Stivali Leggeri', desc: 'Ti muovi più veloce',
    cost: 120, icon: '👢',
    apply: (s) => { s.bootsLevel = 2; },
  },
  {
    id: 'armor1', label: 'Giubba di Cuoio', desc: 'Più salute contro i lupi',
    cost: 160, icon: '🛡️',
    apply: (s) => { s.armorLevel = 2; },
  },
  {
    id: 'axe3', label: 'Ascia d\'Acciaio', desc: 'Alberi in due colpi, e fa più male',
    cost: 210, icon: '⚒️',
    apply: (s) => { s.axeLevel = 3; },
  },
  {
    id: 'pick2', label: 'Piccone d\'Acciaio', desc: 'La pietra si sbriciola',
    cost: 260, icon: '🔨',
    apply: (s) => { s.pickLevel = 2; },
  },
  {
    id: 'bag2', label: 'Zaino da Carico', desc: '+10 di capienza',
    cost: 340, icon: '🧳',
    apply: (s) => { s.bagLevel = 3; },
  },
  {
    id: 'boots2', label: 'Stivali da Corsa', desc: 'Attraversi il paese in un lampo',
    cost: 420, icon: '🥾',
    apply: (s) => { s.bootsLevel = 3; },
  },
  {
    id: 'armor2', label: 'Cotta di Maglia', desc: 'I lupi non ti spaventano più',
    cost: 560, icon: '⛓️',
    apply: (s) => { s.armorLevel = 3; },
  },
  {
    id: 'bag3', label: 'Carriola', desc: '+12 di capienza',
    cost: 720, icon: '🛒',
    apply: (s) => { s.bagLevel = 4; },
  },
  {
    id: 'pick3', label: 'Piccone da Minatore', desc: 'Estrai anche l\'oro',
    cost: 900, icon: '⚱️',
    apply: (s) => { s.pickLevel = 3; },
  },
  {
    id: 'axe4', label: 'Ascia del Capomastro', desc: 'Un albero, un colpo',
    cost: 1200, icon: '🪚',
    apply: (s) => { s.axeLevel = 4; },
  },
  {
    id: 'bag4', label: 'Furgone a Mano', desc: '+16 di capienza',
    cost: 1600, icon: '🚚',
    apply: (s) => { s.bagLevel = 5; },
  },
];
