/**
 * npc-crowd-test.cjs — Verifica che il villaggio non sembri più affollato
 * del dovuto: chi si siede ci resta (non tutti sono sempre "per strada"),
 * e due abitanti non occupano mai la stessa panchina insieme.
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
    const order = ['hut', 'sawmill', 'quarry', 'house', 'warehouse', 'guardTower',
      'bridge', 'mill', 'smithy', 'townhall', 'shops', 'park', 'bank', 'hospital'];
    for (const id of order) {
      const b = g.world.buildings[id];
      if (!b) continue;
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(3000);

  const pop = await page.evaluate(() => window.game.village.population);
  console.log('POPOLAZIONE:', pop, pop <= 40 ? '✓ entro il nuovo tetto' : '✗');

  // lascia scorrere il tempo, poi controlla la distribuzione delle attività
  await page.waitForTimeout(20000);
  const snap = await page.evaluate(() => {
    const g = window.game;
    const ACT = { GO: 0, WORK: 1, SIT: 2, CHAT: 3, IDLE: 4 };
    const counts = { GO: 0, WORK: 0, SIT: 0, CHAT: 0, IDLE: 0 };
    for (const n of g.village.npcs) counts[Object.keys(ACT).find((k) => ACT[k] === n.act)]++;

    // due abitanti sulla stessa panchina, nello stesso istante?
    const sitSpots = g.village.pointsOfInterest.filter((p) => p.kind === 'sit');
    const occupants = {};
    for (const n of g.village.npcs) {
      if (n.act !== ACT.SIT || !n.target) continue;
      const key = `${n.target.x},${n.target.z}`;
      occupants[key] = (occupants[key] ?? 0) + 1;
    }
    const overlaps = Object.values(occupants).filter((c) => c > 1).length;

    return { counts, totalSitSpots: sitSpots.length, overlaps, seatedNow: counts.SIT };
  });
  console.log('DISTRIBUZIONE ATTIVITÀ DOPO 20s:', JSON.stringify(snap));
  console.log('NESSUNA PANCHINA CONDIVISA:', snap.overlaps === 0 ? '✓' : `✗ (${snap.overlaps} sovrapposizioni)`);
  console.log('QUALCUNO È SEDUTO:', snap.seatedNow > 0 ? '✓' : '✗ nessuno seduto dopo 20s');
  console.log('NON TUTTI IN GIRO (GO):', snap.counts.GO < pop ? '✓' : '✗ tutti ancora per strada');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
