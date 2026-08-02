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
import { HUD } from '../ui/HUD.js';
import { Joystick } from '../ui/Joystick.js';
import { drawOffscreenArrow } from '../ui/WorldUI.js';
import { fxRand } from './Rand.js';
import { BUILD_STATE } from '../entities/BuildingEntity.js';

const SAVE_KEY = 'gioco.save.v1';

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
      axeLevel: 1, bagLevel: 1, bootsLevel: 1,
      capacity: CFG.carry.baseCapacity,
      speedMul: 1,
      axeDamage: 1, chopSpeed: 1,
      treesChopped: 0, upgradeIndex: 0,
    };

    this.time = 0;
    this.scratch = { near: [] };
    this.quality = new QualityManager(this);
    this.rebaker = null;
    this.showDebug = false;

    this._setup();
  }

  /* --------------------------------------------------------------- setup */

  _setup() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));

    this.world = new World(this);
    this.world.generate(this.assets, this.cam.basePPU);
    this.grid = this.world.grid;

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

    this.bus.on('building:done', () => {
      this.hud.toast('Capanna costruita! Il villaggio è nato 🏡');
    });
    this.bus.on('upgrade:bought', (u) => {
      this.hud.toast(`${u.icon} ${u.label} sbloccato!`);
      this.stats.upgradeIndex = this.world.workbench.index;
      this.recomputeStats();
      this.save();
    });
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
    s.axeDamage = [0, 1, 1.6, 2.4][s.axeLevel] ?? 1;
    s.chopSpeed = 1 + (s.axeLevel - 1) * 0.14;
    s.capacity = CFG.carry.baseCapacity + (s.bagLevel - 1) * 8;
    s.speedMul = 1 + (s.bootsLevel - 1) * 0.22;
    this.carry.setCapacity(s.capacity);
  }

  /** Ri-cuoce l'atlante del personaggio dopo un potenziamento estetico. */
  rebakeCharacter() {
    this.rebaker = new CharacterRebaker(
      this.forge, this.assets,
      { axeLevel: this.stats.axeLevel, bagLevel: this.stats.bagLevel },
      () => { this.rebaker = null; },
    );
  }

  /* -------------------------------------------------------------- risorse */

  /** Genera i tronchi quando un albero tocca terra. */
  spawnLogs(tree) {
    const n = CFG.harvest.logsPerTree;
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

  /* --------------------------------------------------------------- update */

  update(dt) {
    this.time += dt;
    this.input.update();

    this.world.update(dt, this);
    this.carry.update(dt);
    this.pickups.update(dt);
    this.delivery.update(dt);
    this.fx.update(dt);
    this.texts.update(dt);

    this.cam.update(dt, this.player);

    this.joystick.update();
    this.hud.update(dt);

    // ri-cottura del personaggio spalmata sui frame liberi
    if (this.rebaker) this.rebaker.step(4);

    this.quality.update(dt, this.loop.fps);

    this._autoSave += dt;
    if (this._autoSave > 8) { this._autoSave = 0; this.save(); }
  }

  /* --------------------------------------------------------------- render */

  render() {
    const r = this.renderer;
    const ctx = r.ctx;
    const cam = this.cam;

    r.begin(cam);

    // 1. terreno
    this.world.terrain.draw(ctx, cam, { w: r.w, h: r.h });

    // 2. entità (ordinate per profondità) + risorse in volo
    this.world.draw(r, this, cam);
    this.pickups.draw(r, this.assets);
    this.delivery.draw(r, this.assets);
    r.flush(this.assets.fx.shadow);

    // 3. particelle e numeri volanti
    this.fx.draw(ctx, cam, this.assets.fx.spark);
    this.texts.draw(ctx, cam, r.dpr);

    // 4. pannelli nel mondo
    this.world.drawUI(ctx, cam, r.dpr, this);

    // 5. frecce verso gli obiettivi fuori schermo
    this._drawGuides(ctx, cam, r.dpr);

    if (this.showDebug) this._drawDebug(r);
  }

  _drawGuides(ctx, cam, dpr) {
    const w = this.world;
    if (w.hut && w.hut.state === BUILD_STATE.BLUEPRINT && this.carry.total > 0) {
      drawOffscreenArrow(ctx, cam, dpr, w.hut.x, w.hut.z, '#7cc8ff', '🏠');
    }
    if (w.merchant && this.carry.isFull) {
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
      const data = {
        v: 1,
        coins: this.stats.coins,
        axeLevel: this.stats.axeLevel,
        bagLevel: this.stats.bagLevel,
        bootsLevel: this.stats.bootsLevel,
        upgradeIndex: w.workbench.index,
        treesChopped: this.stats.treesChopped,
        hut: { state: w.hut.state, paid: w.hut.paid },
        player: { x: this.player.x, z: this.player.z },
        carry: this.carry.stack.map((s) => s.type),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* spazio esaurito o modalità privata: si continua senza */ }
  }

  load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { data = null; }
    if (!data || data.v !== 1) { this.recomputeStats(); return; }

    const s = this.stats;
    s.coins = data.coins ?? 0;
    s.axeLevel = data.axeLevel ?? 1;
    s.bagLevel = data.bagLevel ?? 1;
    s.bootsLevel = data.bootsLevel ?? 1;
    s.treesChopped = data.treesChopped ?? 0;
    this.recomputeStats();

    const w = this.world;
    w.workbench.index = data.upgradeIndex ?? 0;

    if (data.hut) {
      Object.assign(w.hut.paid, data.hut.paid ?? {});
      if (data.hut.state === BUILD_STATE.DONE || w.hut.complete) {
        w.hut.state = BUILD_STATE.DONE;
        w.hut.solid = true;
      }
    }
    if (data.player) {
      this.player.x = data.player.x;
      this.player.z = data.player.z;
      this.grid.update(this.player);
      this.cam.snapTo(this.player.x, this.player.z);
    }
    for (const t of data.carry ?? []) this.carry.add(t, 1);
    // il personaggio potrebbe avere attrezzi diversi da quelli cotti all'avvio
    if (s.axeLevel > 1 || s.bagLevel > 1) this.rebakeCharacter();
  }

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignora */ }
    location.reload();
  }
}
