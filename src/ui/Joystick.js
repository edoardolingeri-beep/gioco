/**
 * Joystick.js — Rappresentazione grafica del joystick virtuale.
 *
 * Vive nel DOM (non sul canvas): due soli elementi trasformati via CSS,
 * quindi il compositor del telefono se ne occupa in GPU e non costa nulla
 * al ciclo di rendering del gioco.
 */

export class Joystick {
  constructor(layer, input) {
    this.input = input;
    this.layer = layer;

    this.base = document.createElement('div');
    this.base.className = 'stick-base';
    this.knob = document.createElement('div');
    this.knob.className = 'stick-knob';
    layer.append(this.base, this.knob);

    this.visible = false;
  }

  update() {
    const s = this.input.stickState();
    if (s.active !== this.visible) {
      this.visible = s.active;
      this.layer.classList.toggle('visible', s.active);
    }
    if (!s.active) return;

    // Il pomello segue il dito ma resta agganciato al raggio massimo.
    const dx = s.kx - s.ox, dy = s.ky - s.oy;
    const len = Math.hypot(dx, dy);
    const max = 62;
    const k = len > max ? max / len : 1;

    this.base.style.transform = `translate3d(${s.ox}px, ${s.oy}px, 0) translate(-50%, -50%)`;
    this.knob.style.transform =
      `translate3d(${s.ox + dx * k}px, ${s.oy + dy * k}px, 0) translate(-50%, -50%)`;
  }
}
