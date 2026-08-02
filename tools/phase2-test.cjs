/**
 * phase2-test.cjs — Verifica end-to-end delle meccaniche di Fase 2:
 * piccone e pietra, cantieri sbloccabili, crescita del villaggio, abitanti,
 * lupi e combattimento.
 */

const { chromium } = require('playwright');

const shot = (n) => `/tmp/f2-${n}.png`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + '\n' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });

  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 40000 });
  await page.waitForTimeout(800);

  const boot = await page.evaluate(() => {
    const g = window.game;
    return {
      atlasWolf: !!g.assets.wolf && g.assets.wolf.walk.length,
      atlasNpc: g.assets.npc.length,
      mineFrames: g.assets.char.mine?.length ?? 0,
      oreRocks: g.assets.oreRocks.length,
      villageProps: Object.keys(g.assets.village).length,
      buildings: Object.keys(g.world.buildings).length,
      rocksInWorld: (() => {
        const out = []; g.world.grid.queryRect(-50, -50, 50, 50, out);
        return out.filter((e) => e.constructor.name === 'RockEntity').length;
      })(),
    };
  });
  console.log('AVVIO:', JSON.stringify(boot));

  /* --- 1. massi senza piccone: non si rompono --- */
  await page.evaluate(() => {
    const g = window.game;
    const out = []; g.world.grid.queryRect(-50, -50, 50, 50, out);
    const rock = out.filter((e) => e.constructor.name === 'RockEntity')[0];
    window.__rock = rock;
    g.player.x = rock.x + 1.0; g.player.z = rock.z + 1.0;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(2200);
  const noPick = await page.evaluate(() => ({
    hp: window.__rock.hp, anim: window.game.player.anim, carry: window.game.carry.total,
  }));
  console.log('SENZA PICCONE:', JSON.stringify(noPick));
  await page.screenshot({ path: shot('1-nopick') });

  /* --- 2. con il piccone: la pietra si raccoglie --- */
  await page.evaluate(() => {
    const g = window.game;
    g.stats.hasPick = true; g.stats.pickLevel = 1; g.recomputeStats();
  });
  await page.waitForTimeout(4500);
  const withPick = await page.evaluate(() => ({
    hp: window.__rock.hp, state: window.__rock.state,
    stone: window.game.carry.count('stone'), mined: window.game.stats.rocksMined,
    anim: window.game.player.anim,
  }));
  console.log('CON PICCONE:', JSON.stringify(withPick));
  await page.screenshot({ path: shot('2-mining') });

  /* --- 3. costruzione capanna → nasce il villaggio --- */
  await page.evaluate(() => {
    const g = window.game;
    // capienza artificiale: qui vogliamo testare il cantiere, non lo zaino
    g.carry.setCapacity(400);
    g.carry.add('wood', 40);
    g.player.x = g.world.hut.x + 1.5; g.player.z = g.world.hut.z + 2.0;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(5000);
  const village = await page.evaluate(() => {
    const g = window.game;
    return {
      hutState: g.world.hut.state,
      villageLevel: g.village.level,
      stage: g.village.stageName,
      npcs: g.village.population,
      poi: g.village.pointsOfInterest.length,
      sawmillAvailable: g.world.buildings.sawmill.available,
      spawnerOn: g.spawner.enabled,
    };
  });
  console.log('VILLAGGIO:', JSON.stringify(village));
  await page.screenshot({ path: shot('3-village') });

  /* --- 4. sblocco a monete del cantiere segheria --- */
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(500);
    const b = g.world.buildings.sawmill;
    g.player.x = b.x + 1.2; g.player.z = b.z + 1.6;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(1800);
  const unlock = await page.evaluate(() => {
    const b = window.game.world.buildings.sawmill;
    return { unlocked: b.unlocked, coins: window.game.stats.coins };
  });
  console.log('SBLOCCO SEGHERIA:', JSON.stringify(unlock));

  /* --- 5. costruzione segheria → villaggio livello 2 --- */
  await page.evaluate(() => {
    const g = window.game;
    g.carry.setCapacity(400);
    g.carry.add('wood', 70);
    const b = g.world.buildings.sawmill;
    g.player.x = b.x + 1.4; g.player.z = b.z + 1.8;
    g.grid.update(g.player);
  });
  await page.waitForTimeout(5000);
  const lvl2 = await page.evaluate(() => {
    const g = window.game;
    return {
      state: g.world.buildings.sawmill.state,
      level: g.village.level, stage: g.village.stageName,
      npcs: g.village.population,
      logBonus: g.stats.logBonus,
      quarryAvailable: g.world.buildings.quarry.available,
    };
  });
  console.log('LIVELLO 2:', JSON.stringify(lvl2));
  await page.screenshot({ path: shot('4-sawmill') });

  /* --- 6. abitanti: si muovono e hanno mete --- */
  const npcBefore = await page.evaluate(() =>
    window.game.village.npcs.map((n) => [+n.x.toFixed(2), +n.z.toFixed(2)]));
  await page.waitForTimeout(4000);
  const npcAfter = await page.evaluate(() => ({
    pos: window.game.village.npcs.map((n) => [+n.x.toFixed(2), +n.z.toFixed(2)]),
    acts: window.game.village.npcs.map((n) => n.act),
  }));
  const moved = npcAfter.pos.filter((p, i) =>
    npcBefore[i] && (Math.abs(p[0] - npcBefore[i][0]) > 0.3 || Math.abs(p[1] - npcBefore[i][1]) > 0.3));
  console.log('ABITANTI: totale', npcAfter.pos.length, '| in movimento', moved.length,
    '| attività', JSON.stringify(npcAfter.acts));
  await page.screenshot({ path: shot('5-npc') });

  /* --- 7. lupo: insegue, morde, viene abbattuto --- */
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 20; g.player.z = 0;
    g.grid.update(g.player); g.cam.snapTo(20, 0);
    g.spawner.timer = 0;
  });
  await page.waitForTimeout(600);
  const spawned = await page.evaluate(() => {
    const g = window.game;
    // forza uno spawn ravvicinato per il test
    const W = g.spawner.enemies;
    return { count: W.length };
  });
  await page.evaluate(() => {
    const g = window.game;
    const { WolfEntity } = window.__wolfMod || {};
    // usa la stessa classe già presente nel mondo
    const w = g.world.buildings.hut.constructor;
    void w; void WolfEntity;
    // crea un lupo tramite lo spawner, vicino al giocatore
    g.spawner.timer = 0;
    g.spawner._findSpot = () => [g.player.x + 3, g.player.z + 1];
  });
  await page.waitForTimeout(1200);
  const wolfInfo = await page.evaluate(() => {
    const g = window.game;
    const w = g.spawner.enemies[0];
    return w ? { state: w.state, hp: w.hp, anim: w.anim, d: +Math.hypot(w.x - g.player.x, w.z - g.player.z).toFixed(2) } : null;
  });
  console.log('LUPO APPARSO:', JSON.stringify(wolfInfo));
  await page.screenshot({ path: shot('6-wolf') });

  await page.waitForTimeout(6000);
  const fight = await page.evaluate(() => {
    const g = window.game;
    const w = g.spawner.enemies[0];
    return {
      playerHp: Math.round(g.player.hp),
      wolfHp: w ? Math.round(w.hp) : 'morto',
      killed: g.stats.wolvesKilled,
      coins: g.stats.coins,
      playerAnim: g.player.anim,
    };
  });
  console.log('COMBATTIMENTO:', JSON.stringify(fight));
  await page.screenshot({ path: shot('7-fight') });

  /* --- 8. salvataggio e ricarica --- */
  await page.evaluate(() => window.game.save());
  const before = await page.evaluate(() => ({
    lvl: window.game.village.level, coins: window.game.stats.coins,
    pick: window.game.stats.hasPick,
  }));
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 40000 });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    lvl: window.game.village.level, coins: window.game.stats.coins,
    pick: window.game.stats.hasPick, npcs: window.game.village.population,
    sawmill: window.game.world.buildings.sawmill.state,
  }));
  console.log('SALVATAGGIO prima:', JSON.stringify(before), '→ dopo:', JSON.stringify(after));
  await page.screenshot({ path: shot('8-reload') });

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 12).join('\n') : 'Nessun errore.');
  await browser.close();
})();
