/**
 * tower-test.cjs — Verifica della torretta di guardia: si costruisce come
 * ogni altro cantiere, ma una volta finita NON si spegne — continua a
 * colpire da sola lupi e orsi che entrano nel suo raggio, senza che il
 * giocatore debba fare nulla.
 */
const { chromium } = require('playwright');
const shot = (n) => `/tmp/tower-${n}.png`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });

  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(2000);
    for (const id of ['hut', 'sawmill', 'quarry', 'house', 'guardTower']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);

  const towerInfo = await page.evaluate(() => {
    const g = window.game;
    const t = g.world.buildings.guardTower;
    return {
      x: t.x, z: t.z, state: t.state,
      inDynamic: g.world.dynamic.includes(t),
      className: t.constructor.name,
    };
  });
  console.log('TORRETTA:', JSON.stringify(towerInfo));

  // il giocatore resta lontanissimo: la torretta deve difendersi da sola
  const beforeCoins = await page.evaluate(() => window.game.stats.coins);
  const spawned = await page.evaluate(async ([tx, tz]) => {
    const g = window.game;
    const mod = await import('/src/entities/WolfEntity.js');
    g.player.x = 100; g.player.z = 100;
    g.grid.update(g.player);
    const wolf = new mod.WolfEntity(tx + 3, tz, g);
    wolf.state = 1; // CHASE diretto, salta la fase "vaga"
    g.world.add(wolf, true);
    g.spawner.enemies.push(wolf);
    window.__testWolf = wolf;
    return { hp: wolf.hp };
  }, [towerInfo.x, towerInfo.z]);
  console.log('LUPO PIAZZATO NEL RAGGIO DELLA TORRETTA (giocatore lontanissimo):', JSON.stringify(spawned));

  await page.waitForTimeout(600);
  await page.evaluate(([x, z]) => {
    const g = window.game;
    g.cam.zoom = 1; g.cam.zoomTarget = 1;
    g.cam.snapTo(x, z);
  }, [towerInfo.x, towerInfo.z]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('1-torretta-e-lupo') });

  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => {
    const g = window.game;
    const wolf = window.__testWolf;
    return {
      wolfHp: wolf.hp, wolfDead: wolf.dead, wolfState: wolf.state,
      playerHp: g.player.hp, coins: g.stats.coins,
    };
  });
  console.log('DOPO 4s SENZA GIOCATORE VICINO:', JSON.stringify(after),
    (after.wolfHp < spawned.hp || after.wolfDead) ? '✓ la torretta ha colpito da sola' : '✗');
  console.log('MONETE:', beforeCoins, '→', after.coins,
    after.wolfDead && after.coins === beforeCoins + 4 ? '✓ ricompensa del lupo abbattuto dalla torretta' : '');
  await page.screenshot({ path: shot('2-dopo-colpi') });

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
