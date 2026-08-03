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

/** Ordine di comparsa dei cantieri. */
export const BUILD_ORDER = [
  'hut', 'sawmill', 'quarry', 'house', 'warehouse',   // Fase 1-2
  'bridge', 'mill', 'smithy',                          // Fase 3
];
