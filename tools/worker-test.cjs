/**
 * worker-test.cjs — Verifica dell'automazione: assunzione operai, lavoro
 * autonomo, ACCUMULO al cartello (non più consegna diretta), ritiro da
 * parte del giocatore e persistenza nel salvataggio.
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
      return { id, x: +s.x.toFixed(1), z: +s.z.toFixed(1), cost: s.cost, count: s.count, cap: s.def.stockCap };
    });
  });
  console.log('CARTELLI:', JSON.stringify(stations));

  /* --- assumi UN boscaiolo (un solo ciclo di carica, senza restare lì) --- */
  const lumberStation = stations.find((s) => s.id === 'lumberjack');
  await page.evaluate(([x, z]) => {
    const g = window.game;
    g.player.x = x; g.player.z = z;
    g.grid.update(g.player); g.cam.snapTo(x, z);
  }, [lumberStation.x, lumberStation.z]);
  await page.waitForTimeout(700);
  // si allontana subito per non assumerne un secondo per sbaglio
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 30; g.player.z = 30;
    g.grid.update(g.player); g.cam.snapTo(30, 30);
  });

  const afterHire = await page.evaluate(() => ({
    coins: window.game.stats.coins,
    count: window.game.workers.counts.lumberjack ?? 0,
    workerEntities: window.game.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity').length,
  }));
  console.log('DOPO ASSUNZIONE (1 boscaiolo):', JSON.stringify(afterHire),
    afterHire.count === 1 ? '✓' : '✗ atteso esattamente 1');

  /* --- lascia lavorare l'operaio: deve ACCUMULARE al cartello, non vendere --- */
  const coinsBefore = await page.evaluate(() => window.game.stats.coins);
  await page.waitForTimeout(12000);

  const stockInfo = await page.evaluate(() => {
    const g = window.game;
    const s = g.workers.stations.lumberjack;
    return { stock: s.stock, coins: g.stats.coins, playerCarry: g.carry.total };
  });
  console.log('DOPO 12s DI LAVORO (a distanza):', JSON.stringify(stockInfo));
  console.log('SCORTA ACCUMULATA (non venduta):', stockInfo.stock > 0 ? '✓' : '✗',
    '| MONETE FERME (nessuna vendita automatica):', stockInfo.coins === coinsBefore ? '✓' : '✗');

  await page.evaluate(([x, z]) => {
    const g = window.game;
    g.player.x = x - 2; g.player.z = z;
    g.grid.update(g.player); g.cam.snapTo(x - 2, z);
  }, [lumberStation.x, lumberStation.z]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('1-magazzino-pieno-di-legno') });

  /* --- il giocatore entra nella zona: il legno deve travasarsi nello zaino --- */
  await page.evaluate(([x, z]) => {
    const g = window.game;
    g.player.x = x; g.player.z = z;
    g.grid.update(g.player); g.cam.snapTo(x, z);
  }, [lumberStation.x, lumberStation.z]);
  await page.waitForTimeout(2500);

  const afterCollect = await page.evaluate(() => {
    const g = window.game;
    const s = g.workers.stations.lumberjack;
    return { stockRimasto: s.stock, zainoLegno: g.carry.count('wood'), zainoTotale: g.carry.total };
  });
  console.log('DOPO IL RITIRO:', JSON.stringify(afterCollect),
    afterCollect.zainoLegno > 0 && afterCollect.stockRimasto < stockInfo.stock ? '✓ travasato' : '✗');
  await page.screenshot({ path: shot('2-ritirato') });

  /* --- il magazzino pieno deve far aspettare l'operaio, non buttare via nulla --- */
  await page.evaluate(([x, z]) => {
    const g = window.game;
    const s = g.workers.stations.lumberjack;
    s.stock = s.def.stockCap;   // magazzino pieno
    g.player.x = 40; g.player.z = 40;   // il giocatore è lontano
    g.grid.update(g.player); g.cam.snapTo(40, 40);
  }, [lumberStation.x, lumberStation.z]);
  await page.waitForTimeout(9000);
  const fullState = await page.evaluate(() => {
    const g = window.game;
    const s = g.workers.stations.lumberjack;
    const workers = g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity');
    return {
      stock: s.stock, cap: s.def.stockCap,
      operaiInAttesa: workers.filter((w) => w.state === 3 && w.carrying).length,
    };
  });
  console.log('MAGAZZINO PIENO — operaio aspetta invece di sprecare:', JSON.stringify(fullState),
    fullState.stock === fullState.cap ? '✓ non ha superato il limite' : '✗');

  /* --- salvataggio e ricarica: la scorta deve sopravvivere --- */
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(2000);
  console.log('DOPO RICARICA:', JSON.stringify(await page.evaluate(() => {
    const g = window.game;
    return {
      counts: g.workers.counts,
      scorte: Object.fromEntries(Object.entries(g.workers.stations).map(([id, s]) => [id, s.stock])),
      operaiNelMondo: g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity').length,
    };
  })));

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
