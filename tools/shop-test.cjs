/**
 * shop-test.cjs — Verifica del negozio in HUD: si apre da qualunque punto
 * della mappa, mostra il prossimo potenziamento del personaggio e i
 * potenziamenti degli operai (resa/magazzino), e comprare aggiorna
 * davvero lo stato di gioco (non solo il pannello).
 */
const { chromium } = require('playwright');
const shot = (n) => `/tmp/shop-${n}.png`;

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
    g.addCoins(5000);
    for (const id of ['hut', 'sawmill', 'quarry']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
    // il giocatore resta lontanissimo da banco e cartelli: il negozio
    // deve funzionare comunque, da qualunque punto della mappa
    g.player.x = 100; g.player.z = 100;
    g.grid.update(g.player);
  });
  await page.waitForTimeout(1200);

  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const rowsBefore = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title')).map((e) => e.textContent));
  console.log('VOCI NEL NEGOZIO:', JSON.stringify(rowsBefore));
  await page.screenshot({ path: shot('1-aperto') });

  const before = await page.evaluate(() => ({
    coins: window.game.stats.coins,
    yieldLumber: window.game.workers.harvestYield('lumberjack'),
    capLumber: window.game.workers.stockCap('lumberjack'),
    bagLevel: window.game.stats.bagLevel,
  }));
  console.log('PRIMA:', JSON.stringify(before));

  // compra il primo potenziamento del personaggio (in cima alla lista)
  await page.click('.shop-buy');
  await page.waitForTimeout(300);

  const afterFirst = await page.evaluate(() => ({
    coins: window.game.stats.coins,
    axeLevel: window.game.stats.axeLevel,
  }));
  console.log('DOPO ACQUISTO PERSONAGGIO:', JSON.stringify(afterFirst),
    afterFirst.coins < before.coins && afterFirst.axeLevel === 2 ? '✓' : '✗');

  // ora compra un potenziamento dell'operaio: trova la riga "Resa del boscaiolo"
  const bought = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.shop-item'));
    const row = rows.find((r) => r.querySelector('.shop-item-title')?.textContent === 'Resa del boscaiolo');
    const btn = row?.querySelector('.shop-buy');
    if (!btn) return false;
    btn.click();
    return true;
  });
  await page.waitForTimeout(300);
  console.log('CLICK SU "RESA DEL BOSCAIOLO":', bought);

  const after = await page.evaluate(() => ({
    coins: window.game.stats.coins,
    yieldLumber: window.game.workers.harvestYield('lumberjack'),
    capLumber: window.game.workers.stockCap('lumberjack'),
  }));
  console.log('DOPO:', JSON.stringify(after),
    after.yieldLumber > before.yieldLumber && after.coins < afterFirst.coins ? '✓ potenziamento operaio applicato' : '✗');
  await page.screenshot({ path: shot('2-dopo-acquisti') });

  // salva, ricarica, verifica che i livelli sopravvivano
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(() => ({
    yieldLumber: window.game.workers.harvestYield('lumberjack'),
    axeLevel: window.game.stats.axeLevel,
  }));
  console.log('DOPO RICARICA:', JSON.stringify(reloaded),
    reloaded.yieldLumber === after.yieldLumber && reloaded.axeLevel === 2 ? '✓ persistito' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
