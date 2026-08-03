/**
 * phase4-test.cjs — Verifica della Fase 4: oro, municipio, botteghe, parco
 * con fontana, banca, ospedale, asfalto e smontaggio della staccionata.
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/f4-${n}.png`;

const ALL = ['hut', 'sawmill', 'quarry', 'house', 'warehouse',
  'bridge', 'mill', 'smithy'];

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
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 90000 });
  console.log('Caricamento:', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await page.waitForTimeout(700);

  const boot = await page.evaluate(() => {
    const g = window.game;
    const out = []; g.world.grid.queryRect(-50, -50, 50, 50, out);
    const rocks = out.filter((e) => e.constructor.name === 'RockEntity');
    const gold = rocks.filter((r) => r.resource === 'gold');
    return {
      jets: g.assets.fountainJets?.length ?? 0,
      goldVeins: gold.length,
      tuttoOltreFiume: gold.every((r) => g.world.river.isBeyond(r.x, r.z)),
      cantieri: Object.keys(g.world.buildings).length,
      arrediCitta: ['cityLamp', 'cityBench', 'statue', 'flowerBed', 'hedge', 'bin']
        .filter((k) => g.assets.village[k]).length,
      upgrades: g.world.workbench.constructor.name,
    };
  });
  console.log('AVVIO:', JSON.stringify(boot));

  /* --- 1. l'oro richiede il piccone da minatore --- */
  await page.evaluate(() => {
    const g = window.game;
    g.stats.hasPick = true; g.stats.pickLevel = 2; g.recomputeStats();
    const out = []; g.world.grid.queryRect(-50, -50, 50, 50, out);
    const vein = out.filter((e) => e.constructor.name === 'RockEntity' && e.resource === 'gold')[0];
    window.__gold = vein;
    g.player.x = vein.x + 1.0; g.player.z = vein.z + 1.0;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(2500);
  const noPick3 = await page.evaluate(() => ({
    hp: window.__gold.hp, anim: window.game.player.anim,
  }));
  console.log('ORO SENZA PICCONE 3:', JSON.stringify(noPick3));
  await page.screenshot({ path: shot('1-oro-bloccato') });

  await page.evaluate(() => { window.game.stats.pickLevel = 3; window.game.recomputeStats(); });
  await page.waitForTimeout(7000);
  const gold = await page.evaluate(() => ({
    hp: window.__gold.hp, oro: window.game.carry.count('gold'),
    estratto: window.game.stats.goldMined,
  }));
  console.log('ORO ESTRATTO:', JSON.stringify(gold));
  await page.screenshot({ path: shot('2-oro') });

  /* --- 2. costruiamo tutto fino alla città --- */
  await page.evaluate((all) => {
    const g = window.game;
    g.stats.axeLevel = 4; g.stats.bagLevel = 5; g.stats.armorLevel = 3;
    g.recomputeStats();
    g.addCoins(20000);
    for (const id of all) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  }, ALL);
  await page.waitForTimeout(2500);

  const fenceBefore = await page.evaluate(() => window.game.village.fenceProps.length);

  // municipio: qui cadono staccionata e sterrato
  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.townhall;
    b.available = true; b.unlocked = true;
    for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
    b._startRising(g); b.riseT = 1; b._finish(g);
  });
  await page.waitForTimeout(2500);
  const city = await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, fase: g.village.stageName,
      staccionataRimasta: g.village.fenceProps.length,
      strisce: g.world.terrain.stripes.length,
      shopsAvailable: g.world.buildings.shops.available,
    };
  });
  console.log('MUNICIPIO — staccionata prima:', fenceBefore, '→', JSON.stringify(city));
  await page.screenshot({ path: shot('3-municipio') });

  /* --- 3. resto della città --- */
  await page.evaluate(() => {
    const g = window.game;
    for (const id of ['shops', 'park', 'bank', 'hospital']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(4000);
  const done = await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, fase: g.village.stageName,
      abitanti: g.village.population,
      sellBonus: +g.stats.sellBonus.toFixed(2),
      rendita: g.stats.income, cure: g.stats.regenMul,
      poi: g.village.pointsOfInterest.length,
    };
  });
  console.log('CITTÀ COMPLETA:', JSON.stringify(done));

  /* --- 4. la rendita della banca arriva davvero --- */
  const coinsA = await page.evaluate(() => window.game.stats.coins);
  await page.waitForTimeout(7000);
  const coinsB = await page.evaluate(() => window.game.stats.coins);
  console.log('RENDITA BANCA:', coinsA, '→', coinsB, coinsB > coinsA ? '✓' : '✗');

  /* --- 5. viste --- */
  const views = [
    ['4-piazza', 0, 2],
    ['5-municipio', 0, 18],
    ['6-parco', 13.6, 12],
    ['7-botteghe', -13.6, 6.4],
    ['8-banca', -8.2, 18.4],
    ['9-ospedale', 10.2, 18.4],
  ];
  for (const [name, x, z] of views) {
    await page.evaluate(([px, pz]) => {
      const g = window.game;
      g.player.x = px; g.player.z = pz;
      g.grid.update(g.player); g.cam.snapTo(px, pz);
    }, [x, z]);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: shot(name) });
  }

  /* --- 6. salvataggio --- */
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, abitanti: g.village.population,
      rendita: g.stats.income, strisce: g.world.terrain.stripes.length,
      staccionata: g.village.fenceProps.length,
      ospedale: g.world.buildings.hospital.state,
    };
  });
  console.log('DOPO RICARICA:', JSON.stringify(after));

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)),
    '| qualità:', await page.evaluate(() => window.game.quality.scale));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
