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
        <button class="icon-btn" id="hud-menu" data-ui aria-label="Opzioni">⚙️</button>
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
    };

    this.shownCoins = 0;
    this.targetCoins = 0;

    this._bind();
    this._refreshCarry();
  }

  _bind() {
    const g = this.game;

    g.bus.on('carry:changed', () => this._refreshCarry());
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
    this.el.stats.innerHTML = `
      <div><b>${s.treesChopped}</b><span>alberi</span></div>
      <div><b>${s.coins}</b><span>monete</span></div>
      <div><b>${s.axeLevel}</b><span>ascia</span></div>
      <div><b>${s.capacity}</b><span>zaino</span></div>
    `;
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
  }
}
