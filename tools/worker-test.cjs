/**
 * worker-test.cjs — Verifica dell'automazione: assunzione operai, lavoro
 * autonomo, consegna ai cantieri e persistenza nel salvataggio.
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/wk-${n}.png`;

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

  /* --- costruisce capanna + segheria + cava --- */
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(2000);
    for (const id of ['hut', 'sawmill', 'quarry']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);

  const stations = await page.evaluate(() => {
    const g = window.game;
    return Object.keys(g.workers.stations).map((id) => {
      const s = g.workers.stations[id];
      return { id, x: +s.x.toFixed(1), z: +s.z.toFixed(1), cost: s.cost, count: s.count };
    });
  });
  console.log('CARTELLI:', JSON.stringify(stations));

  /* --- assumi un boscaiolo stando fermo lì --- */
  const lumberStation = stations.find((s) => s.id === 'lumberjack');
  await page.evaluate(([x, z]) => {
    const g = window.game;
    g.player.x = x; g.player.z = z;
    g.grid.update(g.player); g.cam.snapTo(x, z);
  }, [lumberStation.x, lumberStation.z]);
  await page.waitForTimeout(1500);

  const afterHire = await page.evaluate(() => {
    const g = window.game;
    return {
      coins: g.stats.coins,
      count: g.workers.counts.lumberjack ?? 0,
      workerEntities: g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity').length,
    };
  });
  console.log('DOPO ASSUNZIONE BOSCAIOLO:', JSON.stringify(afterHire));
  await page.screenshot({ path: shot('1-assunto') });

  /* --- assumi anche un minatore --- */
  const minerStation = stations.find((s) => s.id === 'miner');
  await page.evaluate(([x, z]) => {
    const g = window.game;
    g.player.x = x; g.player.z = z;
    g.grid.update(g.player); g.cam.snapTo(x, z);
  }, [minerStation.x, minerStation.z]);
  await page.waitForTimeout(1500);
  console.log('DOPO ASSUNZIONE MINATORE:', JSON.stringify(await page.evaluate(() => ({
    coins: window.game.stats.coins,
    count: window.game.workers.counts.miner ?? 0,
  }))));

  /* --- si allontana e lascia lavorare gli operai --- */
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 30; g.player.z = 30;
    g.grid.update(g.player); g.cam.snapTo(30, 30);
  });

  const before = await page.evaluate(() => ({
    hutPaid: window.game.world.buildings.hut.paid,
    coins: window.game.stats.coins,
    treesChopped: window.game.world.dynamic.filter((e) =>
      e.constructor.name === 'TreeEntity' && e.state !== 0).length,
  }));
  console.log('PRIMA DI ASPETTARE:', JSON.stringify(before));

  // capanna già completa: quindi tutto ciò che gli operai raccolgono, in
  // assenza di altri cantieri aperti con quel tipo di risorsa, deve
  // trasformarsi in monete da solo
  await page.waitForTimeout(14000);

  const after = await page.evaluate(() => {
    const g = window.game;
    const workers = g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity');
    return {
      coins: g.stats.coins,
      states: workers.map((w) => w.state),
      carrying: workers.map((w) => w.carrying),
      npcCrash: false,
    };
  });
  console.log('DOPO 14s DI LAVORO AUTONOMO:', JSON.stringify(after));
  console.log('MONETE SALITE:', after.coins > before.coins ? '✓' : '✗ (nessun guadagno passivo)');

  await page.evaluate(() => {
    const g = window.game;
    const s = g.workers.stations.lumberjack;
    g.player.x = s.x; g.player.z = s.z;
    g.grid.update(g.player); g.cam.snapTo(s.x, s.z);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: shot('2-operai-al-lavoro') });

  /* --- un cantiere aperto: gli operai devono aiutarlo a costruirsi --- */
  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.house;
    b.available = true; b.unlocked = true;
  });
  const houseBefore = await page.evaluate(() => ({ ...window.game.world.buildings.house.paid }));
  await page.waitForTimeout(16000);
  const houseAfter = await page.evaluate(() => ({ ...window.game.world.buildings.house.paid }));
  console.log('CASA — prima:', JSON.stringify(houseBefore), '→ dopo:', JSON.stringify(houseAfter),
    (houseAfter.wood > houseBefore.wood || houseAfter.stone > houseBefore.stone) ? '✓ aiutata' : '✗ ferma');

  /* --- salvataggio e ricarica: gli operai devono ripresentarsi --- */
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(2500);
  console.log('DOPO RICARICA:', JSON.stringify(await page.evaluate(() => {
    const g = window.game;
    return {
      counts: g.workers.counts,
      cartelli: Object.keys(g.workers.stations),
      operaiNelMondo: g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity').length,
    };
  })));

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
