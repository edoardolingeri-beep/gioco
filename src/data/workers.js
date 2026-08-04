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
    // Il cartello punta verso il centro del villaggio (vedi offX/offZ),
    // non più verso il bosco: è più vicino agli alberi veri e propri di
    // quanto non lo fosse prima, quindi il raggio è stato allargato per
    // compensare — altrimenti il boscaiolo passa più tempo ad aspettare
    // che un albero ricresca nel suo raggio che a tagliare (e sembra
    // "bloccato", quando in realtà sta solo aspettando).
    workRadius: 17,
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
      cost: 6000, manager: '🧔',
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
    workRadius: 17,   // idem al boscaiolo: compensa lo spostamento verso il centro
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
      cost: 7500, manager: '⛑️',
    },
  },
  ironminer: {
    id: 'ironminer',
    name: 'Minatore di ferro',
    building: 'smithy',
    resource: 'iron',
    icon: '🔩',
    hireCost: 260,
    costGrowth: 2.6,
    maxWorkers: 3,
    workRadius: 16,
    workTime: 4.2,
    // Le vene di ferro sono tutte oltre il fiume (vedi World.js): un
    // cartello accanto alla fucina, che resta a sud, non le raggiungerebbe
    // mai. Il cartello ha una posizione fissa sulla sponda nord invece
    // dell'offset dall'edificio usato da boscaiolo e minatore.
    stationSpot: { x: 0, z: -26 },
    upgrades: {
      yield: {
        label: 'Resa del minatore di ferro', desc: 'Più ferro per ogni consegna',
        base: 1, step: 1, cost: 260, growth: 1.42, maxLevel: 10,
      },
      capacity: {
        label: 'Magazzino del minatore di ferro', desc: 'Il cartello accumula di più prima di riempirsi',
        base: 20, step: 15, cost: 200, growth: 1.36, maxLevel: 10,
      },
    },
    conveyor: {
      label: 'Nastro trasportatore', desc: 'Vende da solo, senza più bisogno di ritirare',
      cost: 11000, manager: '🦾',
    },
  },
  goldminer: {
    id: 'goldminer',
    name: 'Cercatore d\'oro',
    building: 'bank',
    resource: 'gold',
    icon: '🥇',
    hireCost: 420,
    costGrowth: 2.6,
    maxWorkers: 3,
    workRadius: 20,
    workTime: 4.8,
    // L'oro è ancora più a nord del ferro (vedi World.js): stessa idea,
    // posizione fissa nella zona giusta invece di un offset dalla banca.
    stationSpot: { x: 0, z: -34 },
    upgrades: {
      yield: {
        label: 'Resa del cercatore d\'oro', desc: 'Più oro per ogni consegna',
        base: 1, step: 1, cost: 380, growth: 1.42, maxLevel: 10,
      },
      capacity: {
        label: 'Magazzino del cercatore d\'oro', desc: 'Il cartello accumula di più prima di riempirsi',
        base: 20, step: 15, cost: 300, growth: 1.36, maxLevel: 10,
      },
    },
    conveyor: {
      label: 'Nastro trasportatore', desc: 'Vende da solo, senza più bisogno di ritirare',
      cost: 16000, manager: '🕴️',
    },
  },
};
