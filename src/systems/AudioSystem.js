/**
 * AudioSystem.js — Effetti sonori sintetizzati con la WebAudio API.
 *
 * Nessun file audio da scaricare: tutti i suoni sono generati proceduralmente.
 * Questo tiene l'app leggerissima (importante per gli store) e permette di
 * variare tono e timbro ad ogni colpo, evitando la ripetitività.
 */

import { CFG } from '../data/config.js';
import { fxRand } from '../core/Rand.js';

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.ready = false;
    this._noiseBuf = null;
  }

  /** Deve essere chiamato dentro un gesto dell'utente (policy dei browser). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = CFG.audio.master;
    // Un compressore evita il "fango" quando partono molti suoni insieme.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 8;
    this.master.connect(comp).connect(this.ctx.destination);
    this._makeNoise();
    this.ready = true;
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.master) this.master.gain.value = v ? CFG.audio.master : 0;
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
  }

  get t() { return this.ctx.currentTime; }

  /** Oscillatore con inviluppo esponenziale. */
  _tone(freq, dur, { type = 'sine', gain = 0.3, slide = 1, delay = 0, pan = 0 } = {}) {
    if (!this.ready || !this.enabled) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p); node = p;
    }
    o.connect(g);
    node.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  /** Rumore filtrato: impatti, fruscii, terra. */
  _noise(dur, { freq = 900, q = 1, gain = 0.3, type = 'bandpass', delay = 0, slide = 1 } = {}) {
    if (!this.ready || !this.enabled) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this._noiseBuf;
    s.playbackRate.value = 1;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (slide !== 1) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * slide), t0 + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  /* ------------------------------------------------------------- suoni */

  chop(power = 1) {
    const v = fxRand.range(0.94, 1.08);
    this._noise(0.09, { freq: 1500 * v, q: 1.2, gain: 0.34 * power, slide: 0.35 });
    this._tone(190 * v, 0.13, { type: 'triangle', gain: 0.22 * power, slide: 0.55 });
  }

  treeFall() {
    this._noise(0.75, { freq: 800, q: 0.7, gain: 0.3, slide: 0.18 });
    this._tone(90, 0.45, { type: 'sine', gain: 0.3, slide: 0.5, delay: 0.42 });
    this._noise(0.3, { freq: 400, q: 0.6, gain: 0.28, delay: 0.42, slide: 0.4 });
  }

  pop(i = 0) {
    // Nota che sale con la combo: la classica scala "dopaminica".
    const semis = Math.min(i, 12);
    const f = 620 * Math.pow(2, semis / 12);
    this._tone(f, 0.1, { type: 'triangle', gain: 0.22, slide: 1.25 });
  }

  coin(i = 0) {
    const f = 880 * Math.pow(2, Math.min(i, 10) / 12);
    this._tone(f, 0.08, { type: 'square', gain: 0.13 });
    this._tone(f * 1.5, 0.12, { type: 'square', gain: 0.1, delay: 0.05 });
  }

  deposit(i = 0) {
    const f = 380 * Math.pow(2, Math.min(i, 14) / 16);
    this._tone(f, 0.09, { type: 'sine', gain: 0.18, slide: 1.3 });
    this._noise(0.06, { freq: 2200, q: 2, gain: 0.08 });
  }

  build() {
    this._noise(0.5, { freq: 500, q: 0.6, gain: 0.3, slide: 0.4 });
    [0, 0.09, 0.18].forEach((d, i) => this._tone(330 * (1 + i * 0.26), 0.3, {
      type: 'triangle', gain: 0.2, delay: d,
    }));
  }

  upgrade() {
    [0, 0.08, 0.16, 0.26].forEach((d, i) => this._tone(440 * Math.pow(2, i / 4), 0.35, {
      type: 'triangle', gain: 0.16, delay: d,
    }));
    this._noise(0.4, { freq: 3000, q: 1, gain: 0.1, slide: 2 });
  }

  step() {
    this._noise(0.07, { freq: fxRand.range(320, 460), q: 1.4, gain: 0.06, slide: 0.6 });
  }

  denied() {
    this._tone(200, 0.14, { type: 'sawtooth', gain: 0.12, slide: 0.7 });
  }

  /* ------------------------------------------------------ Fase 2: pietra */

  /** Picconata: più metallica e secca del colpo d'ascia. */
  mine() {
    const v = fxRand.range(0.92, 1.1);
    this._noise(0.07, { freq: 2600 * v, q: 2.2, gain: 0.3, slide: 0.4 });
    this._tone(340 * v, 0.09, { type: 'square', gain: 0.12, slide: 0.6 });
    this._tone(150 * v, 0.14, { type: 'triangle', gain: 0.2, slide: 0.5 });
  }

  rockBreak() {
    this._noise(0.5, { freq: 1200, q: 0.7, gain: 0.34, slide: 0.22 });
    this._tone(110, 0.35, { type: 'triangle', gain: 0.24, slide: 0.5 });
    this._noise(0.22, { freq: 3000, q: 1.5, gain: 0.14, delay: 0.05, slide: 0.3 });
  }

  /* ---------------------------------------------------- Fase 2: nemici */

  /** Colpo andato a segno su un nemico. */
  hitFlesh() {
    this._noise(0.1, { freq: 700, q: 1, gain: 0.28, slide: 0.3, type: 'lowpass' });
    this._tone(220, 0.1, { type: 'sawtooth', gain: 0.14, slide: 0.55 });
  }

  /** Fendente a vuoto: il fruscio dell'arma. */
  swing() {
    this._noise(0.13, { freq: 1800, q: 0.8, gain: 0.12, slide: 0.25 });
  }

  wolfHowl() {
    this._tone(340, 0.5, { type: 'sawtooth', gain: 0.1, slide: 1.35 });
    this._tone(170, 0.55, { type: 'triangle', gain: 0.09, slide: 1.3 });
  }

  wolfDie() {
    this._tone(300, 0.4, { type: 'sawtooth', gain: 0.13, slide: 0.35 });
    this._noise(0.3, { freq: 900, q: 0.8, gain: 0.16, slide: 0.35 });
  }

  /* --------------------------------------------------- Fase 2: giocatore */

  playerHurt() {
    this._tone(420, 0.16, { type: 'square', gain: 0.16, slide: 0.45 });
    this._noise(0.18, { freq: 500, q: 0.9, gain: 0.2, slide: 0.4 });
  }

  faint() {
    [0, 0.12, 0.26].forEach((d, i) => this._tone(360 / (i + 1), 0.4, {
      type: 'triangle', gain: 0.18, delay: d, slide: 0.5,
    }));
  }

  revive() {
    [0, 0.09, 0.18].forEach((d, i) => this._tone(330 * Math.pow(2, i / 3), 0.32, {
      type: 'sine', gain: 0.16, delay: d,
    }));
  }

  /* -------------------------------------------------- Fase 2: villaggio */

  /** Un arredo che spunta dal terreno. */
  plant() {
    this._noise(0.16, { freq: 900, q: 1.1, gain: 0.12, slide: 1.8 });
    this._tone(520, 0.14, { type: 'sine', gain: 0.1, slide: 1.5 });
  }

  /** Clacson dell'auto o campanello del tram. */
  horn(isTram = false) {
    if (isTram) {
      this._tone(1180, 0.14, { type: 'sine', gain: 0.1 });
      this._tone(1560, 0.2, { type: 'sine', gain: 0.08, delay: 0.1 });
    } else {
      this._tone(420, 0.22, { type: 'square', gain: 0.09 });
      this._tone(316, 0.22, { type: 'square', gain: 0.08 });
    }
  }

  /** Fanfara del villaggio che sale di livello. */
  villageGrow() {
    [0, 0.1, 0.2, 0.32, 0.46].forEach((d, i) => this._tone(
      392 * Math.pow(2, [0, 2, 4, 5, 7][i] / 12), 0.45,
      { type: 'triangle', gain: 0.17, delay: d },
    ));
    this._noise(0.6, { freq: 2600, q: 1, gain: 0.1, slide: 1.8, delay: 0.1 });
  }
}
