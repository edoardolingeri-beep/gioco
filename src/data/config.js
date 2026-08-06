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
    stonePerRock: 3,
    rockRegrowDelay: 30,
    // Ferro (Fase 3): richiede il piccone d'acciaio
    ironHits: 9,
    ironPerVein: 3,
    ironRegrowDelay: 45,
    // Oro (Fase 4): raro, richiede il piccone da minatore
    goldHits: 13,
    goldPerVein: 2,
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
    prices: { wood: 2, stone: 5, iron: 14, gold: 46, fish: 6 },
  },

  /* --------------------------------------------------- guadagni in assenza */
  offline: {
    // Sotto questa soglia (secondi) non vale la pena mostrare il
    // popup — un ricarico rapido della pagina non è "essere stati via".
    minSeconds: 90,
    // Oltre questo tetto (4 ore) i guadagni non crescono più: un ritorno
    // dopo giorni non deve fruttare quanto uno vero e proprio offline.
    maxSeconds: 4 * 3600,
    // Tempo "medio" di un ciclo completo di un operaio (cerca+vai+lavora+
    // torna), come multiplo di `workTime`: approssima il tempo che passa
    // davvero raccogliendo, senza dover simulare il mondo a ritroso.
    cycleFactor: 5,
  },

  /* -------------------------------------------------------- eventi casuali */
  events: {
    firstDelay: 75,          // prima del primo evento, a partire dal villaggio nato
    interval: [90, 180],     // intervallo (secondi) tra un evento e il successivo
    cartMinRes: 5,
    cartMaxRes: 8,
    rareWolfHpMul: 1.8,
    rareWolfSpeedMul: 1.1,
    rareWolfRewardMul: 4,
    // Il lupo feroce compare solo dopo che il giocatore ha già affrontato
    // almeno un nemico: prima non saprebbe ancora difendersi.
    rareWolfMinKills: 1,
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
    // La staccionata è un quadrato: questo è il semilato, non un raggio.
    fenceRadius: 8.6,
    safeRadius: 10,       // dentro questo raggio i nemici non compaiono
    // Allargare il recinto (VillageSystem.expand): quanto cresce il
    // semilato a ogni acquisto, e quanto costa (cresce a sua volta).
    expansionStep: 3,
    expansionBaseCost: 4000,
    expansionGrowth: 2.2,
    expansionMax: 3,      // oltre questo, il recinto non si allarga più
  },

  /* -------------------------------------------------------------- abitanti */
  npc: {
    speed: 1.85,
    // Era 54, poi 40: anche così restava un casino, soprattutto sommato ai
    // carrettieri (vedi VillageSystem, campo `haulers` di ogni fase, anche
    // quello dimezzato per lo stesso motivo). Meno abitanti, e chi c'è si
    // ferma più a lungo (vedi NPCEntity._pickActivity).
    maxCount: 28,
  },

  /* ------------------------------------------------------------- traffico */
  traffic: {
    // Anello percorso dai veicoli attorno al centro città.
    ringRadius: 12.5,
    ringPoints: 12,
    carSpeed: 4.2,
    maxCars: 8,
    // Linea del tram: un secondo anello, più largo e più lento.
    tramRadius: 17.5,
    tramPoints: 14,
    tramSpeed: 3.2,
    maxTrams: 2,
    // Semafori
    lightCycle: 11,       // secondi per un ciclo completo
    stopDistance: 2.2,    // distanza a cui il veicolo frena
  },

  /* ---------------------------------------------------------------- nemici */
  enemies: {
    firstWaveDelay: 25,
    spawnInterval: [10, 19],
    baseMax: 3,
    maxTotal: 10,
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
    // L'orso compare più tardi (bearMinLevel) ed è un pericolo diverso dal
    // lupo: più lento, ma molto più tosto — tanta vita, un colpo pesante e
    // telegrafato (l'attacco dura di più: c'è tempo per scansarlo), e vale
    // molte più monete se abbattuto.
    bear: {
      hp: 90,
      speed: 2.6,
      damage: 18,
      aggroRange: 6,
      leashRange: 13,
      attackRange: 1.5,
      attackTime: 0.75,
      attackCooldown: 1.6,
      wanderRadius: 5,
      stealChance: 0.5,
      reward: 14,
    },
    bearMinLevel: 3,      // il villaggio deve essere già "Villaggio" prima che appaiano
    bearChance: 0.28,     // probabilità che un'ondata generi un orso invece di un lupo
  },

  /** La torretta di guardia (data/buildings.js: guardTower). */
  tower: {
    range: 9,
    damage: 14,
    interval: 1.3,
  },

  /* -------------------------------------------------------- raid dei ladri */
  raid: {
    // Il primo raid arriva solo dopo che il recinto (livello 4, vedi
    // VillageSystem STAGES) è comparso da un po': tempo di costruirlo, e
    // magari anche la torretta, prima del primo assaggio.
    minVillageLevel: 4,
    firstDelay: 220,
    interval: [200, 340],
    thievesPerRaid: [2, 4],
    hp: 26,
    speed: 3.6,
    // Distanza dal recinto (vero o solo teorico, se non ancora costruito) a
    // cui compaiono: non dall'estremo bordo della mappa — altrimenti, senza
    // un vero pathfinding, la sola traversata della foresta rischierebbe di
    // far scadere `giveUpTime` prima ancora di arrivare al varco.
    spawnMargin: 15,
    // Monete guadagnate per ogni ladro respinto (ucciso dal giocatore o
    // dalla torretta), come la ricompensa di un lupo.
    reward: 6,
    // Se arriva indisturbato al centro del villaggio, ruba una frazione
    // delle monete in cassa (con un tetto minimo e massimo, così un raid
    // fa male anche a inizio partita e non svuota mai la cassa a fine).
    stealFraction: 0.1,
    stealMin: 25,
    stealMax: 500,
    // Quanto deve avvicinarsi al centro per riuscire nel furto.
    approachRadius: 2.2,
    // Se resta bloccato al recinto (o incastrato nella vegetazione) per
    // troppo tempo senza trovare un varco aperto, rinuncia e fugge senza
    // aver rubato nulla.
    giveUpTime: 40,
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
    goldCount: 26,        // filoni d'oro, rari e lontani (Fase 4)
    patchCount: 1100,
    flowerCount: 130,
    pebbleCount: 260,
    cellSize: 4,         // dimensione cella della griglia spaziale
  },

  /* --------------------------------------------------------- giorno/notte */
  dayNight: {
    dayLength: 300,      // secondi per un ciclo completo (5 minuti)
    startTime: 0.34,     // si comincia a metà mattina
    maxDarkness: 0.72,   // quanto scende la luce a mezzanotte
    moonlight: 0.26,     // quanto azzurro la luna aggiunge al buio
    lightsOn: 0.22,      // oscurità alla quale si accendono le luci
    warmth: 0.58,        // intensità del velo dorato di alba e tramonto
  },

  /* ------------------------------------------------------------------- audio */
  audio: { master: 0.5, music: 0.34 },

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
 * Prezzo di vendita di una risorsa, in monete. `sellBonus` vale per tutto
 * (mulino, botteghe, aeroporto...); `goldSellBonus` (la banca) si somma
 * solo quando il tipo è 'gold' — un edificio, un bonus specifico, invece
 * di far crescere lo stesso moltiplicatore generico all'infinito.
 */
export function sellPrice(game, type) {
  const base = CFG.economy.prices[type] ?? 1;
  const mul = (game.stats.sellBonus ?? 1) + (type === 'gold' ? (game.stats.goldSellBonus ?? 0) : 0);
  return Math.round(base * mul);
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
    cost: 65, icon: '⛏️',
    apply: (s) => { s.pickLevel = 1; s.hasPick = true; },
  },
  {
    id: 'bag1', label: 'Zaino Robusto', desc: '+8 di capienza',
    cost: 110, icon: '🎒',
    apply: (s) => { s.bagLevel = 2; },
  },
  {
    id: 'boots1', label: 'Stivali Leggeri', desc: 'Ti muovi più veloce',
    cost: 175, icon: '👢',
    apply: (s) => { s.bootsLevel = 2; },
  },
  {
    id: 'armor1', label: 'Giubba di Cuoio', desc: 'Più salute contro i lupi',
    cost: 270, icon: '🛡️',
    apply: (s) => { s.armorLevel = 2; },
  },
  {
    id: 'axe3', label: 'Ascia d\'Acciaio', desc: 'Alberi in due colpi, e fa più male',
    cost: 420, icon: '⚒️',
    apply: (s) => { s.axeLevel = 3; },
  },
  {
    id: 'pick2', label: 'Piccone d\'Acciaio', desc: 'La pietra si sbriciola',
    cost: 650, icon: '🔨',
    apply: (s) => { s.pickLevel = 2; },
  },
  {
    id: 'bag2', label: 'Zaino da Carico', desc: '+10 di capienza',
    cost: 1000, icon: '🧳',
    apply: (s) => { s.bagLevel = 3; },
  },
  {
    id: 'boots2', label: 'Stivali da Corsa', desc: 'Attraversi il paese in un lampo',
    cost: 1550, icon: '🥾',
    apply: (s) => { s.bootsLevel = 3; },
  },
  {
    id: 'armor2', label: 'Cotta di Maglia', desc: 'I lupi non ti spaventano più',
    cost: 2400, icon: '⛓️',
    apply: (s) => { s.armorLevel = 3; },
  },
  {
    id: 'bag3', label: 'Carriola', desc: '+12 di capienza',
    cost: 3700, icon: '🛒',
    apply: (s) => { s.bagLevel = 4; },
  },
  {
    id: 'pick3', label: 'Piccone da Minatore', desc: 'Estrai anche l\'oro',
    cost: 5700, icon: '⚱️',
    apply: (s) => { s.pickLevel = 3; },
  },
  {
    id: 'axe4', label: 'Ascia del Capomastro', desc: 'Un albero, un colpo',
    cost: 8800, icon: '🪚',
    apply: (s) => { s.axeLevel = 4; },
  },
  {
    id: 'bag4', label: 'Furgone a Mano', desc: '+16 di capienza',
    cost: 13500, icon: '🚚',
    apply: (s) => { s.bagLevel = 5; },
  },
  {
    id: 'boots3', label: 'Scarpe da Città', desc: 'Corri come un tram',
    cost: 21000, icon: '👟',
    apply: (s) => { s.bootsLevel = 4; },
  },
  {
    id: 'armor3', label: 'Giubbotto Tecnico', desc: 'Praticamente invincibile',
    cost: 32000, icon: '🦺',
    apply: (s) => { s.armorLevel = 4; },
  },
];
