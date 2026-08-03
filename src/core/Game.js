/**
 * Game.js — Il direttore d'orchestra.
 *
 * Tiene insieme tutti i sistemi, espone lo stato condiviso e definisce
 * l'ordine di aggiornamento e di disegno. Ogni sistema resta indipendente:
 * per aggiungere una funzionalità (nemici, NPC, nuovi biomi) basta creare il
 * suo modulo e agganciarlo qui.
 */

import { CFG, UPGRADES } from '../data/config.js';
import { EventBus } from './EventBus.js';
import { Camera } from './Camera.js';
import { Input } from './Input.js';
import { Loop } from './Loop.js';
import { Renderer } from '../render/Renderer.js';
import { CharacterRebaker } from '../render/AssetForge.js';
import { World } from '../world/World.js';
import { Player } from '../entities/Player.js';
import { CarrySystem } from '../systems/CarrySystem.js';
import { PickupSystem } from '../systems/PickupSystem.js';
import { DeliverySystem } from '../systems/DeliverySystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { FloatingText } from '../systems/FloatingText.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { Haptics } from '../systems/Haptics.js';
import { QualityManager } from '../systems/QualityManager.js';
import { VillageSystem } from '../systems/VillageSystem.js';
import { EnemySpawner } from '../systems/EnemySpawner.js';
import { TrafficSystem } from '../systems/TrafficSystem.js';
import { DayNightSystem } from '../systems/DayNightSystem.js';
import { ObjectiveSystem } from '../systems/ObjectiveSystem.js';
import { MusicSystem } from '../systems/MusicSystem.js';
import { HUD } from '../ui/HUD.js';
import { Joystick } from '../ui/Joystick.js';
import { drawOffscreenArrow } from '../ui/WorldUI.js';
import { fxRand } from './Rand.js';
import { BUILD_STATE } from '../entities/BuildingEntity.js';
import { BUILD_ORDER, BUILDINGS } from '../data/buildings.js';

const SAVE_KEY = 'gioco.save.v1';
const SAVE_VERSIONS = [1, 2, 3, 4, 5];

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} assets   sprite già cotte
   * @param {AssetForge} forge  serve per ri-cuocere il personaggio
   */
  constructor(canvas, assets, forge) {
    this.canvas = canvas;
    this.assets = assets;
    this.forge = forge;

    this.bus = new EventBus();
    this.renderer = new Renderer(canvas);
    this.cam = new Camera();
    this.input = new Input(canvas, this.bus);
    this.audio = new AudioSystem();
    this.haptics = new Haptics();

    this.fx = new ParticleSystem();
    this.texts = new FloatingText();
    this.carry = new CarrySystem(this.bus);
    this.pickups = new PickupSystem(this);
    this.delivery = new DeliverySystem(this);

    /** Statistiche del giocatore (modificate dai potenziamenti). */
    this.stats = {
      coins: 0,
      // livelli di equipaggiamento
      axeLevel: 1, pickLevel: 0, bagLevel: 1, bootsLevel: 1, armorLevel: 1,
      hasPick: false,
      // valori derivati (ricalcolati da recomputeStats)
      capacity: CFG.carry.baseCapacity,
      speedMul: 1,
      axeDamage: 1, pickDamage: 1,
      chopSpeed: 1, mineSpeed: 1,
      attackDamage: CFG.player.baseDamage,
      // bonus concessi dagli edifici
      logBonus: 0, stoneBonus: 0, ironBonus: 0, goldBonus: 0, warehouseBonus: 0,
      sellBonus: 1, income: 0, regenMul: 1,
      // contatori
      treesChopped: 0, rocksMined: 0, ironMined: 0, goldMined: 0,
      wolvesKilled: 0, upgradeIndex: 0,
      // quante volte il fumetto "serve il piccone" è già comparso, per tipo
      // di risorsa: dopo le prime volte si fa vedere solo se ti fermi lì
      rockHintsSeen: {},
    };

    this.time = 0;
    this.scratch = { near: [] };
    this.quality = new QualityManager(this);
    this.dayNight = new DayNightSystem(this);
    this.objectives = new ObjectiveSystem(this);
    this.music = new MusicSystem(this);
    this.rebaker = null;
    this.showDebug = false;

    this._setup();
  }

  /* --------------------------------------------------------------- setup */

  _setup() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));

    this.village = new VillageSystem(this);
    this.spawner = new EnemySpawner(this);
    this.traffic = new TrafficSystem(this);

    this.world = new World(this);
    this.world.generate(this.assets, this.cam.basePPU);
    this.grid = this.world.grid;

    // punti d'interesse iniziali per gli abitanti: il falò e il mercante
    this.village.addPOI(0, 1.6, 'work', 1.4);
    this.village.addPOI(this.world.merchantSpot.x - 0.4, this.world.merchantSpot.z + 1.9, 'work', 1.2);

    this.player = new Player(0, 3.2, this);
    this.world.add(this.player, true);

    this.cam.snapTo(this.player.x, this.player.z);

    this.hud = new HUD(this);
    this.joystick = new Joystick(document.getElementById('joystick-layer'), this.input);

    this.loop = new Loop((dt) => this.update(dt), () => this.render());
    this.loop.onPause = () => this.save();

    // Lo sblocco audio deve avvenire dentro un gesto dell'utente.
    const unlock = () => { this.audio.unlock(); };
    this.bus.on('input:down', unlock);
    window.addEventListener('keydown', unlock, { once: true });

    this.load();
    this._wireEvents();
    this._autoSave = 0;
  }

  _wireEvents() {
    // Numeri volanti su ogni raccolta
    this.bus.on('resource:gained', ({ type, amount, x, y, z }) => {
      const info = { wood: '🪵', stone: '🪨', iron: '⛓️', gold: '🥇' }[type] ?? '';
      this.texts.spawn(`+${amount}`, x, y + 0.3, z, {
        color: '#ffffff', icon: info, size: 0.95,
      });
    });

    // Ogni edificio completato fa crescere il villaggio e apre il cantiere
    // successivo: è il motore dell'evoluzione del mondo.
    this.bus.on('building:done', (b) => {
      this.hud.toast(`${b.def.name} costruita!${b.def.perk ? ' ' + b.def.perk : ''} 🏡`);
      this._lightWindows(b);
      this.recomputeStats();
      this.village.levelUp();
      this._unlockNextSite(b.def.id);
      this.spawner.enable();
      this.save();
    });

    // La colonna sonora cresce col villaggio: nuovo livello, nuovo tema.
    this.bus.on('village:level', () => this.music.setPhase(this.village.phase));

    this.bus.on('enemy:killed', (e) => {
      const reward = CFG.enemies.wolf.reward;
      this.stats.wolvesKilled++;
      this.addCoins(reward, e.x, 1.2, e.z);
      this.audio.coin(0);
    });

    this.bus.on('player:faint', (lost) => {
      this.hud.toast(lost > 0
        ? `Sei svenuto! Hai perso ${lost} risorse 💫`
        : 'Sei svenuto! Riposa al falò 💫');
    });
    this.bus.on('upgrade:bought', (u) => {
      this.hud.toast(`${u.icon} ${u.label} sbloccato!`);
      this.stats.upgradeIndex = this.world.workbench.index;
      this.recomputeStats();
      this.save();
    });
  }

  /** Finestre illuminate: la sagoma dell'edificio si accende di notte. */
  _lightWindows(b) {
    this.world.addLight(b.x, 0.9, b.z + b.radius * 0.5, {
      radius: b.radius * 0.9, alpha: 0.5,
    });
  }

  /** Rende visibile il cantiere che richiedeva l'edificio appena finito. */
  _unlockNextSite(doneId) {
    for (const id of BUILD_ORDER) {
      const def = BUILDINGS[id];
      if (def.requires !== doneId) continue;
      const b = this.world.buildings[id];
      if (!b || b.available) continue;
      b.available = true;
      this.fx.sparks(b.x, 1.4, b.z, 20, 'rgba(140,220,255,1)', 1.2);
      this.audio.plant();
      this.hud.toast(`Nuovo progetto disponibile: ${def.name}`);
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h, this.quality.scale);
    this.cam.resize(this.renderer.w, this.renderer.h, this.renderer.dpr);
  }

  start() { this.loop.start(); }

  /* ------------------------------------------------------------- economia */

  addCoins(n, x, y, z) {
    this.stats.coins += n;
    this.bus.emit('coins:changed', this.stats.coins);
    if (x != null) {
      this.texts.spawn(`+${n}`, x, y, z, { color: '#ffce54', icon: '🪙', size: 1 });
    }
  }

  spendCoins(n) {
    this.stats.coins = Math.max(0, this.stats.coins - n);
    this.bus.emit('coins:changed', this.stats.coins);
  }

  /** Ricalcola i valori derivati dai livelli di potenziamento. */
  recomputeStats() {
    const s = this.stats;
    s.axeDamage = [0, 1, 1.6, 2.4, 4][s.axeLevel] ?? 1;
    s.chopSpeed = 1 + (s.axeLevel - 1) * 0.14;
    s.pickDamage = [0, 1, 1.9, 2.8][s.pickLevel] ?? 1;
    s.mineSpeed = 1 + Math.max(0, s.pickLevel - 1) * 0.2;
    s.capacity = CFG.carry.baseCapacity
      + [0, 0, 8, 18, 30, 46][s.bagLevel]
      + s.warehouseBonus;
    s.speedMul = 1 + (s.bootsLevel - 1) * 0.22;
    s.attackDamage = CFG.player.baseDamage * (1 + (s.axeLevel - 1) * 0.45);

    if (this.player) {
      const maxHp = CFG.player.maxHp * (1 + (s.armorLevel - 1) * 0.5);
      // se aumenta la salute massima, il bonus è subito disponibile
      const gain = maxHp - this.player.maxHp;
      this.player.maxHp = maxHp;
      if (gain > 0) this.player.hp = Math.min(maxHp, this.player.hp + gain);
    }
    this.carry.setCapacity(s.capacity);
  }

  /** Ri-cuoce l'atlante del personaggio dopo un potenziamento estetico. */
  rebakeCharacter() {
    this.rebaker = new CharacterRebaker(
      this.forge, this.assets,
      {
        axeLevel: this.stats.axeLevel,
        bagLevel: this.stats.bagLevel,
        pickLevel: Math.max(1, this.stats.pickLevel),
      },
      () => { this.rebaker = null; },
    );
  }

  /* -------------------------------------------------------------- risorse */

  /** Genera i tronchi quando un albero tocca terra. */
  spawnLogs(tree) {
    const n = CFG.harvest.logsPerTree + this.stats.logBonus;
    const ang = tree.fallDir * Math.PI * 0.5;
    const cx = tree.x + Math.sin(ang) * tree.spriteTopY * 0.35;
    const cz = tree.z + tree.spriteTopY * 0.08;
    for (let i = 0; i < n; i++) {
      const p = this.pickups.spawn(
        'wood',
        cx + fxRand.sym(0.35), 0.4, cz + fxRand.sym(0.35),
        Math.sin(ang) * 0.4, 0.2, 0.85,
      );
      p.age = -i * 0.06;   // sfalsa leggermente le partenze
    }
    this.stats.treesChopped++;
    this.bus.emit('tree:felled', tree);
  }

  /** Genera il minerale quando un masso o una vena vengono frantumati. */
  spawnOre(rock) {
    const type = rock.resource;
    const base = { stone: CFG.harvest.stonePerRock, iron: CFG.harvest.ironPerVein,
      gold: CFG.harvest.goldPerVein }[type] ?? 1;
    const bonus = { stone: this.stats.stoneBonus, iron: this.stats.ironBonus,
      gold: this.stats.goldBonus }[type] ?? 0;
    const n = base + bonus;
    for (let i = 0; i < n; i++) {
      const p = this.pickups.spawn(
        type,
        rock.x + fxRand.sym(0.3), 0.5, rock.z + fxRand.sym(0.3),
        fxRand.sym(0.5), fxRand.sym(0.5), 0.8,
      );
      p.age = -i * 0.05;
    }
    if (type === 'gold') this.stats.goldMined++;
    else if (type === 'iron') this.stats.ironMined++;
    else this.stats.rocksMined++;
    this.bus.emit('rock:mined', rock);
  }

  /* --------------------------------------------------------------- update */

  update(dt) {
    this.time += dt;
    this.input.update();

    this.world.update(dt, this);
    this.spawner.update(dt, this);
    this.traffic.update(dt);
    this.carry.update(dt);
    this.pickups.update(dt);
    this.delivery.update(dt);
    this.fx.update(dt);
    this.texts.update(dt);

    this.dayNight.update(dt);
    this.objectives.update(dt);
    this.music.update();
    this.cam.update(dt, this.player);

    this.joystick.update();
    this.hud.update(dt);

    // ri-cottura del personaggio spalmata sui frame liberi
    if (this.rebaker) this.rebaker.step(4);

    this.quality.update(dt, this.loop.fps);

    // Rendita della banca: piccole entrate periodiche, con la moneta che
    // vola verso l'HUD come una vendita qualsiasi.
    if (this.stats.income > 0) {
      this._incomeT = (this._incomeT ?? 0) + dt;
      if (this._incomeT >= 6) {
        this._incomeT = 0;
        const b = this.world.buildings.bank;
        this.addCoins(this.stats.income, b.x, 2.4, b.z);
        this.audio.coin(2);
      }
    }

    this._autoSave += dt;
    if (this._autoSave > 8) { this._autoSave = 0; this.save(); }
  }

  /* --------------------------------------------------------------- render */

  render() {
    const r = this.renderer;
    const ctx = r.ctx;
    const cam = this.cam;

    r.begin(cam);

    // 1. terreno e fiume (entrambi "sotto" a tutto)
    this.world.terrain.draw(ctx, cam, { w: r.w, h: r.h });
    this.world.river.draw(ctx, cam, { w: r.w, h: r.h });

    // 2. entità (ordinate per profondità) + risorse in volo
    this.world.draw(r, this, cam);
    this.pickups.draw(r, this.assets);
    this.delivery.draw(r, this.assets);
    r.flush(this.assets.fx.shadow);

    // 3. particelle
    this.fx.draw(ctx, cam, this.assets.fx.spark);

    // 3b. atmosfera: prima il velo della sera, POI i bagliori delle luci.
    //     È quest'ordine a far sembrare accese le finestre e i lampioni.
    this.dayNight.drawTint(ctx, r.w, r.h);
    this.world.syncLights();
    this.dayNight.drawLights(ctx, cam, this.world.lights, this.assets.fx);

    // 3c. i numeri volanti stanno sopra l'atmosfera, o di notte sparirebbero
    this.texts.draw(ctx, cam, r.dpr);

    // 4. pannelli nel mondo (con budget di fumetti per non coprire il gioco)
    this.bubbleBudget = 4;
    this.world.drawUI(ctx, cam, r.dpr, this);

    // 5. frecce verso gli obiettivi fuori schermo
    this._drawGuides(ctx, cam, r.dpr);

    if (this.showDebug) this._drawDebug(r);
  }

  /**
   * Frecce ai bordi dello schermo verso ciò che conta adesso.
   *
   * Puntano allo STESSO obiettivo scritto nella HUD: due indizi che dicono la
   * stessa cosa guidano; due che si contraddicono confondono e basta.
   */
  _drawGuides(ctx, cam, dpr) {
    const w = this.world;
    const key = this.objectives.current.key;

    // il cantiere attivo: il primo aperto e non ancora finito
    let site = null;
    for (const id of BUILD_ORDER) {
      const b = w.buildings[id];
      if (b && b.available && b.state === BUILD_STATE.BLUEPRINT) { site = b; break; }
    }

    const toSite = key === 'deliver' || key === 'deliver-any' || key === 'unlock-go'
      || (key === 'gather' && this.carry.total > 0);
    if (site && toSite) drawOffscreenArrow(ctx, cam, dpr, site.x, site.z, '#7cc8ff', '🏠');

    // il mercante: quando servono monete, o comunque quando lo zaino è pieno
    const toMerchant = key === 'unlock-coins' || key === 'buy-coins' || this.carry.isFull;
    if (w.merchant && toMerchant) {
      drawOffscreenArrow(ctx, cam, dpr, w.merchant.x, w.merchant.z, '#ffce54', '🪙');
    }

    const up = UPGRADES[w.workbench?.index];
    if (up && this.stats.coins >= up.cost) {
      drawOffscreenArrow(ctx, cam, dpr, w.workbench.x, w.workbench.z, '#6ee7a0', up.icon);
    }
  }

  _drawDebug(r) {
    const d = r.dpr;
    const lines = [
      `fps ${this.loop.fps.toFixed(0)}`,
      `sprite ${r.stats.sprites}  ombre ${r.stats.shadows}`,
      `part ${this.fx.count}  drop ${this.pickups.count}  volo ${this.delivery.count}`,
      `pos ${this.player.x.toFixed(1)},${this.player.z.toFixed(1)}`,
      `qualita ${this.quality.scale.toFixed(2)}  ppu ${this.cam.ppu.toFixed(0)}`,
    ];
    lines.forEach((l, i) => r.debugText(l, 10 * d, (18 + i * 14) * d));
  }

  /* ------------------------------------------------------------ salvataggio */

  save() {
    try {
      const w = this.world;
      const buildings = {};
      for (const id of BUILD_ORDER) {
        const b = w.buildings[id];
        buildings[id] = {
          state: b.state, paid: b.paid,
          available: b.available, unlocked: b.unlocked,
        };
      }
      const data = {
        v: 5,
        coins: this.stats.coins,
        axeLevel: this.stats.axeLevel,
        pickLevel: this.stats.pickLevel,
        hasPick: this.stats.hasPick,
        bagLevel: this.stats.bagLevel,
        bootsLevel: this.stats.bootsLevel,
        armorLevel: this.stats.armorLevel,
        logBonus: this.stats.logBonus,
        stoneBonus: this.stats.stoneBonus,
        ironBonus: this.stats.ironBonus,
        goldBonus: this.stats.goldBonus,
        sellBonus: this.stats.sellBonus,
        income: this.stats.income,
        regenMul: this.stats.regenMul,
        warehouseBonus: this.stats.warehouseBonus,
        upgradeIndex: w.workbench.index,
        treesChopped: this.stats.treesChopped,
        rocksMined: this.stats.rocksMined,
        ironMined: this.stats.ironMined,
        goldMined: this.stats.goldMined,
        wolvesKilled: this.stats.wolvesKilled,
        villageLevel: this.village.level,
        dayTime: this.dayNight.time,
        traffic: { roads: this.traffic.enabled, tram: this.traffic.tramEnabled },
        buildings,
        player: { x: this.player.x, z: this.player.z },
        carry: this.carry.stack.map((s) => s.type),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* spazio esaurito o modalità privata: si continua senza */ }
  }

  load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { data = null; }
    // I salvataggi della Fase 1 restano validi: i campi nuovi prendono il
    // valore predefinito e la partita riprende senza perdere nulla.
    if (!data || !SAVE_VERSIONS.includes(data.v)) { this.recomputeStats(); return; }

    const s = this.stats;
    s.coins = data.coins ?? 0;
    s.axeLevel = data.axeLevel ?? 1;
    s.pickLevel = data.pickLevel ?? 0;
    s.hasPick = data.hasPick ?? false;
    s.bagLevel = data.bagLevel ?? 1;
    s.bootsLevel = data.bootsLevel ?? 1;
    s.armorLevel = data.armorLevel ?? 1;
    s.logBonus = data.logBonus ?? 0;
    s.stoneBonus = data.stoneBonus ?? 0;
    s.ironBonus = data.ironBonus ?? 0;
    s.goldBonus = data.goldBonus ?? 0;
    s.sellBonus = data.sellBonus ?? 1;
    s.income = data.income ?? 0;
    s.regenMul = data.regenMul ?? 1;
    s.warehouseBonus = data.warehouseBonus ?? 0;
    s.treesChopped = data.treesChopped ?? 0;
    s.rocksMined = data.rocksMined ?? 0;
    s.ironMined = data.ironMined ?? 0;
    s.goldMined = data.goldMined ?? 0;
    s.wolvesKilled = data.wolvesKilled ?? 0;
    this.recomputeStats();

    const w = this.world;
    w.workbench.index = data.upgradeIndex ?? 0;

    // stato dei cantieri
    const saved = data.buildings ?? (data.hut ? { hut: data.hut } : {});
    for (const id of BUILD_ORDER) {
      const b = w.buildings[id];
      const def = BUILDINGS[id];
      const sv = saved[id];
      if (!b || !sv) continue;
      Object.assign(b.paid, sv.paid ?? {});
      if (sv.available != null) b.available = sv.available;
      if (sv.unlocked != null) b.unlocked = sv.unlocked;
      if (sv.state === BUILD_STATE.DONE || (b.unlocked && b.complete)) {
        b.state = BUILD_STATE.DONE;
        b.solid = def.solidWhenDone !== false;
        // Alcuni edifici modificano il mondo (il ponte apre il fiume):
        // l'effetto va riapplicato al caricamento, senza fanfare.
        def.onRestore?.(this, b);
        // Anche le finestre vanno riaccese: al caricamento l'evento
        // `building:done` non scatta.
        this._lightWindows(b);
      }
    }

    // il villaggio torna al livello raggiunto, senza rigiocare le animazioni
    const lvl = data.villageLevel ?? (saved.hut?.state === BUILD_STATE.DONE ? 1 : 0);
    if (lvl > 0) { this.village.restore(lvl); this.spawner.enable(); }
    this.music.setPhase(this.village.phase);
    // Il traffico si riattiva senza annunci (ci pensa già `onRestore`, ma
    // teniamo anche il flag salvato come rete di sicurezza).
    if (data.traffic) this.traffic.restore(data.traffic.roads, data.traffic.tram);
    if (data.dayTime != null) this.dayNight.setTime(data.dayTime);
    if (data.player) {
      this.player.x = data.player.x;
      this.player.z = data.player.z;
      this.grid.update(this.player);
      this.cam.snapTo(this.player.x, this.player.z);
    }
    for (const t of data.carry ?? []) this.carry.add(t, 1);
    // il personaggio potrebbe avere attrezzi diversi da quelli cotti all'avvio
    if (s.axeLevel > 1 || s.bagLevel > 1 || s.hasPick) this.rebakeCharacter();
  }

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignora */ }
    location.reload();
  }
}
