/**
 * buildings.js (data) — Definizioni degli edifici.
 *
 * Ogni edificio è un CANTIERE nel mondo. La progressione è guidata da due
 * campi:
 *   - `requires`  l'edificio che deve essere già completo perché questo
 *                 compaia (evita di trovarsi dieci cantieri addosso);
 *   - `unlockCost` monete da spendere per aprire il cantiere; finché non è
 *                 pagato, il progetto mostra il lucchetto.
 *
 * `effect` viene applicato quando l'edificio è finito: è il modo in cui le
 * costruzioni migliorano davvero la partita, non solo il panorama.
 */

export const RESOURCE_INFO = {
  wood:  { label: 'Legno',  icon: '🪵', color: '#c99055' },
  stone: { label: 'Pietra', icon: '🪨', color: '#a8adbb' },
  iron:  { label: 'Ferro',  icon: '⛓️', color: '#c7ccd8' },
  gold:  { label: 'Oro',    icon: '🥇', color: '#ffce54' },
};

export const BUILDINGS = {
  /* ------------------------------------------------------------- Fase 1 */
  hut: {
    id: 'hut',
    name: 'Capanna',
    sprite: 'hut',
    cost: { wood: 40 },
    radius: 1.5,
    zone: 2.6,
    spot: { x: -6.4, z: 3.2 },
  },

  /* ------------------------------------------------------------- Fase 2 */
  sawmill: {
    id: 'sawmill',
    name: 'Segheria',
    sprite: 'sawmill',
    requires: 'hut',
    unlockCost: 40,
    cost: { wood: 70 },
    radius: 1.75,
    zone: 2.9,
    spot: { x: -8.5, z: -3.6 },
    perk: '+1 tronco per albero',
    effect: (s) => { s.logBonus += 1; },
    // Con la segheria si può assumere un boscaiolo: il cartello compare
    // lì accanto, pronto per la prima automazione della partita.
    onComplete: (game) => game.workers.registerStation('lumberjack', game.world.buildings.sawmill),
    onRestore: (game) => game.workers.registerStation('lumberjack', game.world.buildings.sawmill),
  },

  quarry: {
    id: 'quarry',
    name: 'Cava',
    sprite: 'quarry',
    requires: 'sawmill',
    unlockCost: 90,
    cost: { wood: 60, stone: 20 },
    radius: 1.7,
    zone: 2.9,
    spot: { x: 8.2, z: 5.4 },
    perk: '+1 pietra per masso',
    effect: (s) => { s.stoneBonus += 1; },
    onComplete: (game) => game.workers.registerStation('miner', game.world.buildings.quarry),
    onRestore: (game) => game.workers.registerStation('miner', game.world.buildings.quarry),
  },

  house: {
    id: 'house',
    name: 'Casa',
    sprite: 'house',
    requires: 'quarry',
    unlockCost: 150,
    cost: { wood: 110, stone: 45 },
    radius: 1.6,
    zone: 2.8,
    spot: { x: -2.6, z: 6.8 },
    perk: 'Nuovi abitanti',
  },

  warehouse: {
    id: 'warehouse',
    name: 'Magazzino',
    sprite: 'warehouse',
    requires: 'house',
    unlockCost: 220,
    cost: { wood: 140, stone: 80 },
    radius: 1.9,
    zone: 3.1,
    spot: { x: 5.6, z: -5.8 },
    perk: '+6 di capienza',
    effect: (s) => { s.warehouseBonus += 6; },
  },
};

/* ------------------------------------------------------------- Fase 3 */

Object.assign(BUILDINGS, {
  /**
   * Il ponte è il cardine della Fase 3: apre un varco nel fiume e dà accesso
   * alla sponda nord, dove si trovano le vene di ferro.
   */
  bridge: {
    id: 'bridge',
    name: 'Ponte',
    sprite: 'bridge',
    requires: 'warehouse',
    unlockCost: 300,
    cost: { wood: 180, stone: 90 },
    radius: 1.4,
    zone: 3.4,
    // La posizione lungo Z viene calcolata sul corso del fiume.
    spot: { x: 1.5, z: 0 },
    onRiver: true,
    solidWhenDone: false,      // ci si cammina sopra
    // Metà della lunghezza del modello (`buildBridge`, town.js): serve a
    // BuildingEntity per non far sparire chi cammina sulla metà lontana
    // dell'impalcato dietro l'ordinamento per profondità (vedi `get depth`).
    depthSpan: 3.6,
    perk: 'Apre la sponda nord',
    onComplete: (game) => {
      // Il varco è largo quanto l'impalcato: da qui in poi si attraversa.
      const b = game.world.buildings.bridge;
      game.world.river.openGap(b.x, 1.3);
      game.hud.toast('Il fiume è attraversabile! A nord c\'è il ferro ⛓️');
    },
    /** Al caricamento il varco va riaperto, senza messaggi. */
    onRestore: (game, b) => game.world.river.openGap(b.x, 1.3),
  },

  mill: {
    id: 'mill',
    name: 'Mulino',
    sprite: 'mill',
    requires: 'bridge',
    unlockCost: 420,
    cost: { wood: 160, stone: 130 },
    radius: 1.35,
    zone: 2.9,
    spot: { x: 12.4, z: -6.2 },
    perk: '+50% sul valore di vendita',
    effect: (s) => { s.sellBonus += 0.5; },
    /**
     * Le pale girano davvero: sono cotte in N angoli e ne scegliamo uno in
     * base al tempo. Un solo blit in più per frame.
     */
    overlay: (r, game, self) => {
      const sails = game.assets.millSails;
      if (!sails) return;
      const n = sails.length;
      const i = Math.floor((self.spin * 0.42) * n) % n;
      r.sprite(sails[i], self.x, 2.42, self.z + 1.32, {
        depth: r.cam ? self.depth + 0.02 : self.depth + 0.02,
      });
    },
  },

  smithy: {
    id: 'smithy',
    name: 'Fucina',
    sprite: 'smithy',
    requires: 'mill',
    unlockCost: 650,
    cost: { wood: 140, stone: 180, iron: 40 },
    radius: 1.7,
    zone: 3.0,
    spot: { x: -11.6, z: -7.4 },
    perk: '+1 ferro per vena, attacchi più forti',
    effect: (s) => { s.ironBonus += 1; s.smithy = true; },
    onComplete: (game) => {
      const b = game.world.buildings.smithy;
      game.world.addLight(b.x + 0.95, 0.9, b.z + 2.0, {
        radius: 1.7, alpha: 0.85, flicker: true,
      });
    },
    onRestore: (game, b) => game.world.addLight(b.x + 0.95, 0.9, b.z + 2.0, {
      radius: 1.7, alpha: 0.85, flicker: true,
    }),
    /** Scintille e bagliore dalla forgia sempre accesa. */
    overlay: (r, game, self) => {
      if (Math.random() < 0.06) {
        game.fx.sparks(self.x + 0.95, 1.0, self.z + 2.0, 2, 'rgba(255,170,80,1)', 0.5);
      }
      if (Math.random() < 0.04) {
        game.fx.puff(self.x + 0.96, 2.9, self.z - 0.2, 1, 'rgba(120,120,130,0.5)', 0.3, 0.18);
      }
    },
  },
});

/* ------------------------------------------------------------- Fase 4 */

Object.assign(BUILDINGS, {
  /** Il municipio segna il passaggio da paese a città: arriva l'asfalto. */
  townhall: {
    id: 'townhall',
    name: 'Municipio',
    sprite: 'townhall',
    requires: 'smithy',
    unlockCost: 800,
    cost: { wood: 200, stone: 220, iron: 60 },
    radius: 2.2,
    zone: 3.6,
    spot: { x: 0, z: 14.2 },
    perk: 'La città prende forma',
  },

  shops: {
    id: 'shops',
    name: 'Botteghe',
    sprite: 'shops',
    requires: 'townhall',
    unlockCost: 1000,
    cost: { wood: 240, stone: 180, iron: 40 },
    radius: 2.4,
    zone: 3.6,
    spot: { x: -13.6, z: 2.6 },
    perk: 'Le merci valgono di più',
    effect: (s) => { s.sellBonus += 0.6; },
  },

  park: {
    id: 'park',
    name: 'Parco',
    sprite: 'fountain',
    requires: 'shops',
    unlockCost: 1200,
    cost: { wood: 150, stone: 260 },
    radius: 1.9,
    zone: 3.4,
    spot: { x: 13.6, z: 8.6 },
    perk: 'La città respira',
    /** I getti d'acqua scorrono: sono cotti in pochi fotogrammi. */
    overlay: (r, game, self) => {
      const jets = game.assets.fountainJets;
      if (!jets) return;
      const i = Math.floor(self.spin * 7) % jets.length;
      r.sprite(jets[i], self.x, 0, self.z, { depth: self.depth + 0.02 });
      if (Math.random() < 0.05) {
        game.fx.sparks(self.x + (Math.random() - 0.5) * 2, 1.5, self.z + 0.6, 1,
          'rgba(190,230,255,1)', 0.35);
      }
    },
  },

  bank: {
    id: 'bank',
    name: 'Banca',
    sprite: 'bank',
    requires: 'park',
    unlockCost: 1600,
    cost: { stone: 300, iron: 120, gold: 20 },
    radius: 2.0,
    zone: 3.4,
    spot: { x: -8.2, z: 14.8 },
    perk: 'Rendita in monete, +1 oro per filone',
    effect: (s) => { s.income += 8; s.goldBonus += 1; },
  },

  hospital: {
    id: 'hospital',
    name: 'Ospedale',
    sprite: 'hospital',
    requires: 'bank',
    unlockCost: 2000,
    cost: { stone: 300, iron: 130, gold: 24 },
    radius: 2.1,
    zone: 3.4,
    spot: { x: 10.2, z: 14.8 },
    perk: 'Guarisci molto più in fretta',
    effect: (s) => { s.regenMul += 2; },
  },
});

/* ------------------------------------------------------------- Fase 5 */

Object.assign(BUILDINGS, {
  /** Il primo grattacielo: da qui in poi la città ha un traffico vero. */
  tower: {
    id: 'tower',
    name: 'Grattacielo',
    sprite: 'skyscraperA',
    requires: 'hospital',
    unlockCost: 2600,
    cost: { stone: 350, iron: 190, gold: 45 },
    radius: 1.9,
    zone: 3.4,
    spot: { x: -4.6, z: -11.4 },
    perk: 'La città si mette in moto',
    onComplete: (game) => game.traffic.enableRoads(),
    onRestore: (game) => game.traffic.enableRoads(),
  },

  station: {
    id: 'station',
    name: 'Stazione',
    sprite: 'station',
    requires: 'tower',
    unlockCost: 3200,
    cost: { wood: 200, stone: 300, iron: 220 },
    radius: 2.2,
    zone: 3.6,
    spot: { x: 15.6, z: -2.4 },
    perk: 'Entra in servizio il tram',
    onComplete: (game) => game.traffic.enableTram(),
    onRestore: (game) => game.traffic.enableTram(),
  },

  tower2: {
    id: 'tower2',
    name: 'Torre Panoramica',
    sprite: 'skyscraperB',
    requires: 'station',
    unlockCost: 4200,
    cost: { stone: 380, iron: 270, gold: 70 },
    radius: 1.8,
    zone: 3.2,
    spot: { x: 2.6, z: -12.6 },
    perk: 'Il simbolo della metropoli',
  },

  factory: {
    id: 'factory',
    name: 'Fabbrica',
    sprite: 'factory',
    requires: 'tower2',
    unlockCost: 5200,
    cost: { stone: 420, iron: 340, gold: 60 },
    radius: 2.6,
    zone: 3.8,
    spot: { x: -16.4, z: -9.6 },
    perk: '+2 di ogni risorsa raccolta',
    effect: (s) => { s.logBonus += 2; s.stoneBonus += 2; s.ironBonus += 1; s.goldBonus += 1; },
    /** Le ciminiere fumano di continuo: la città al lavoro. */
    overlay: (r, game, self) => {
      if (Math.random() < 0.22) {
        const x = self.x + (Math.random() < 0.5 ? 1.47 : 0.37);
        game.fx.puff(x, 4.9, self.z - 0.6, 1, 'rgba(186,190,198,0.55)', 0.3, 0.34);
      }
    },
  },

  airport: {
    id: 'airport',
    name: 'Aeroporto',
    sprite: 'airport',
    requires: 'factory',
    unlockCost: 7000,
    cost: { stone: 480, iron: 400, gold: 120 },
    radius: 3.2,
    zone: 4.4,
    spot: { x: 19.5, z: 14.5 },
    perk: 'La metropoli è completa',
    effect: (s) => { s.income += 25; s.sellBonus += 0.8; },
  },
});

/** Ordine di comparsa dei cantieri. */
export const BUILD_ORDER = [
  'hut', 'sawmill', 'quarry', 'house', 'warehouse',    // Fase 1-2
  'bridge', 'mill', 'smithy',                           // Fase 3
  'townhall', 'shops', 'park', 'bank', 'hospital',      // Fase 4
  'tower', 'station', 'tower2', 'factory', 'airport',   // Fase 5
];
