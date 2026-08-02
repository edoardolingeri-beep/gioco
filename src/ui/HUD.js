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
        <button class="icon-btn" id="hud-menu" data-ui aria-label="Opzioni">⚙️</button>
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
          <label class="row"><span>📳 Vibrazione</span><input type="checkbox" id="opt-haptics" checked></label>
          <label class="row"><span>🐞 Debug</span><input type="checkbox" id="opt-debug"></label>
          <div class="stat-row" id="opt-stats"></div>
          <button class="btn danger" id="opt-reset">Ricomincia da capo</button>
          <button class="btn" id="opt-close">Chiudi</button>
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
      stats: this.root.querySelector('#opt-stats'),
      village: this.root.querySelector('#hud-village'),
      pop: this.root.querySelector('#hud-pop'),
      health: this.root.querySelector('#hud-health'),
      healthFill: this.root.querySelector('#hud-health-fill'),
    };

    this.healthShown = 1;

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
    this.root.querySelector('#opt-close').addEventListener('click', () => {
      this.el.sheet.hidden = true;
    });
    this.root.querySelector('#opt-reset').addEventListener('click', () => {
      if (confirm('Cancellare i progressi e ricominciare?')) g.reset();
    });
    this.root.querySelector('#opt-audio').addEventListener('change', (e) => {
      g.audio.setEnabled(e.target.checked);
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
      <div><b>${v.population}</b><span>abitanti</span></div>
      <div><b>${s.coins}</b><span>monete</span></div>
      <div><b>${s.axeLevel}</b><span>ascia</span></div>
      <div><b>${s.hasPick ? s.pickLevel : '—'}</b><span>piccone</span></div>
      <div><b>${s.capacity}</b><span>zaino</span></div>
    `;
    this.el.stats.dataset.stage = v.stageName;
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
