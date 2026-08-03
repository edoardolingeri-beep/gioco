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
 * Un operaio NON consegna da solo: accumula al cartello (fino alla capienza
 * del suo magazzino) e tocca al giocatore passare a ritirare — è lui che
 * deve ancora portarlo a un cantiere o al mercante. A un certo punto però
 * si può comprare il nastro trasportatore (`conveyor`): un capostipite
 * riservato a chi ha già portato resa e magazzino al livello massimo, che
 * vende da solo la scorta per monete, senza bisogno di passare — vedi
 * `WorkerSystem.buyConveyor`.
 *
 * `upgrades.yield` e `upgrades.capacity` sono le due leve comprabili dal
 * negozio (vedi `WorkerSystem.buyUpgrade`): quanta risorsa porta a ogni
 * consegna, e quanto grande è il magazzino prima che l'operaio debba
 * aspettare. Ogni livello costa `cost * growth^livelloGiàComprato`, fino a
 * `maxLevel`.
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
    // Verso il centro del villaggio, non verso il bosco: il cartello (e la
    // sua scorta) deve restare dentro il recinto quando questo compare,
    // altrimenti ritirare il carico significa uscire dalle mura.
    offX: 1.7, offZ: 0.9,
    upgrades: {
      yield: {
        label: 'Resa del boscaiolo', desc: 'Più tronchi per ogni consegna',
        base: 1, step: 1, cost: 130, growth: 1.42, maxLevel: 10,
      },
      capacity: {
        label: 'Magazzino del boscaiolo', desc: 'Il cartello accumula di più prima di riempirsi',
        base: 20, step: 15, cost: 100, growth: 1.36, maxLevel: 10,
      },
    },
    conveyor: {
      label: 'Nastro trasportatore', desc: 'Vende da solo, senza più bisogno di ritirare',
      cost: 6000,
    },
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
    // Idem: verso il centro del villaggio, non verso la cava.
    offX: -1.9, offZ: -0.8,
    upgrades: {
      yield: {
        label: 'Resa del minatore', desc: 'Più pietra per ogni consegna',
        base: 1, step: 1, cost: 170, growth: 1.42, maxLevel: 10,
      },
      capacity: {
        label: 'Magazzino del minatore', desc: 'Il cartello accumula di più prima di riempirsi',
        base: 20, step: 15, cost: 130, growth: 1.36, maxLevel: 10,
      },
    },
    conveyor: {
      label: 'Nastro trasportatore', desc: 'Vende da solo, senza più bisogno di ritirare',
      cost: 7500,
    },
  },
};
