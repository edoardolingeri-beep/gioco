/**
 * RaidSystem.js — I raid dei ladri (Fase 3+).
 *
 * Ogni tanto una banda di ladri incappucciati compare al bordo della mappa e
 * punta dritta al centro del villaggio, dove tiene la cassa. Non è un evento
 * a dado: ogni ladro è un `ThiefEntity` vero, che il giocatore può respingere
 * a colpi come un lupo, e che la torretta di guardia colpisce da sola se è
 * nel suo raggio (vedi `TowerEntity._defend`). Il vero deterrente però è il
 * recinto: un ladro non ha `opensGates` (vedi `FenceGateEntity`), quindi un
 * recinto chiuso lo blocca fisicamente, proprio come bloccherebbe il
 * giocatore — costruirlo (e i suoi allargamenti) è la difesa che conta di
 * più, non solo un pannello di negozio in più.
 *
 * Un raid finisce quando ogni ladro della banda è morto, è scappato dopo
 * aver rubato, o ha rinunciato senza riuscirci: solo allora arriva un unico
 * riepilogo, invece di un popup per ogni singolo ladro.
 */

import { CFG } from '../data/config.js';
import { ThiefEntity } from '../entities/ThiefEntity.js';
import { fxRand } from '../core/Rand.js';

export class RaidSystem {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.timer = CFG.raid.firstDelay;
    this.thieves = [];
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.timer = CFG.raid.firstDelay;
  }

  update(dt, game) {
    // ripulisce i morti/fuggiti
    for (let i = this.thieves.length - 1; i >= 0; i--) {
      const th = this.thieves[i];
      if (th.dead) { game.world.remove(th); this.thieves.splice(i, 1); }
    }

    if (!this.enabled) return;
    // Il primo raid arriva solo dopo che il recinto è comparso (vedi
    // CFG.raid.minVillageLevel): prima non ci sarebbe niente da difendere.
    if (game.village.level < CFG.raid.minVillageLevel) return;

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = fxRand.range(CFG.raid.interval[0], CFG.raid.interval[1]);
    this._spawnRaid(game);
  }

  _spawnRaid(game) {
    const C = CFG.raid;
    const count = C.thievesPerRaid[0]
      + Math.floor(Math.random() * (C.thievesPerRaid[1] - C.thievesPerRaid[0] + 1));

    const raid = {
      total: count, resolved: 0, stolen: 0, repelled: 0,
      resolve: (thief) => {
        raid.resolved++;
        if (thief.stole > 0) raid.stolen += thief.stole;
        if (!thief.alive) raid.repelled++;
        if (raid.resolved >= raid.total) this._finishRaid(game, raid);
      },
    };

    // Arrivano tutti dallo stesso settore, come una banda vera invece di
    // spuntare a caso su tutta la mappa — ma mai da oltre il fiume (a nord,
    // z molto negativo): senza il ponte è un muro invalicabile, e farceli
    // spuntare dietro significherebbe bloccarli lì per conto proprio, un
    // "recinto gratis" che non ha niente a che fare con le vere difese del
    // giocatore. La banda arriva sempre dal lato raggiungibile del villaggio.
    const RIVER_MARGIN = 1.0;
    const a0 = fxRand.range(-Math.PI / 2 + RIVER_MARGIN, (3 * Math.PI) / 2 - RIVER_MARGIN);
    // Appena fuori dal recinto (vero o teorico), non dal bordo estremo della
    // mappa: vedi CFG.raid.spawnMargin.
    const r = Math.min(CFG.world.radius - 3, game.village.fenceRadius + CFG.raid.spawnMargin);
    for (let i = 0; i < count; i++) {
      const a = a0 + fxRand.range(-0.35, 0.35);
      const thief = new ThiefEntity(Math.cos(a) * r, Math.sin(a) * r, game, (Math.random() * 5) | 0);
      thief.raid = raid;
      game.world.add(thief, true);
      this.thieves.push(thief);
    }

    game.hud.toast('Una banda di ladri si avvicina al villaggio! 🥷');
    game.audio.wolfHowl();
  }

  /** Un solo riepilogo per l'intero raid, non uno per ladro. */
  _finishRaid(game, raid) {
    game.stats.thievesRepelled = (game.stats.thievesRepelled ?? 0) + raid.repelled;

    if (raid.stolen > 0) {
      game.stats.coinsStolen = (game.stats.coinsStolen ?? 0) + raid.stolen;
      game.hud.showRaidResult({
        icon: '🥷',
        title: 'Il villaggio è stato derubato!',
        desc: raid.repelled > 0
          ? `I ladri sono riusciti a rubare ${raid.stolen} monete dalla cassa — ma ne avete respinti ${raid.repelled}.`
          : `I ladri sono riusciti a rubare ${raid.stolen} monete dalla cassa. Un recinto chiuso o una torretta li avrebbero fermati.`,
      });
    } else if (raid.repelled > 0) {
      game.hud.toast(`Raid respinto! Nessun furto, ${raid.repelled} ladri fermati 🛡️`);
    } else {
      game.hud.toast('I ladri hanno rinunciato: il recinto li ha bloccati 🛡️');
    }
  }
}
