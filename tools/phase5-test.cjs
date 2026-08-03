/**
 * phase5-test.cjs — Verifica della Fase 5: grattacieli, traffico con semafori,
 * tram su binari, fabbrica, aeroporto e tenuta del salvataggio.
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/f5-${n}.png`;

const UPTO_CITY = ['hut', 'sawmill', 'quarry', 'house', 'warehouse',
  'bridge', 'mill', 'smithy', 'townhall', 'shops', 'park', 'bank', 'hospital'];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });

  const t0 = Date.now();
  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  console.log('Caricamento:', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await page.waitForTimeout(700);

  console.log('AVVIO:', JSON.stringify(await page.evaluate(() => {
    const g = window.game;
    return {
      modelliAuto: g.assets.cars.length,
      dirAuto: g.assets.cars[0]?.length ?? 0,
      dirTram: g.assets.trams.length,
      statiSemaforo: g.assets.lights.length,
      cantieri: Object.keys(g.world.buildings).length,
      grattacieli: ['skyscraperA', 'skyscraperB'].filter((k) => g.assets.buildings[k]).length,
    };
  })));

  /* --- costruzione fino alla città, poi il grattacielo --- */
  await page.evaluate((ids) => {
    const g = window.game;
    g.stats.hasPick = true; g.stats.pickLevel = 3;
    g.stats.axeLevel = 4; g.stats.bagLevel = 5; g.stats.armorLevel = 4;
    g.recomputeStats();
    g.addCoins(60000);
    for (const id of ids) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  }, UPTO_CITY);
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.tower;
    b.available = true; b.unlocked = true;
    for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
    b._startRising(g); b.riseT = 1; b._finish(g);
  });
  await page.waitForTimeout(2500);

  const traffic = await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, fase: g.village.stageName,
      strade: g.traffic.enabled,
      auto: g.traffic.carCount,
      semafori: g.traffic.lightProps.length,
      stationAvailable: g.world.buildings.station.available,
    };
  });
  console.log('GRATTACIELO → TRAFFICO:', JSON.stringify(traffic));

  /* --- le auto si muovono davvero --- */
  const posA = await page.evaluate(() =>
    window.game.traffic.roadPath.vehicles.map((v) => +v.t.toFixed(2)));
  await page.waitForTimeout(2500);
  const posB = await page.evaluate(() => ({
    t: window.game.traffic.roadPath.vehicles.map((v) => +v.t.toFixed(2)),
    speed: window.game.traffic.roadPath.vehicles.map((v) => +v.speed.toFixed(2)),
  }));
  const moved = posB.t.filter((t, i) => Math.abs(t - posA[i]) > 0.5).length;
  console.log('AUTO IN MOVIMENTO:', moved, '/', posA.length, '| velocità:', JSON.stringify(posB.speed));

  /* --- i semafori cambiano --- */
  const l1 = await page.evaluate(() => window.game.traffic.lightProps.map((l) => l.state));
  await page.waitForTimeout(5000);
  const l2 = await page.evaluate(() => window.game.traffic.lightProps.map((l) => l.state));
  console.log('SEMAFORI:', JSON.stringify(l1), '→', JSON.stringify(l2),
    l1.join() !== l2.join() ? '✓ cambiano' : '✗ fermi');

  /* --- le auto frenano per il giocatore --- */
  const brake = await page.evaluate(async () => {
    const g = window.game;
    const v = g.traffic.roadPath.vehicles[0];
    // mettiamo il giocatore giusto davanti all'auto
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    g.player.x = v.x + fx * 2.0; g.player.z = v.z + fz * 2.0;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
    await new Promise((r) => setTimeout(r, 900));
    return { speed: +v.speed.toFixed(2), fermata: v.speed < 1 };
  });
  console.log('FRENATA PER IL GIOCATORE:', JSON.stringify(brake));
  await page.screenshot({ path: shot('1-traffico') });

  /* --- stazione e tram --- */
  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.station;
    b.available = true; b.unlocked = true;
    for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
    b._startRising(g); b.riseT = 1; b._finish(g);
  });
  await page.waitForTimeout(2500);
  const tramA = await page.evaluate(() => ({
    attivo: window.game.traffic.tramEnabled,
    tram: window.game.traffic.tramCount,
    t: window.game.traffic.tramPath.vehicles.map((v) => +v.t.toFixed(2)),
    binari: window.game.world.terrain.stripes.length,
  }));
  await page.waitForTimeout(2500);
  const tramB = await page.evaluate(() =>
    window.game.traffic.tramPath.vehicles.map((v) => +v.t.toFixed(2)));
  console.log('TRAM:', JSON.stringify(tramA), '→ posizioni', JSON.stringify(tramB));

  await page.evaluate(() => {
    const g = window.game;
    const v = g.traffic.tramPath.vehicles[0];
    g.player.x = v.x + 3; g.player.z = v.z + 3;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot('2-tram') });

  /* --- resto della metropoli --- */
  await page.evaluate(() => {
    const g = window.game;
    for (const id of ['tower2', 'factory', 'airport']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(4000);
  console.log('METROPOLI:', JSON.stringify(await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, fase: g.village.stageName,
      abitanti: g.village.population,
      rendita: g.stats.income, sellBonus: +g.stats.sellBonus.toFixed(2),
      logBonus: g.stats.logBonus,
    };
  })));

  const views = [
    ['3-grattacieli', -1.0, -7.0],
    ['4-piazza', 0, 2],
    ['5-fabbrica', -16.4, -5.6],
    ['6-aeroporto', 19.5, 19.0],
    ['7-stazione', 15.6, 1.6],
  ];
  for (const [name, x, z] of views) {
    await page.evaluate(([px, pz]) => {
      const g = window.game;
      g.player.x = px; g.player.z = pz;
      g.grid.update(g.player); g.cam.snapTo(px, pz);
    }, [x, z]);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: shot(name) });
  }

  /* --- salvataggio --- */
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(2000);
  console.log('DOPO RICARICA:', JSON.stringify(await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, abitanti: g.village.population,
      strade: g.traffic.enabled, tram: g.traffic.tramEnabled,
      auto: g.traffic.carCount, aeroporto: g.world.buildings.airport.state,
    };
  })));

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)),
    '| qualità:', await page.evaluate(() => window.game.quality.scale));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
