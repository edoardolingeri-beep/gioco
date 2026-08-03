/**
 * HUD.js — Interfaccia minimale.
 *
 * Filosofia: quasi tutto succede nel mondo, quindi in sovrimpressione restano
 * solo due informazioni — quanto stai trasportando e quante monete hai — più
 * i "toast" per gli eventi importanti.
 *
 * È tutto DOM+CSS: animazioni fluide gestite dal compositor, zero impatto sul
 * frame budget del canvas.
 */

import { RESOURCE_INFO } from '../data/buildings.js';
import { WORKER_TYPES } from '../data/workers.js';
import { CFG } from '../data/config.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('hud');
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="chip chip-carry" id="hud-carry" data-ui>
          <span class="chip-icon">🎒</span>
          <div class="chip-body">
            <div class="chip-value"><b id="hud-carry-n">0</b><span id="hud-carry-max">/12</span></div>
            <div class="bar"><i id="hud-carry-bar"></i></div>
          </div>
        </div>
        <div class="chip chip-coins" id="hud-coins" data-ui>
          <span class="chip-icon">🪙</span>
          <b id="hud-coins-n">0</b>
        </div>
        <div class="chip chip-village" id="hud-village" data-ui hidden>
          <span class="chip-icon">👥</span>
          <b id="hud-pop">0</b>
        </div>
        <button class="icon-btn" id="hud-shop" data-ui aria-label="Negozio">🛒</button>
        <button class="icon-btn" id="hud-menu" data-ui aria-label="Opzioni">⚙️</button>
      </div>

      <!-- Il cartello dell'obiettivo: una riga sola, sempre la stessa
           posizione, così l'occhio sa dove guardare quando non sa che fare -->
      <div class="quest" id="hud-quest" hidden>
        <span class="quest-icon" id="hud-quest-icon">🎯</span>
        <div class="quest-body">
          <div class="quest-text" id="hud-quest-text"></div>
          <div class="bar"><i id="hud-quest-bar"></i></div>
        </div>
        <span class="quest-count" id="hud-quest-count"></span>
      </div>

      <!-- Barra della salute: compare solo quando serve, per non ingombrare -->
      <div class="health" id="hud-health" hidden>
        <i id="hud-health-fill"></i>
      </div>

      <div class="toast-wrap" id="hud-toasts"></div>

      <div class="sheet" id="hud-sheet" data-ui hidden>
        <div class="sheet-card">
          <h2>Opzioni</h2>
          <label class="row"><span>🔊 Suoni</span><input type="checkbox" id="opt-audio" checked></label>
          <label class="row"><span>🎵 Musica</span><input type="checkbox" id="opt-music" checked></label>
          <label class="row"><span>📳 Vibrazione</span><input type="checkbox" id="opt-haptics" checked></label>
          <label class="row"><span>🐞 Debug</span><input type="checkbox" id="opt-debug"></label>
          <div class="stat-row" id="opt-stats"></div>
          <button class="btn danger" id="opt-reset">Ricomincia da capo</button>
          <button class="btn" id="opt-close">Chiudi</button>
        </div>
      </div>

      <div class="sheet" id="hud-shop-sheet" data-ui hidden>
        <div class="sheet-card shop-card">
          <h2>Negozio 🛒</h2>
          <div class="shop-list" id="shop-list"></div>
          <button class="btn" id="shop-close">Chiudi</button>
        </div>
      </div>
    `;

    this.el = {
      carry: this.root.querySelector('#hud-carry'),
      carryN: this.root.querySelector('#hud-carry-n'),
      carryMax: this.root.querySelector('#hud-carry-max'),
      carryBar: this.root.querySelector('#hud-carry-bar'),
      coins: this.root.querySelector('#hud-coins'),
      coinsN: this.root.querySelector('#hud-coins-n'),
      toasts: this.root.querySelector('#hud-toasts'),
      sheet: this.root.querySelector('#hud-sheet'),
      shopSheet: this.root.querySelector('#hud-shop-sheet'),
      shopList: this.root.querySelector('#shop-list'),
      stats: this.root.querySelector('#opt-stats'),
      village: this.root.querySelector('#hud-village'),
      pop: this.root.querySelector('#hud-pop'),
      health: this.root.querySelector('#hud-health'),
      quest: this.root.querySelector('#hud-quest'),
      questIcon: this.root.querySelector('#hud-quest-icon'),
      questText: this.root.querySelector('#hud-quest-text'),
      questBar: this.root.querySelector('#hud-quest-bar'),
      questCount: this.root.querySelector('#hud-quest-count'),
      healthFill: this.root.querySelector('#hud-health-fill'),
    };

    this.healthShown = 1;
    this._questKey = '';

    this.shownCoins = 0;
    this.targetCoins = 0;

    this._bind();
    this._refreshCarry();
  }

  _bind() {
    const g = this.game;

    g.bus.on('carry:changed', () => this._refreshCarry());

    // Il contatore degli abitanti compare solo quando il villaggio nasce.
    const refreshPop = () => {
      const n = g.village.population;
      this.el.village.hidden = n === 0;
      this.el.pop.textContent = n;
      this.el.village.classList.remove('pop');
      void this.el.village.offsetWidth;
      this.el.village.classList.add('pop');
    };
    g.bus.on('npc:arrived', refreshPop);
    g.bus.on('village:level', refreshPop);
    g.bus.on('coins:changed', (c) => {
      this.targetCoins = c;
      this.el.coins.classList.remove('pop');
      void this.el.coins.offsetWidth;   // forza il restart dell'animazione
      this.el.coins.classList.add('pop');
    });

    this.root.querySelector('#hud-menu').addEventListener('click', () => {
      this.el.sheet.hidden = false;
      this._refreshStats();
    });
    this.root.querySelector('#hud-shop').addEventListener('click', () => {
      this.el.shopSheet.hidden = false;
      this._renderShop();
    });
    this.root.querySelector('#shop-close').addEventListener('click', () => {
      this.el.shopSheet.hidden = true;
    });
    this.root.querySelector('#opt-close').addEventListener('click', () => {
      this.el.sheet.hidden = true;
    });
    this.root.querySelector('#opt-reset').addEventListener('click', () => {
      if (confirm('Cancellare i progressi e ricominciare?')) g.reset();
    });
    this.root.querySelector('#opt-audio').addEventListener('change', (e) => {
      g.audio.setEnabled(e.target.checked);
    });
    this.root.querySelector('#opt-music').addEventListener('change', (e) => {
      g.music.setEnabled(e.target.checked);
    });
    this.root.querySelector('#opt-haptics').addEventListener('change', (e) => {
      g.haptics.setEnabled(e.target.checked);
    });
    this.root.querySelector('#opt-debug').addEventListener('change', (e) => {
      g.showDebug = e.target.checked;
    });
  }

  _refreshCarry() {
    const c = this.game.carry;
    this.el.carryN.textContent = c.total;
    this.el.carryMax.textContent = '/' + c.capacity;
    this.el.carryBar.style.transform = `scaleX(${Math.min(1, c.fillRatio)})`;
    this.el.carry.classList.toggle('full', c.isFull);
    this.el.carry.classList.remove('pop');
    void this.el.carry.offsetWidth;
    this.el.carry.classList.add('pop');

    // l'icona mostra la risorsa in cima alla pila
    const t = c.topType();
    this.el.carry.querySelector('.chip-icon').textContent =
      t ? RESOURCE_INFO[t].icon : '🎒';
  }

  _refreshStats() {
    const s = this.game.stats;
    const v = this.game.village;
    this.el.stats.innerHTML = `
      <div><b>${s.treesChopped}</b><span>alberi</span></div>
      <div><b>${s.rocksMined}</b><span>massi</span></div>
      <div><b>${s.wolvesKilled}</b><span>lupi</span></div>
      <div><b>${s.bearsKilled}</b><span>orsi</span></div>
      <div><b>${v.population}</b><span>abitanti</span></div>
      <div><b>${s.coins}</b><span>monete</span></div>
      <div><b>${s.axeLevel}</b><span>ascia</span></div>
      <div><b>${s.hasPick ? s.pickLevel : '—'}</b><span>piccone</span></div>
      <div><b>${s.capacity}</b><span>zaino</span></div>
    `;
    this.el.stats.dataset.stage = v.stageName;
  }

  /**
   * Negozio: un pulsante fisso, comprabile da qualunque punto della mappa —
   * a differenza del banco dell'artigiano e dei cartelli degli operai, che
   * restano lì dove sono (ci si può ancora passare per lo stesso motivo).
   * Stessa logica d'acquisto, solo un secondo modo di arrivarci.
   */
  _renderShop() {
    const g = this.game;
    const items = [];

    const wb = g.world.workbench;
    const up = wb?.next;
    if (up) {
      items.push({
        icon: up.icon, title: up.label, desc: up.desc,
        cost: up.cost, can: g.stats.coins >= up.cost,
        onBuy: () => { wb.buy(g, up); this._renderShop(); },
      });
    } else if (wb) {
      items.push({ note: '🎉 Personaggio già tutto potenziato' });
    }

    // Allargare il recinto: solo se esiste (compare con la staccionata,
    // sparisce quando la città la smonta) e non è già al tetto previsto.
    if (g.village.fenceHalfExtent > 0) {
      const cost = g.village.expansionCost;
      items.push(cost == null ? {
        icon: '🏗️', title: 'Recinto del villaggio', desc: 'Già allargato al massimo', maxed: true,
      } : {
        icon: '🏗️', title: `Allarga il villaggio · ${g.village.expansions + 1}/${CFG.village.expansionMax}`,
        desc: 'Più spazio dentro le mura, meno cose in mezzo ai piedi',
        cost, can: g.stats.coins >= cost,
        onBuy: () => { g.village.expand(g); this._renderShop(); },
      });
    }

    for (const typeId in WORKER_TYPES) {
      const station = g.workers.stations[typeId];
      if (!station) continue;
      for (const axis of ['yield', 'capacity']) {
        const def = WORKER_TYPES[typeId].upgrades[axis];
        const cost = g.workers.upgradeCost(typeId, axis);
        const lvl = g.workers.level(typeId, axis);
        const current = axis === 'yield' ? g.workers.harvestYield(typeId) : g.workers.stockCap(typeId);
        items.push({
          icon: WORKER_TYPES[typeId].icon,
          title: `${def.label} · Lv ${lvl}/${def.maxLevel}`,
          desc: cost != null ? `${def.desc} (ora: ${current})` : `${def.desc} — al massimo`,
          cost, can: cost != null && g.stats.coins >= cost,
          maxed: cost == null,
          onBuy: () => { g.workers.buyUpgrade(typeId, axis, g); this._renderShop(); },
        });
      }

      // Il nastro trasportatore è un traguardo, non una tappa: compare solo
      // quando resa e magazzino sono già al livello massimo.
      if (g.workers.conveyorReady(typeId)) {
        const owned = g.workers.hasConveyor(typeId);
        const conv = WORKER_TYPES[typeId].conveyor;
        items.push({
          icon: '🏭',
          title: conv.label,
          desc: owned ? `${WORKER_TYPES[typeId].name}: attivo, vende da solo` : conv.desc,
          cost: conv.cost, can: !owned && g.stats.coins >= conv.cost,
          maxed: owned,
          maxedLabel: owned ? '✓' : 'MAX',
          onBuy: () => { g.workers.buyConveyor(typeId, g); this._renderShop(); },
        });
      }
    }

    this.el.shopList.innerHTML = items.map((it, i) => {
      if (it.note) return `<div class="shop-note">${it.note}</div>`;
      return `
        <div class="shop-item">
          <div class="shop-item-icon">${it.icon}</div>
          <div class="shop-item-body">
            <div class="shop-item-title">${it.title}</div>
            <div class="shop-item-desc">${it.desc}</div>
          </div>
          ${it.maxed
            ? `<span class="shop-max">${it.maxedLabel ?? 'MAX'}</span>`
            : `<button class="btn shop-buy" data-i="${i}" data-cost="${it.cost}" ${it.can ? '' : 'disabled'}>${it.cost} 🪙</button>`}
        </div>
      `;
    }).join('');

    this.el.shopList.querySelectorAll('.shop-buy').forEach((btn) => {
      btn.addEventListener('click', () => items[+btn.dataset.i].onBuy());
    });
  }

  /** Aggiorna solo se un pulsante è comprabile o no — niente da ricostruire
   *  finché il negozio resta aperto e le monete cambiano da sole. */
  _refreshShopAfford() {
    const coins = this.game.stats.coins;
    this.el.shopList.querySelectorAll('.shop-buy').forEach((btn) => {
      btn.disabled = coins < +btn.dataset.cost;
    });
  }

  /**
   * Cartello dell'obiettivo. Il DOM viene toccato solo quando il testo cambia
   * davvero: scrivere ogni frame in `textContent` costringerebbe il browser a
   * rifare il layout sessanta volte al secondo per nulla.
   */
  _refreshQuest() {
    const o = this.game.objectives?.current;
    if (!o || !o.text) { this.el.quest.hidden = true; return; }
    this.el.quest.hidden = false;

    const key = `${o.key}|${o.text}|${o.have}/${o.need}`;
    if (key === this._questKey) return;
    const changed = this._questKey.split('|')[1] !== o.text;
    this._questKey = key;

    this.el.questIcon.textContent = o.icon;
    this.el.questText.textContent = o.text;
    const ratio = o.need > 0 ? Math.min(1, o.have / o.need) : 0;
    this.el.questBar.style.transform = `scaleX(${ratio})`;
    this.el.questCount.textContent = o.need > 0 ? `${o.have}/${o.need}` : '';

    if (changed) {
      this.el.quest.classList.remove('pop');
      void this.el.quest.offsetWidth;
      this.el.quest.classList.add('pop');
    }
  }

  /** Messaggio temporaneo in alto (eventi importanti). */
  toast(text, ms = 2600) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    this.el.toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 400);
    }, ms);
  }

  update() {
    // Il contatore delle monete "scorre" invece di saltare: piccolo dettaglio
    // che rende molto più gustosa ogni vendita.
    if (this.shownCoins !== this.targetCoins) {
      const diff = this.targetCoins - this.shownCoins;
      const step = Math.max(1, Math.ceil(Math.abs(diff) * 0.22));
      this.shownCoins += Math.sign(diff) * Math.min(step, Math.abs(diff));
      this.el.coinsN.textContent = this.shownCoins;
    }

    this._refreshQuest();
    if (!this.el.shopSheet.hidden) this._refreshShopAfford();

    // Barra della salute: appare quando sei ferito e sparisce quando guarisci.
    const p = this.game.player;
    if (!p) return;
    const ratio = Math.max(0, p.hp / p.maxHp);
    const show = ratio < 0.999;
    if (show === this.el.health.hidden) this.el.health.hidden = !show;
    if (show) {
      this.el.healthFill.style.transform = `scaleX(${ratio})`;
      this.el.health.classList.toggle('low', ratio < 0.34);
    }
  }
}
