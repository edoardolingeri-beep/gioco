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

/** Ordine di comparsa dei cantieri. */
export const BUILD_ORDER = ['hut', 'sawmill', 'quarry', 'house', 'warehouse'];
