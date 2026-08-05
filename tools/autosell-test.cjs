/**
 * autosell-test.cjs — Verifica il "villaggio autosufficiente"
 * (WorkerSystem.resourceStillNeeded/autoSells): un cartello vende da solo
 * una risorsa — gratis, senza nastro — appena nessun cantiere aperto ne ha
 * più bisogno, e torna a farla accumulare a mano se in futuro un cantiere
 * la richiede di nuovo.
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

  // Capanna e segheria (il boscaiolo compare): la cava si sblocca e chiede
  // ancora legno, quindi non è ancora il momento di venderlo da solo.
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(500000);
    for (const id of ['hut', 'sawmill']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(500);

  const early = await page.evaluate(() => window.game.workers.autoSells('lumberjack'));
  console.log('LEGNO ANCORA NECESSARIO (la cava lo richiede):', !early ? '✓' : '✗');

  // assumi un boscaiolo e lascialo accumulare a mano
  const hired = await page.evaluate(() => {
    const g = window.game;
    const st = g.workers.stations.lumberjack;
    g.player.x = st.x; g.player.z = st.z;
    g.grid.update(g.player);
    for (let i = 0; i < 40 && (g.workers.counts.lumberjack ?? 0) === 0; i++) st.update(0.1, g);
    return g.workers.counts.lumberjack ?? 0;
  });
  console.log('BOSCAIOLO ASSUNTO:', hired === 1 ? '✓' : '✗');

  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 200; g.player.z = 200;
    g.grid.update(g.player);
  });
  await page.waitForTimeout(9000);

  const beforeObsolete = await page.evaluate(() => ({
    stock: window.game.workers.stations.lumberjack.stock,
    coins: window.game.stats.coins,
  }));
  console.log('SCORTA ACCUMULATA A MANO (legno ancora utile):', JSON.stringify(beforeObsolete),
    beforeObsolete.stock > 0 ? '✓' : '✗');

  // finisce tutti gli edifici che chiedono ancora legno, fino al parco:
  // dopo, il prossimo cantiere (la banca) non ne ha più bisogno
  const afterBuild = await page.evaluate(() => {
    const g = window.game;
    const order = ['quarry', 'house', 'warehouse', 'guardTower',
      'bridge', 'mill', 'smithy', 'townhall', 'shops', 'park'];
    for (const id of order) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
    return {
      bankAvailable: g.world.buildings.bank.available,
      bankCostsWood: !!g.world.buildings.bank.def.cost.wood,
      autoSells: g.workers.autoSells('lumberjack'),
    };
  });
  console.log('DOPO IL PARCO:', JSON.stringify(afterBuild));
  console.log('IL LEGNO NON SERVE PIÙ (la banca non lo richiede) — SI VENDE DA SOLO:',
    afterBuild.autoSells ? '✓' : '✗');

  // negozio: deve dirlo chiaramente, senza che sia stato comprato nulla
  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const shopHasNotice = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title'))
      .some((e) => e.textContent.includes('Boscaiolo: si vende da solo')));
  console.log('IL NEGOZIO LO SPIEGA (senza bisogno di comprare nulla):', shopHasNotice ? '✓' : '✗');
  await page.click('#shop-close');

  // ora deve svuotarsi da solo, senza ritiro a mano — il raffronto è con le
  // monete di PRIMA della transizione: l'unità già in scorta potrebbe
  // essersi già venduta durante l'apertura del negozio qui sopra (il
  // nastro/l'autovendita è velocissimo), quindi non è un buon "prima".
  await page.waitForTimeout(3000);
  const after = await page.evaluate(() => ({
    stock: window.game.workers.stations.lumberjack.stock,
    coins: window.game.stats.coins,
  }));
  console.log('DOPO QUALCHE SECONDO (giocatore ancora lontanissimo):', JSON.stringify(after));
  console.log('SI È VENDUTA DA SOLA (scorta svuotata, monete salite, nessun ritiro a mano):',
    after.stock === 0 && after.coins > beforeObsolete.coins ? '✓' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
