/**
 * RockEntity.js — Il masso di pietra (Fase 2).
 *
 * Stessa filosofia dell'albero: ti avvicini e il personaggio inizia da solo,
 * ma serve il PICCONE. Senza, un fumetto spiega cosa manca — è il modo in cui
 * il gioco insegna la progressione senza tutorial.
 *
 * Ciclo: INTATTO ──(picconate)──▶ FRANTUMATO ──(attesa)──▶ RIFORMATO
 */

import { Entity } from './Entity.js';
import { CFG } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { drawPanel } from '../ui/WorldUI.js';
import { clamp, damp, easeOutBack, rgbToCss } from '../core/MathUtils.js';

export const ROCK_STATE = { SOLID: 0, BROKEN: 1, REFORMING: 2 };

/** Quante volte, per tipo di risorsa, il fumetto compare non appena ci si
 *  avvicina. Dopo, ha già insegnato quel che doveva: si fa vedere solo a chi
 *  resta lì fermo a provare a spaccarla davvero. */
const HINT_FREE_SHOWS = 2;
/** Raggio entro cui ci si "accorge" del masso (in unità al quadrato). */
const HINT_NOTICE_R2 = 3 * 3;
/** Raggio, più stretto, entro cui fermarsi conta come "ci sta provando". */
const HINT_TRY_R2 = 1.9 * 1.9;
/** Secondi di sosta continua prima che il fumetto tardivo si faccia vedere. */
const HINT_DWELL = 0.45;

export class RockEntity extends Entity {
  /**
   * @param {object} o opzioni: { resource, hits, regrow, requiredPick, hint }
   *   Parametrizzando questi quattro valori la stessa classe serve sia la
   *   pietra sia le vene di ferro della Fase 3.
   */
  constructor(x, z, sprite, rubbleSprite, scale = 1, o = {}) {
    super(x, z);
    this.sprite = sprite;
    this.rubbleSprite = rubbleSprite;
    this.scale = scale;
    this.radius = (sprite.radius ?? 0.6) * scale;
    this.solid = true;
    this.static = false;

    this.resourceType = o.resource ?? 'stone';
    this.requiredPick = o.requiredPick ?? 1;
    this.hintText = o.hint ?? 'Serve il piccone ⛏️';
    this.regrowDelay = o.regrow ?? CFG.harvest.rockRegrowDelay;
    this.chipColor = o.chipColor ?? null;

    this.state = ROCK_STATE.SOLID;
    this.maxHp = o.hits ?? CFG.harvest.rockHits;
    this.hp = this.maxHp;
    this.harvestable = true;
    /** Un operaio al lavoro qui: nessun altro operaio lo sceglie come bersaglio. */
    this.reservedBy = null;

    this.shake = 0;
    this.shakePhase = 0;
    this.shakeDir = 1;
    this.timer = 0;
    this.growT = 0;
    this.squash = 1;

    /* --- fumetto "serve il piccone" --- */
    this.hintT = 0;
    this.hintDwell = 0;
    this.hintCounted = false;
    this.hintVisiting = false;   // il giocatore è entrato nel raggio d'attenzione
    this.hintFree = false;       // questa visita rientra ancora nelle "prime volte"?
  }

  /** Il tipo di risorsa che produce. */
  get resource() { return this.resourceType; }

  /** Livello di piccone necessario per intaccarla. */
  canMine(stats) {
    return stats.hasPick && stats.pickLevel >= this.requiredPick;
  }

  hit(damage, fromX, fromZ, game) {
    if (this.state !== ROCK_STATE.SOLID) return false;
    this.hp -= damage;

    const dx = this.x - fromX, dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.shakeDir = dx / len;
    this.shake = 0.07;
    this.shakePhase = 0;
    this.squash = 0.93;

    const hitY = 0.5 * this.scale;
    game.fx.chips(this.x, hitY, this.z, 8, this.chipColor ?? rgbToCss(PAL.stoneLight), 1, -dx / len, -dz / len);
    game.fx.sparks(this.x, hitY, this.z, 3, 'rgba(255,240,200,1)', 0.5);
    game.audio.mine();
    game.haptics.fire('medium', 30);
    game.cam.addShake(0.13);

    if (this.hp <= 0) {
      this.shatter(game);
      return true;
    }
    return false;
  }

  /**
   * Il masso esplode in schegge e rilascia la pietra.
   * @param {boolean} silent se true non fa cadere minerale a terra: lo porta
   *   già con sé chi lo ha frantumato (un operaio).
   */
  shatter(game, silent = false) {
    this.state = ROCK_STATE.BROKEN;
    this.solid = false;
    this.harvestable = false;
    this.radius = 0.34;
    this.timer = 0;
    this.hintT = 0;
    this.hintDwell = 0;
    this.hintCounted = false;
    this.hintVisiting = false;
    this.reservedBy = null;

    game.audio.rockBreak();
    game.haptics.fire('heavy', 0);
    game.cam.addShake(0.42);
    game.fx.chips(this.x, 0.5 * this.scale, this.z, 18, this.chipColor ?? rgbToCss(PAL.stone), 1.5);
    game.fx.puff(this.x, 0.1, this.z, 10, 'rgba(198,200,208,0.85)', 1.1, 0.32);
    if (!silent) game.spawnOre(this);
  }

  update(dt, game) {
    this.squash = damp(this.squash, 1, 11, dt);

    switch (this.state) {
      case ROCK_STATE.SOLID:
        if (this.shake > 0.0004) {
          this.shakePhase += dt * 24;
          this.shake *= Math.exp(-9 * dt);
        } else this.shake = 0;
        this._updateHint(dt, game);
        break;

      case ROCK_STATE.BROKEN:
        this.timer += dt;
        if (this.timer >= this.regrowDelay) {
          this.state = ROCK_STATE.REFORMING;
          this.growT = 0;
          game.fx.sparks(this.x, 0.3, this.z, 8, 'rgba(200,220,255,1)', 0.7);
        }
        break;

      case ROCK_STATE.REFORMING:
        this.growT += dt / 2.2;
        if (this.growT >= 1) {
          this.state = ROCK_STATE.SOLID;
          this.hp = this.maxHp;
          this.solid = true;
          this.harvestable = true;
          this.radius = (this.sprite.radius ?? 0.6) * this.scale;
        }
        break;
    }
  }

  draw(r, game) {
    if (this.state === ROCK_STATE.SOLID) {
      const rot = this.shake * Math.sin(this.shakePhase) * this.shakeDir;
      r.shadow(this.x, this.z, this.radius * 1.15, 1);
      r.sprite(this.sprite, this.x, 0, this.z, {
        scale: this.scale,
        rot,
        squash: this.squash,
        depth: this.depth,
      });
      void game;
      return;
    }

    if (this.state === ROCK_STATE.BROKEN) {
      r.shadow(this.x, this.z, 0.4, 0.8);
      r.sprite(this.rubbleSprite, this.x, 0, this.z, { depth: this.depth });
      return;
    }

    // REFORMING: le macerie restano e il masso ricresce con un rimbalzo
    const k = clamp(this.growT, 0, 1);
    r.shadow(this.x, this.z, 0.4 + k * this.radius, 1);
    r.sprite(this.rubbleSprite, this.x, 0, this.z, { depth: this.depth });
    r.sprite(this.sprite, this.x, 0, this.z, {
      scale: this.scale * (0.2 + easeOutBack(k) * 0.8),
      alpha: clamp(k * 1.6, 0, 1),
      depth: this.depth + 0.004,
    });
  }

  /**
   * Il fumetto "serve il piccone" spiega la progressione senza un tutorial,
   * ma non deve diventare un cartello fisso: le prime volte compare appena ti
   * avvicini (è lì per insegnare), dopo si fa vedere solo se ti fermi a
   * provare a spaccarla — segno che stai davvero cercando di capire perché
   * non ci riesci, non che stai solo passando di lì.
   */
  _updateHint(dt, game) {
    if (this.canMine(game.stats)) {
      this.hintT = Math.max(0, this.hintT - dt * 2.4);
      this.hintDwell = 0;
      this.hintVisiting = false;
      return;
    }

    const p = game.player;
    const d2 = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
    if (d2 > HINT_NOTICE_R2) {
      this.hintT = Math.max(0, this.hintT - dt * 2.4);
      this.hintDwell = 0;
      // Uscire dal raggio chiude la visita: al prossimo ingresso si decide
      // di nuovo se è ancora una delle "prime volte".
      this.hintVisiting = false;
      return;
    }

    // La decisione "è ancora una prima volta?" si prende UNA SOLA VOLTA per
    // visita, appena si entra nel raggio — non a ogni frame. Rileggendo il
    // contatore in continuazione, il fumetto stesso lo fa scattare a metà
    // della propria apparizione e si spegne da solo a metà frase.
    if (!this.hintVisiting) {
      this.hintVisiting = true;
      this.hintCounted = false;
      const shown = game.stats.rockHintsSeen[this.resourceType] ?? 0;
      this.hintFree = shown < HINT_FREE_SHOWS;
    }

    let eligible;
    if (this.hintFree) {
      eligible = true;
    } else {
      const trying = d2 < HINT_TRY_R2 && p.speed < 1.3;
      this.hintDwell = trying ? this.hintDwell + dt : Math.max(0, this.hintDwell - dt * 2);
      eligible = this.hintDwell >= HINT_DWELL;
    }

    if (eligible) {
      this.hintT = Math.min(1, this.hintT + dt * 3.2);
      if (this.hintT >= 0.99 && !this.hintCounted) {
        const seen = game.stats.rockHintsSeen;
        seen[this.resourceType] = (seen[this.resourceType] ?? 0) + 1;
        this.hintCounted = true;
      }
    } else {
      this.hintT = Math.max(0, this.hintT - dt * 2.4);
    }
  }

  drawUI(ctx, cam, dpr, game) {
    void game;
    if (this.hintT <= 0.01) return;
    drawPanel(ctx, cam, dpr, this.x, this.sprite.height * this.scale + 0.5, this.z, {
      title: this.hintText,
      appear: this.hintT,
      width: 172,
      titleColor: '#cbd2e0',
    });
  }
}
