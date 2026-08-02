/**
 * buildings.js (data) — Definizioni degli edifici sbloccabili.
 * Nella Fase 1 c'è solo la capanna; la struttura è già pronta per le fasi
 * successive (segheria, cava, fucina, municipio...).
 */

export const RESOURCE_INFO = {
  wood:  { label: 'Legno',  icon: '🪵', color: '#c99055' },
  stone: { label: 'Pietra', icon: '🪨', color: '#a8adbb' },
  iron:  { label: 'Ferro',  icon: '⛓️', color: '#c7ccd8' },
  gold:  { label: 'Oro',    icon: '🥇', color: '#ffce54' },
};

export const BUILDINGS = {
  hut: {
    id: 'hut',
    name: 'Capanna',
    sprite: 'hut',
    cost: { wood: 40 },
    radius: 1.5,
    zone: 2.6,
    /** Cosa succede quando viene completata. */
    onComplete: (game) => {
      game.bus.emit('village:grew', { building: 'hut' });
    },
  },
};
