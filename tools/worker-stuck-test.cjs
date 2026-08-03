/**
 * worker-stuck-test.cjs — Verifica che boscaioli e minatori non restino
 * "bloccati": con tutti e tre gli operai assunti per tipo, in un lungo
 * arco di tempo simulato ognuno deve completare più di un ciclo di
 * raccolta (non restare fermo/in cerca per sempre).
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
    g.addCoins(50000);
    for (const id of ['hut', 'sawmill', 'quarry']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);

  // assumi 3 boscaioli e 3 minatori (il massimo)
  await page.evaluate(() => {
    const g = window.game;
    for (const id of ['lumberjack', 'miner']) {
      const st = g.workers.stations[id];
      g.player.x = st.x; g.player.z = st.z;
      g.grid.update(g.player);
      for (let n = 0; n < 3; n++) {
        for (let i = 0; i < 30 && g.workers.counts[id] !== n + 1; i++) st.update(0.1, g);
      }
    }
    g.player.x = 200; g.player.z = 200;
    g.grid.update(g.player);
  });
  await page.waitForTimeout(500);
  const hired = await page.evaluate(() => ({
    lumberjack: window.game.workers.counts.lumberjack,
    miner: window.game.workers.counts.miner,
  }));
  console.log('OPERAI ASSUNTI:', JSON.stringify(hired));

  // ogni operaio: quante volte è passato per WORK (=2) da qui in avanti,
  // controllato a intervalli — se uno resta sempre nello stesso stato e
  // nella stessa posizione per tutta la finestra, è "bloccato" davvero
  const SAMPLES = 8, INTERVAL = 4000;
  const history = { lumberjack: [], miner: [] };
  for (let s = 0; s < SAMPLES; s++) {
    await page.waitForTimeout(INTERVAL);
    const snap = await page.evaluate(() => {
      const g = window.game;
      const workers = g.world.dynamic.filter((e) => e.constructor.name === 'WorkerEntity');
      const byType = { lumberjack: [], miner: [] };
      for (const w of workers) {
        if (byType[w.def.id]) byType[w.def.id].push({ x: +w.x.toFixed(2), z: +w.z.toFixed(2), state: w.state });
      }
      return byType;
    });
    history.lumberjack.push(snap.lumberjack);
    history.miner.push(snap.miner);
  }

  // per ogni operaio (indice 0..2), controlla se posizione+stato sono
  // rimasti IDENTICI in ogni singolo campione: se sì, non si è mai mosso
  let stuckCount = 0;
  const stuckDetails = [];
  for (const type of ['lumberjack', 'miner']) {
    for (let idx = 0; idx < 3; idx++) {
      const seq = history[type].map((snap) => snap[idx]).filter(Boolean);
      if (seq.length < SAMPLES - 1) continue; // operaio non ancora tracciato in tutti i campioni
      const allSame = seq.every((s) => s.x === seq[0].x && s.z === seq[0].z && s.state === seq[0].state);
      if (allSame) { stuckCount++; stuckDetails.push({ type, idx, pos: seq[0] }); }
    }
  }
  console.log('STORICO POSIZIONI (ultimi 3 campioni, per operaio):',
    JSON.stringify({
      lumberjack: history.lumberjack.slice(-3),
      miner: history.miner.slice(-3),
    }));
  console.log('OPERAI MAI MOSSI IN', SAMPLES * INTERVAL / 1000, 's:', stuckCount,
    JSON.stringify(stuckDetails), stuckCount === 0 ? '✓ nessuno bloccato' : '✗');

  const stocks = await page.evaluate(() => ({
    lumberjack: window.game.workers.stations.lumberjack.stock,
    miner: window.game.workers.stations.miner.stock,
  }));
  console.log('SCORTA ACCUMULATA IN', SAMPLES * INTERVAL / 1000, 's:', JSON.stringify(stocks),
    stocks.lumberjack > 0 && stocks.miner > 0 ? '✓ entrambi hanno prodotto qualcosa' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
