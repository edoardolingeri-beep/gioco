/**
 * MusicSystem.js — La colonna sonora, generata nota per nota.
 *
 * Nessun file audio: come per gli effetti, la musica è sintetizzata. Costa
 * zero byte di download (conta parecchio sugli store) e in cambio può fare
 * una cosa che un mp3 in loop non farebbe mai: CAMBIARE INSIEME AL MONDO.
 * Ogni fase del villaggio ha il suo tema — arpa e flauto nella foresta,
 * basso e battito nella metropoli — e la notte abbassa tutto di un'ottava.
 *
 * Il tempo lo tiene WebAudio, non il game loop: le note vengono programmate
 * in anticipo (`LOOKAHEAD`) sulla timeline dell'AudioContext, quindi restano
 * a tempo anche se il frame rate balla o la scheda passa in background.
 */

import { CFG } from '../data/config.js';

/** Quanto in là programmiamo le note, in secondi. */
const LOOKAHEAD = 0.7;

/**
 * Un tema per fase del villaggio. Gli accordi sono in semitoni rispetto alla
 * tonica; `arp` è il disegno degli ottavi (indice nell'accordo, o -1 = pausa).
 */
const THEMES = [
  { // 0-1 · foresta e primo accampamento: rado, ampio, un po' malinconico
    name: 'foresta',
    bpm: 68, root: 293.66,                 // Re
    chords: [[0, 4, 7], [-3, 2, 5], [-5, 0, 4], [-3, 2, 7]],
    arp: [0, -1, 1, 2, -1, 1, -1, 2],
    pad: 0.10, lead: 0.085, bass: 0, beat: 0,
  },
  { // 2 · villaggio: entra il basso, il passo si fa più deciso
    name: 'villaggio',
    bpm: 76, root: 293.66,
    chords: [[0, 4, 7], [-3, 2, 5], [-5, 0, 4], [2, 5, 9]],
    arp: [0, 2, 1, 2, 0, 2, 1, 3],
    pad: 0.09, lead: 0.08, bass: 0.09, beat: 0,
  },
  { // 3 · paese: arriva un battito leggero, come un mercato che si riempie
    name: 'paese',
    bpm: 84, root: 329.63,                 // Mi
    chords: [[0, 4, 7], [-2, 3, 7], [-5, 0, 4], [-3, 2, 7]],
    arp: [0, 2, 1, 3, 0, 2, 3, 2],
    pad: 0.085, lead: 0.075, bass: 0.10, beat: 0.05,
  },
  { // 4 · città: accordi più larghi, movimento continuo
    name: 'citta',
    bpm: 92, root: 329.63,
    chords: [[0, 4, 7, 11], [-3, 2, 5, 9], [-5, 0, 4, 7], [2, 5, 9, 12]],
    arp: [0, 2, 3, 1, 2, 0, 3, 2],
    pad: 0.08, lead: 0.07, bass: 0.11, beat: 0.07,
  },
  { // 5 · metropoli: pulsazione fissa, quasi elettronica
    name: 'metropoli',
    bpm: 100, root: 349.23,                // Fa
    chords: [[0, 3, 7, 10], [-2, 5, 8, 12], [-5, 0, 3, 7], [0, 4, 7, 11]],
    arp: [0, 3, 2, 3, 1, 3, 2, 3],
    pad: 0.075, lead: 0.07, bass: 0.12, beat: 0.09,
  },
];

export class MusicSystem {
  constructor(game) {
    this.game = game;
    this.audio = game.audio;
    this.enabled = true;
    this.step = 0;          // ottavi trascorsi dall'inizio
    this.nextTime = 0;      // istante (timeline audio) del prossimo ottavo
    this.themeIndex = 0;
    this.theme = THEMES[0];
    this._pendingTheme = 0;
  }

  /** La fase del villaggio sceglie il tema; il cambio avviene a fine battuta. */
  setPhase(level) {
    this._pendingTheme = Math.max(0, Math.min(THEMES.length - 1, level - 1));
  }

  update() {
    const a = this.audio;
    if (!this.enabled || !a.ready || !a.enabled) return;
    const ctx = a.ctx;
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now + 0.06;

    while (this.nextTime < now + LOOKAHEAD) {
      const inBar = this.step % 8;
      // Il tema nuovo entra solo a inizio battuta: cambiare a metà frase si
      // sentirebbe come un errore, non come un'evoluzione.
      if (inBar === 0 && this._pendingTheme !== this.themeIndex) {
        this.themeIndex = this._pendingTheme;
        this.theme = THEMES[this.themeIndex];
      }
      this._scheduleStep(this.step, this.nextTime);
      this.nextTime += 30 / this.theme.bpm;   // durata di un ottavo
      this.step++;
    }
  }

  /* ------------------------------------------------------------- voci */

  _scheduleStep(step, t) {
    const T = this.theme;
    const bar = Math.floor(step / 8) % T.chords.length;
    const chord = T.chords[bar];
    const inBar = step % 8;
    // Di notte la musica si ritira: più piano e un'ottava sotto.
    const night = this.game.dayNight?.isNight ?? false;
    const vol = night ? 0.6 : 1;
    const oct = night ? 0.5 : 1;

    // Tappeto: un accordo lungo a inizio battuta, appena sotto le altre voci.
    if (inBar === 0) {
      const dur = (30 / T.bpm) * 8;
      for (const semi of chord) {
        this._voice(T.root * oct * 0.5 * this._ratio(semi), t, dur * 1.05, {
          type: 'sine', gain: T.pad * vol, attack: 0.9, release: dur * 0.5,
        });
      }
    }

    // Basso: fondamentale sul primo e quinto ottavo.
    if (T.bass && (inBar === 0 || inBar === 4)) {
      this._voice(T.root * oct * 0.25 * this._ratio(chord[0]), t, 30 / T.bpm * 1.6, {
        type: 'triangle', gain: T.bass * vol, attack: 0.02, release: 0.4,
      });
    }

    // Arpeggio: la voce che si sente davvero.
    const idx = T.arp[inBar];
    if (idx >= 0 && idx < chord.length) {
      // Una nota su otto sale di un'ottava: basta questo a togliere la
      // sensazione di ciclo meccanico.
      const up = ((step * 7) % 13) < 3 ? 2 : 1;
      this._voice(T.root * oct * this._ratio(chord[idx]) * up, t, 0.55, {
        type: 'triangle', gain: T.lead * vol, attack: 0.012, release: 0.45,
        pan: ((step % 5) - 2) * 0.16,
      });
    }

    // Battito: un colpo sordo e filtrato, niente batteria vera.
    if (T.beat && inBar % 4 === 2) this._tick(t, T.beat * vol);
  }

  /** Rapporto di frequenza per un intervallo in semitoni. */
  _ratio(semi) { return Math.pow(2, semi / 12); }

  /**
   * Una nota. Inviluppo lineare in attacco ed esponenziale in rilascio: è la
   * forma che suona "suonata" invece che accesa e spenta.
   */
  _voice(freq, t, dur, { type = 'sine', gain = 0.08, attack = 0.02, release = 0.3, pan = 0 }) {
    const c = this.audio.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.05, dur + release));
    let node = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p); node = p;
    }
    o.connect(g);
    node.connect(this.audio.musicBus);
    o.start(t);
    o.stop(t + dur + release + 0.05);
  }

  /** Colpo di percussione: rumore passa-basso, corto. */
  _tick(t, gain) {
    const c = this.audio.ctx;
    const s = c.createBufferSource();
    s.buffer = this.audio._noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(220, t);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    s.connect(f).connect(g).connect(this.audio.musicBus);
    s.start(t);
    s.stop(t + 0.2);
  }

  setEnabled(v) {
    this.enabled = v;
    this.audio.setMusicVolume(v ? CFG.audio.music : 0);
  }
}
