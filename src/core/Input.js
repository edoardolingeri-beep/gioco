/**
 * Input.js — Comandi unificati: joystick virtuale (touch) + tastiera (desktop).
 *
 * Il joystick è "dinamico": nasce dove appoggi il dito, ovunque sullo schermo.
 * È il modello di controllo più comodo sui giochi mobile e non ruba spazio
 * all'interfaccia.
 *
 * Espone semplicemente:  input.x, input.z  (versore) e input.mag (0..1).
 */

import { clamp } from './MathUtils.js';

const DEAD_ZONE = 6;      // px prima che il movimento venga registrato
const MAX_RADIUS = 62;    // px per raggiungere la velocità massima

export class Input {
  constructor(target, bus) {
    this.bus = bus;
    this.x = 0; this.z = 0; this.mag = 0;

    this.touchId = null;
    this.originX = 0; this.originY = 0;
    this.curX = 0; this.curY = 0;
    this.active = false;

    this.keys = new Set();
    this._bind(target);
  }

  _bind(el) {
    const opts = { passive: false };

    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this.touchId !== null) return;
      // Non catturare i tocchi sull'interfaccia (bottoni HUD).
      if (e.target.closest?.('[data-ui]')) return;
      this.touchId = e.pointerId;
      this.originX = this.curX = e.clientX;
      this.originY = this.curY = e.clientY;
      this.active = true;
      el.setPointerCapture?.(e.pointerId);
      this.bus?.emit('input:down', { x: e.clientX, y: e.clientY });
      e.preventDefault();
    }, opts);

    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.touchId) return;
      this.curX = e.clientX;
      this.curY = e.clientY;
      e.preventDefault();
    }, opts);

    const end = (e) => {
      if (e.pointerId !== this.touchId) return;
      this.touchId = null;
      this.active = false;
      this.bus?.emit('input:up');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    // Tastiera (comodo per lo sviluppo e per il desktop)
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    // Evita lo scroll elastico e lo zoom a due dita su iOS.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, opts);
  }

  /** Da chiamare una volta per frame prima della logica di gioco. */
  update() {
    let dx = 0, dz = 0;

    if (this.active) {
      let vx = this.curX - this.originX;
      let vy = this.curY - this.originY;
      const len = Math.hypot(vx, vy);
      if (len > DEAD_ZONE) {
        // Se il dito supera il raggio massimo, il centro del joystick lo segue:
        // così non si "perde" mai il controllo trascinando lontano.
        if (len > MAX_RADIUS) {
          const over = len - MAX_RADIUS;
          this.originX += (vx / len) * over;
          this.originY += (vy / len) * over;
          vx = (vx / len) * MAX_RADIUS;
          vy = (vy / len) * MAX_RADIUS;
        }
        const l2 = Math.hypot(vx, vy);
        const m = clamp((l2 - DEAD_ZONE) / (MAX_RADIUS - DEAD_ZONE), 0, 1);
        dx = (vx / l2) * m;
        dz = (vy / l2) * m;
      }
    }

    // La tastiera ha la precedenza se premuta.
    let kx = 0, kz = 0;
    const K = this.keys;
    if (K.has('KeyA') || K.has('ArrowLeft')) kx -= 1;
    if (K.has('KeyD') || K.has('ArrowRight')) kx += 1;
    if (K.has('KeyW') || K.has('ArrowUp')) kz -= 1;
    if (K.has('KeyS') || K.has('ArrowDown')) kz += 1;
    if (kx || kz) {
      const l = Math.hypot(kx, kz);
      dx = kx / l; dz = kz / l;
    }

    this.x = dx; this.z = dz;
    this.mag = Math.min(1, Math.hypot(dx, dz));
  }

  /** Stato grafico del joystick (per la UI). */
  stickState() {
    return {
      active: this.active,
      ox: this.originX, oy: this.originY,
      kx: this.curX, ky: this.curY,
    };
  }
}
