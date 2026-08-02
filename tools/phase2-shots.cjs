/**
 * phase2-shots.cjs — Porta la partita a villaggio avanzato e cattura le
 * schermate di controllo (staccionata, abitanti, edifici, lupo).
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 40000 });
  await page.waitForTimeout(700);

  // Completa tutti i cantieri, uno dopo l'altro.
  await page.evaluate(async () => {
    const g = window.game;
    g.stats.hasPick = true; g.stats.pickLevel = 2;
    g.stats.axeLevel = 3; g.stats.bagLevel = 3; g.stats.armorLevel = 2;
    g.recomputeStats();
    g.addCoins(2000);
    g.rebakeCharacter();

    const ids = ['hut', 'sawmill', 'quarry', 'house', 'warehouse'];
    for (const id of ids) {
      const b = g.world.buildings[id];
      b.available = true;
      b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g);
      b.riseT = 1;
      b._finish(g);
    }
  });
  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => ({
    level: window.game.village.level,
    stage: window.game.village.stageName,
    npcs: window.game.village.population,
    poi: window.game.village.pointsOfInterest.length,
  }));
  console.log('VILLAGGIO FINALE:', JSON.stringify(state));

  // Vista dall'alto della piazza
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 0; g.player.z = 2;
    g.grid.update(g.player); g.cam.snapTo(0, 2);
  });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '/tmp/f2-piazza.png' });

  // La staccionata perimetrale
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 6.1; g.player.z = 6.1;
    g.grid.update(g.player); g.cam.snapTo(6.1, 6.1);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/f2-recinto.png' });

  // La segheria
  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.sawmill;
    g.player.x = b.x + 0.5; g.player.z = b.z + 2.6;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/f2-segheria.png' });

  // La cava
  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.quarry;
    g.player.x = b.x + 0.4; g.player.z = b.z + 2.6;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/f2-cava.png' });

  // Un lupo addosso, nel bosco
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 22; g.player.z = 2;
    g.grid.update(g.player); g.cam.snapTo(22, 2);
    g.spawner._findSpot = () => [g.player.x + 2.5, g.player.z + 1.5];
    g.spawner.timer = 0;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/f2-lupo.png' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/f2-lupo2.png' });

  const fight = await page.evaluate(() => {
    const g = window.game;
    const w = g.spawner.enemies[0];
    return w ? { state: w.state, hp: Math.round(w.hp), anim: w.anim } : 'nessun lupo';
  });
  console.log('LUPO:', JSON.stringify(fight));
  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI: ' + errs.join(' | ') : 'nessun errore');
  await browser.close();
})();
