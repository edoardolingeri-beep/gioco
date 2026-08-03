/**
 * workers.js (data) — Gli operai assumibili.
 *
 * Ogni voce lega un tipo di operaio a un edificio già costruito: quando
 * quell'edificio finisce di salire, compare lì vicino un cartello dove
 * assumerlo pagando in monete. Aggiungere un nuovo operaio in futuro
 * (fabbro, minatore d'oro…) significa aggiungere una voce qui e un
 * `onComplete`/`onRestore` sull'edificio corrispondente — la logica di
 * assunzione, lavoro e accumulo resta quella di `WorkerSystem`.
 *
 * Un operaio NON consegna da solo: accumula al cartello (fino a `stockCap`)
 * e tocca al giocatore passare a ritirare — è lui che deve ancora portarlo
 * a un cantiere o al mercante. Un nastro trasportatore, in una fase
 * successiva del gioco, potrà automatizzare anche quest'ultimo tratto.
 */

export const WORKER_TYPES = {
  lumberjack: {
    id: 'lumberjack',
    name: 'Boscaiolo',
    building: 'sawmill',
    resource: 'wood',
    icon: '🪓',
    hireCost: 100,
    costGrowth: 2.6,     // ogni operaio in più costa questo multiplo in più
    maxWorkers: 3,
    workRadius: 13,      // quanto lontano dal cartello cerca alberi
    workTime: 3.4,        // secondi passati a colpire prima che l'albero cada
    stockCap: 20,         // oltre questo, l'operaio aspetta che tu passi
    offX: -1.7, offZ: 0.9,
  },
  miner: {
    id: 'miner',
    name: 'Minatore',
    building: 'quarry',
    resource: 'stone',
    icon: '⛏️',
    hireCost: 140,
    costGrowth: 2.6,
    maxWorkers: 3,
    workRadius: 13,
    workTime: 3.8,
    stockCap: 20,
    offX: 1.9, offZ: 0.8,
  },
};
