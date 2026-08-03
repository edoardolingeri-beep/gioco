/**
 * ObjectiveSystem.js — "E adesso?"
 *
 * Il gioco non ha menù né missioni: tutto succede nel mondo. Il rovescio della
 * medaglia è che nei primi minuti si può restare fermi a chiedersi cosa fare.
 * Questo sistema deduce dallo STATO — non da una lista di missioni scritta a
 * mano — qual è il prossimo passo sensato, e lo riassume in una riga.
 *
 * Regola d'oro: un obiettivo alla volta, sempre quello più vicino a compiersi.
 * L'ordine di priorità è quello di una vera catena di dipendenze:
 *   attrezzo mancante → monete per sbloccare → risorse da raccogliere →
 *   risorse da consegnare.
 *
 * Nessuna allocazione per frame: l'obiettivo viene ricalcolato in un oggetto
 * riusato, e la HUD si aggiorna solo se il testo è cambiato davvero.
 */

import { UPGRADES } from '../data/config.js';
import { BUILD_ORDER, RESOURCE_INFO } from '../data/buildings.js';
import { BUILD_STATE } from '../entities/BuildingEntity.js';

/** Piccone minimo per estrarre ogni risorsa. */
const PICK_FOR = { stone: 1, iron: 2, gold: 3 };

export class ObjectiveSystem {
  constructor(game) {
    this.game = game;
    /** Obiettivo corrente (oggetto riusato). */
    this.current = { icon: '', text: '', have: 0, need: 0, key: '' };
    this._t = 0;
  }

  update(dt) {
    // Due volte al secondo bastano: è un cartello, non un contatore.
    this._t += dt;
    if (this._t < 0.5) return;
    this._t = 0;
    this._compute();
  }

  _set(key, icon, text, have = 0, need = 0) {
    const c = this.current;
    c.key = key; c.icon = icon; c.text = text; c.have = have; c.need = need;
    return c;
  }

  _compute() {
    const g = this.game;
    const s = g.stats;

    // Il cantiere aperto più avanti nella progressione: è sempre lui il filo
    // conduttore della partita.
    let site = null;
    for (const id of BUILD_ORDER) {
      const b = g.world.buildings[id];
      if (b && b.available && b.state !== BUILD_STATE.DONE) { site = b; break; }
    }
    if (!site) return this._set('done', '🌆', 'La metropoli è completa. Goditela!');

    const name = site.def.name;

    /* 1. Il cantiere è ancora col lucchetto: servono monete. */
    if (!site.unlocked) {
      const cost = site.def.unlockCost;
      if (s.coins >= cost) {
        return this._set('unlock-go', '🔓', `Vai al progetto: ${name}`, cost, cost);
      }
      return this._set('unlock-coins', '🪙',
        `Vendi al mercante per aprire ${name}`, s.coins, cost);
    }

    /* 2. Manca una risorsa: prima verifichiamo di poterla estrarre. */
    const type = site.missingType();
    if (!type) return this._set('deliver-any', '📦', `Entra nel cantiere: ${name}`, 1, 1);

    const needPick = PICK_FOR[type] ?? 0;
    if (needPick && (s.pickLevel ?? 0) < needPick) {
      // L'attrezzo si compra al banco, ma i potenziamenti escono in ordine:
      // l'obiettivo è il PROSSIMO acquisto, non quello finale.
      const up = UPGRADES[g.world.workbench.index];
      if (up) {
        if (s.coins >= up.cost) {
          return this._set('buy-go', up.icon, `Al banco: ${up.label}`, up.cost, up.cost);
        }
        return this._set('buy-coins', '🪙',
          `Monete per ${up.label}`, s.coins, up.cost);
      }
    }

    const info = RESOURCE_INFO[type];
    const missing = site.def.cost[type] - site.paid[type];
    const inBag = g.carry.count(type);

    /* 3. Ne hai già addosso: portale al cantiere. */
    if (inBag > 0 && (inBag >= missing || g.carry.isFull)) {
      return this._set('deliver', '📦', `Porta ${info.label.toLowerCase()} a ${name}`,
        site.paid[type], site.def.cost[type]);
    }

    /* 4. Altrimenti si raccoglie. La barra conta anche ciò che hai in spalla,
          così non sembra di essere fermi mentre si torna indietro. */
    return this._set('gather', info.icon, `Raccogli ${info.label.toLowerCase()} per ${name}`,
      Math.min(site.def.cost[type], site.paid[type] + inBag), site.def.cost[type]);
  }
}
