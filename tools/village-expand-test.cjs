/**
 * village-expand-test.cjs — Verifica di tre correzioni collegate al
 * "villaggio troppo affollato":
 *  1. il mercante e il banco dell'artigiano non sono più a un passo da un
 *     cancello (non si vende/spende più per sbaglio solo uscendo);
 *  2. il recinto, quando compare (o si allarga), non si porta dietro
 *     alberi o vegetazione spontanea al suo interno;
 *  3. si può allargare il recinto a pagamento dal negozio, e la scorta
 *     sopravvive al salvataggio.
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

  // 1. distanza mercante/banco dai cancelli, prima ancora che il recinto esista
  const spots = await page.evaluate(() => {
    const g = window.game;
    const H = 8.6; // semilato base, il recinto non c'è ancora a questo punto
    const gates = [[0, -H], [0, H], [-H, 0], [H, 0]];
    const distMin = (p) => Math.min(...gates.map(([gx, gz]) => Math.hypot(p.x - gx, p.z - gz)));
    return {
      merchant: { ...g.world.merchantSpot, distMin: distMin(g.world.merchantSpot) },
      bench: { ...g.world.benchSpot, distMin: distMin(g.world.benchSpot) },
    };
  });
  console.log('DISTANZA MINIMA DA UN CANCELLO:', JSON.stringify(spots),
    spots.merchant.distMin > 5 && spots.bench.distMin > 5 ? '✓ lontani da ogni varco' : '✗');

  // 2. costruisci fino al recinto, verifica nessun albero/vegetazione dentro
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(400000);
    for (const id of ['hut', 'sawmill', 'quarry', 'house']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);

  const insideCheck = await page.evaluate(() => {
    const g = window.game;
    const H = g.village.fenceHalfExtent;
    const out = [];
    g.grid.queryRect(-H, -H, H, H, out);
    const stray = out.filter((e) => {
      const cls = e.constructor.name;
      return (cls === 'TreeEntity' || cls === 'RockEntity' || e.natural === true) && !e.dead;
    });
    return { H, totale: out.length, estranei: stray.length, esempio: stray.slice(0, 3).map((e) => e.constructor.name) };
  });
  console.log('DENTRO IL RECINTO APPENA COSTRUITO:', JSON.stringify(insideCheck),
    insideCheck.estranei === 0 ? '✓ nessun albero/vegetazione spontanea' : '✗');

  // 3. allarga il villaggio dal negozio
  const before = await page.evaluate(() => ({
    H: window.game.village.fenceHalfExtent,
    coins: window.game.stats.coins,
    cost: window.game.village.expansionCost,
  }));
  console.log('PRIMA DELL\'ALLARGAMENTO:', JSON.stringify(before));

  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const rowsBefore = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title')).map((e) => e.textContent));
  console.log('VOCE ALLARGA NEL NEGOZIO:', rowsBefore.find((t) => t.includes('Allarga')));

  const clicked = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.shop-item'));
    const row = rows.find((r) => r.querySelector('.shop-item-title')?.textContent.includes('Allarga'));
    const btn = row?.querySelector('.shop-buy');
    if (!btn) return false;
    btn.click();
    return true;
  });
  await page.waitForTimeout(600);
  await page.click('#shop-close');

  const after = await page.evaluate(() => ({
    H: window.game.village.fenceHalfExtent,
    coins: window.game.stats.coins,
    expansions: window.game.village.expansions,
  }));
  console.log('CLICK SU "ALLARGA":', clicked, 'DOPO:', JSON.stringify(after),
    after.H === before.H + 3 && after.coins === before.coins - before.cost && after.expansions === 1
      ? '✓ recinto allargato, monete spese' : '✗');

  // di nuovo: niente alberi/vegetazione anche nell'area appena inglobata
  const insideCheck2 = await page.evaluate(() => {
    const g = window.game;
    const H = g.village.fenceHalfExtent;
    const out = [];
    g.grid.queryRect(-H, -H, H, H, out);
    const stray = out.filter((e) => {
      const cls = e.constructor.name;
      return (cls === 'TreeEntity' || cls === 'RockEntity' || e.natural === true) && !e.dead;
    });
    return { H, estranei: stray.length };
  });
  console.log('DENTRO AL RECINTO DOPO L\'ALLARGAMENTO:', JSON.stringify(insideCheck2),
    insideCheck2.estranei === 0 ? '✓' : '✗');

  // salva e ricarica: l'allargamento deve sopravvivere
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(() => ({
    H: window.game.village.fenceHalfExtent,
    expansions: window.game.village.expansions,
  }));
  console.log('DOPO RICARICA:', JSON.stringify(reloaded),
    reloaded.expansions === 1 && reloaded.H === after.H ? '✓ persistito' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
