/**
 * pit2-test.cjs — Verifica il "nuovo pozzo": secondo traguardo oltre il
 * nastro trasportatore, raddoppia per sempre la resa di un operaio, e non
 * si può comprare prima di aver già installato il nastro.
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
    const sawmill = g.world.buildings.sawmill;
    sawmill.available = true; sawmill.unlocked = true;
    for (const k in sawmill.def.cost) sawmill.paid[k] = sawmill.def.cost[k];
    sawmill._startRising(g); sawmill.riseT = 1; sawmill._finish(g);
  });
  await page.waitForTimeout(500);

  // prima di avere resa/magazzino al massimo E il nastro, il pozzo non deve
  // comparire nel negozio
  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const before = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title')).map((e) => e.textContent));
  console.log('POZZO ASSENTE PRIMA DEL NASTRO:', !before.some((t) => t.includes('Nuovo bosco')) ? '✓' : '✗');
  await page.click('#shop-close');

  const readyForConveyor = await page.evaluate(() => {
    const g = window.game;
    for (let i = 0; i < 10; i++) g.workers.buyUpgrade('lumberjack', 'yield', g);
    for (let i = 0; i < 10; i++) g.workers.buyUpgrade('lumberjack', 'capacity', g);
    return g.workers.conveyorReady('lumberjack');
  });
  console.log('PRONTO PER IL NASTRO:', readyForConveyor ? '✓' : '✗');

  // ancora niente pozzo: manca il nastro
  const pit2ReadyBeforeConveyor = await page.evaluate(() => window.game.workers.pit2Ready('lumberjack'));
  console.log('POZZO NON ANCORA PRONTO SENZA NASTRO:', !pit2ReadyBeforeConveyor ? '✓' : '✗');

  const yieldBefore = await page.evaluate(() => {
    const g = window.game;
    g.workers.buyConveyor('lumberjack', g);
    return g.workers.harvestYield('lumberjack');
  });
  console.log('RESA PRIMA DEL POZZO:', yieldBefore);

  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const afterConveyor = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item')).map((el) => ({
      title: el.querySelector('.shop-item-title')?.textContent,
      hasMax: !!el.querySelector('.shop-max'),
    })));
  const pit2Row = afterConveyor.find((r) => r.title?.includes('Nuovo bosco'));
  console.log('POZZO ORA VISIBILE COL NASTRO:', pit2Row && !pit2Row.hasMax ? '✓' : '✗');

  const bought = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.shop-item'));
    const row = rows.find((r) => r.querySelector('.shop-item-title')?.textContent.includes('Nuovo bosco'));
    const btn = row?.querySelector('.shop-buy');
    if (!btn) return false;
    btn.click();
    return true;
  });
  await page.waitForTimeout(300);
  const yieldAfter = await page.evaluate(() => window.game.workers.harvestYield('lumberjack'));
  console.log('POZZO COMPRATO DAL PANNELLO:', bought,
    yieldAfter === yieldBefore * 2 ? `✓ resa raddoppiata (${yieldBefore} → ${yieldAfter})` : `✗ (${yieldBefore} → ${yieldAfter})`);
  await page.click('#shop-close');

  // salva e ricarica: deve sopravvivere
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(() => ({
    hasPit2: window.game.workers.hasPit2('lumberjack'),
    yieldValue: window.game.workers.harvestYield('lumberjack'),
  }));
  console.log('DOPO RICARICA:', JSON.stringify(reloaded),
    reloaded.hasPit2 && reloaded.yieldValue === yieldAfter ? '✓ persistito' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
