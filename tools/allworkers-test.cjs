/**
 * allworkers-test.cjs — Verifica che ogni materiale abbia il suo operaio:
 * boscaiolo (legno), minatore (pietra), minatore di ferro e cercatore
 * d'oro, tutti gestiti dalla stessa WorkerSystem generica, e tutti e
 * quattro comprabili/potenziabili dal negozio.
 */
const { chromium } = require('playwright');

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

  // porta il villaggio fino ad avere fucina e banca (livello alto)
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(500000);
    const order = ['hut', 'sawmill', 'quarry', 'house', 'warehouse', 'guardTower',
      'bridge', 'mill', 'smithy', 'townhall', 'shops', 'park', 'bank'];
    for (const id of order) {
      const b = g.world.buildings[id];
      if (!b) continue;
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(2500);

  const stations = await page.evaluate(() => {
    const g = window.game;
    return Object.keys(g.workers.stations).map((id) => {
      const s = g.workers.stations[id];
      return { id, resource: s.def.resource, x: +s.x.toFixed(1), z: +s.z.toFixed(1) };
    });
  });
  console.log('CARTELLI:', JSON.stringify(stations));
  const ids = stations.map((s) => s.id).sort();
  console.log('TUTTI E QUATTRO PRESENTI:',
    JSON.stringify(ids) === JSON.stringify(['goldminer', 'ironminer', 'lumberjack', 'miner']) ? '✓' : '✗');

  // assumi un minatore di ferro e uno cercatore d'oro, verifica che lavorino
  const hired = await page.evaluate(async () => {
    const g = window.game;
    const results = {};
    for (const id of ['ironminer', 'goldminer']) {
      const st = g.workers.stations[id];
      g.player.x = st.x; g.player.z = st.z;
      g.grid.update(g.player);
      // carica abbastanza per superare la carica di assunzione
      for (let i = 0; i < 40 && g.workers.counts[id] === undefined; i++) {
        st.update(0.1, g);
      }
      results[id] = { count: g.workers.counts[id] ?? 0 };
    }
    return results;
  });
  console.log('ASSUNTI:', JSON.stringify(hired));

  // il giocatore si allontana: gli operai devono lavorare da soli, non
  // restare "aiutati" (o intralciati) da lui parcheggiato sulla vena
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 200; g.player.z = 200;
    g.grid.update(g.player);
  });
  await page.waitForTimeout(28000);
  const worked = await page.evaluate(() => {
    const g = window.game;
    const iw = g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity'
      && e.def.id === 'ironminer');
    const gw = g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity'
      && e.def.id === 'goldminer');
    return {
      ironStock: g.workers.stations.ironminer.stock,
      goldStock: g.workers.stations.goldminer.stock,
      ironWorkerState: iw[0]?.state, ironWorkerPos: iw[0] && [+iw[0].x.toFixed(1), +iw[0].z.toFixed(1)],
      goldWorkerState: gw[0]?.state, goldWorkerPos: gw[0] && [+gw[0].x.toFixed(1), +gw[0].z.toFixed(1)],
    };
  });
  console.log('DOPO 28s DI LAVORO:', JSON.stringify(worked),
    worked.ironStock > 0 && worked.goldStock > 0 ? '✓ entrambi hanno accumulato scorta' : '✗');

  // negozio: tutte e quattro le coppie di leve devono comparire
  await page.evaluate(() => { window.game.player.x = 100; window.game.player.z = 100; window.game.grid.update(window.game.player); });
  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const shopTitles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title')).map((e) => e.textContent));
  console.log('NEGOZIO:', JSON.stringify(shopTitles));
  const hasAllFour = ['boscaiolo', 'minatore', 'ferro', "oro"].every((word) =>
    shopTitles.some((t) => t.toLowerCase().includes(word)));
  console.log('TUTTE E QUATTRO LE CATEGORIE NEL NEGOZIO:', hasAllFour ? '✓' : '✗');

  // controlla che le descrizioni vadano a capo, non taglino con i puntini
  const desc = await page.evaluate(() => {
    const el = document.querySelector('.shop-item-desc');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { whiteSpace: cs.whiteSpace, textOverflow: cs.textOverflow };
  });
  console.log('STILE DESCRIZIONE NEGOZIO:', JSON.stringify(desc),
    desc && desc.whiteSpace === 'normal' ? '✓ va a capo, niente ellissi' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
