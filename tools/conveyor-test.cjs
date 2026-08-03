/**
 * conveyor-test.cjs — Verifica del negozio più approfondito (livelli fino
 * a 10, mostrati come "Lv N/10") e del nastro trasportatore: compare solo
 * a resa/magazzino già al massimo, e una volta comprato vende da solo la
 * scorta senza che il giocatore debba passare a ritirarla.
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
    g.addCoins(300000);
    for (const id of ['hut', 'sawmill', 'quarry']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);

  // il nastro non deve comparire prima che resa+magazzino siano al massimo
  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const before = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title')).map((e) => e.textContent));
  console.log('NEGOZIO PRIMA DEI POTENZIAMENTI:', JSON.stringify(before));
  console.log('nastro assente all\'inizio:', !before.some((t) => t.includes('Nastro')) ? '✓' : '✗');
  await page.click('#shop-close');

  // porta resa e magazzino del boscaiolo al livello 10
  const maxed = await page.evaluate(() => {
    const g = window.game;
    for (let i = 0; i < 10; i++) g.workers.buyUpgrade('lumberjack', 'yield', g);
    for (let i = 0; i < 10; i++) g.workers.buyUpgrade('lumberjack', 'capacity', g);
    return {
      yieldLevel: g.workers.level('lumberjack', 'yield'),
      capLevel: g.workers.level('lumberjack', 'capacity'),
      yieldValue: g.workers.harvestYield('lumberjack'),
      capValue: g.workers.stockCap('lumberjack'),
      ready: g.workers.conveyorReady('lumberjack'),
      nextCost: g.workers.upgradeCost('lumberjack', 'yield'),
    };
  });
  console.log('DOPO 10 LIVELLI:', JSON.stringify(maxed),
    maxed.yieldLevel === 10 && maxed.capLevel === 10 && maxed.ready && maxed.nextCost === null ? '✓' : '✗');

  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const afterMax = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item')).map((el) => ({
      title: el.querySelector('.shop-item-title')?.textContent,
      hasMax: !!el.querySelector('.shop-max'),
    })));
  console.log('NEGOZIO A LIVELLO MASSIMO:', JSON.stringify(afterMax));
  const conveyorRow = afterMax.find((r) => r.title?.includes('Nastro'));
  console.log('nastro ora visibile e comprabile:', conveyorRow && !conveyorRow.hasMax ? '✓' : '✗');

  // compra il nastro dal pannello
  const bought = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.shop-item'));
    const row = rows.find((r) => r.querySelector('.shop-item-title')?.textContent.includes('Nastro'));
    const btn = row?.querySelector('.shop-buy');
    if (!btn) return false;
    btn.click();
    return true;
  });
  await page.waitForTimeout(300);
  console.log('NASTRO COMPRATO DAL PANNELLO:', bought,
    await page.evaluate(() => window.game.workers.hasConveyor('lumberjack')) ? '✓' : '✗');
  await page.click('#shop-close');

  // forza un po' di scorta e allontana il giocatore: deve vendersi da sola
  const before2 = await page.evaluate(() => {
    const g = window.game;
    const st = g.workers.stations.lumberjack;
    st.stock = 5;
    g.player.x = 100; g.player.z = 100;
    g.grid.update(g.player);
    return { coins: g.stats.coins, stock: st.stock };
  });
  console.log('PRIMA (giocatore lontanissimo):', JSON.stringify(before2));
  await page.waitForTimeout(6000);
  const after2 = await page.evaluate(() => {
    const g = window.game;
    const st = g.workers.stations.lumberjack;
    return { coins: g.stats.coins, stock: st.stock };
  });
  console.log('DOPO 6s SENZA GIOCATORE VICINO:', JSON.stringify(after2),
    after2.stock < before2.stock && after2.coins > before2.coins ? '✓ si vende da solo' : '✗');

  // salva e ricarica: livelli e nastro devono sopravvivere
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(() => ({
    yieldLevel: window.game.workers.level('lumberjack', 'yield'),
    hasConveyor: window.game.workers.hasConveyor('lumberjack'),
  }));
  console.log('DOPO RICARICA:', JSON.stringify(reloaded),
    reloaded.yieldLevel === 10 && reloaded.hasConveyor ? '✓ persistito' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
