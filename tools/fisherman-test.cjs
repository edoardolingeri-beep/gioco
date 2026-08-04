/**
 * fisherman-test.cjs — Verifica il pescatore: l'unico operaio "stanziale"
 * (non cerca né cammina, pesca fermo al suo molo vicino al ponte) e la
 * nuova risorsa "pesce" che sblocca.
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

  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(500000);
    const bridge = g.world.buildings.bridge;
    bridge.available = true; bridge.unlocked = true;
    for (const k in bridge.def.cost) bridge.paid[k] = bridge.def.cost[k];
    bridge._startRising(g); bridge.riseT = 1; bridge._finish(g);
  });
  await page.waitForTimeout(500);

  const station = await page.evaluate(() => {
    const g = window.game;
    const st = g.workers.stations.fisherman;
    return st ? { x: st.x, z: st.z, resource: st.def.resource } : null;
  });
  console.log('CARTELLO PESCATORE:', JSON.stringify(station), station?.resource === 'fish' ? '✓' : '✗');

  // assumi tre pescatori
  const hired = await page.evaluate(async () => {
    const g = window.game;
    const st = g.workers.stations.fisherman;
    g.player.x = st.x; g.player.z = st.z;
    g.grid.update(g.player);
    for (let n = 0; n < 3; n++) {
      for (let i = 0; i < 40 && (g.workers.counts.fisherman ?? 0) === n; i++) st.update(0.1, g);
    }
    return g.workers.counts.fisherman ?? 0;
  });
  console.log('PESCATORI ASSUNTI:', hired, hired === 3 ? '✓' : '✗');

  // sono davvero "stanziali": posizione fissa fin da subito, mai in stato
  // SEEK/WALK/RETURN (0, 1, 3) — solo WORK (2)
  const posSamples = await page.evaluate(() => {
    const g = window.game;
    return g.world.dynamic
      .filter((e) => e.constructor.name === 'WorkerEntity' && e.def.id === 'fisherman')
      .map((w) => ({ x: +w.x.toFixed(2), z: +w.z.toFixed(2), state: w.state }));
  });
  console.log('POSIZIONE/STATO APPENA ASSUNTI:', JSON.stringify(posSamples));
  const allWorking = posSamples.length === 3 && posSamples.every((w) => w.state === 2);
  console.log('TUTTI GIÀ AL LAVORO SUL MOLO (stato WORK):', allWorking ? '✓' : '✗');

  // il giocatore si allontana: la scorta deve comunque crescere
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 200; g.player.z = 200;
    g.grid.update(g.player);
  });
  await page.waitForTimeout(18000);

  const after = await page.evaluate(() => {
    const g = window.game;
    const workers = g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity' && e.def.id === 'fisherman');
    return {
      stock: g.workers.stations.fisherman.stock,
      positions: workers.map((w) => [+w.x.toFixed(2), +w.z.toFixed(2)]),
    };
  });
  console.log('DOPO 18s SENZA GIOCATORE VICINO:', JSON.stringify(after));
  console.log('HA ACCUMULATO PESCE:', after.stock > 0 ? '✓' : '✗');
  const stayedPut = after.positions.every((p, i) =>
    Math.abs(p[0] - posSamples[i].x) < 0.05 && Math.abs(p[1] - posSamples[i].z) < 0.05);
  console.log('NON SI È MOSSO DAL MOLO:', stayedPut ? '✓' : '✗');

  // negozio: la voce del pescatore deve esserci
  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const titles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title')).map((e) => e.textContent));
  console.log('PESCATORE NEL NEGOZIO:', titles.some((t) => t.toLowerCase().includes('pescatore')) ? '✓' : '✗');
  await page.click('#shop-close');

  // salva e ricarica
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(() => ({
    count: window.game.workers.counts.fisherman ?? 0,
    stock: window.game.workers.stations.fisherman?.stock ?? 0,
  }));
  console.log('DOPO RICARICA:', JSON.stringify(reloaded), reloaded.count === 3 ? '✓ persistito' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
