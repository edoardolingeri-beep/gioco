/**
 * autosell-test.cjs — Verifica il "villaggio autosufficiente": un cartello
 * SENZA nastro non vende nulla finché c'è ancora posto (la risorsa resta
 * disponibile per le costruzioni) — vende solo l'eccedenza quando il
 * magazzino è pieno, invece di lasciare che l'operaio la butti via
 * aspettando in eterno. Appena scende sotto il tetto, torna ad accumulare.
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
    for (const id of ['hut', 'sawmill']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
    g.workers.counts.lumberjack = 1;
    g.player.x = 200; g.player.z = 200; // lontano: niente ritiro a mano
    g.grid.update(g.player);
  });
  await page.waitForTimeout(500);

  // magazzino a metà: NON deve vendersi da solo, resta lì per le costruzioni
  const halfFull = await page.evaluate(() => {
    const g = window.game;
    const st = g.workers.stations.lumberjack;
    const cap = g.workers.stockCap('lumberjack');
    st.stock = Math.floor(cap / 2);
    for (let i = 0; i < 30; i++) st.update(0.1, g);
    return { stock: st.stock, cap, autoSells: g.workers.autoSells('lumberjack') };
  });
  console.log('MAGAZZINO A METÀ:', JSON.stringify(halfFull));
  console.log('NON SI VENDE (resta disponibile per le costruzioni):',
    !halfFull.autoSells && halfFull.stock === Math.floor(halfFull.cap / 2) ? '✓' : '✗');

  // magazzino pieno: ora sì, vende l'eccedenza
  const fullResult = await page.evaluate(() => {
    const g = window.game;
    const st = g.workers.stations.lumberjack;
    const cap = g.workers.stockCap('lumberjack');
    st.stock = cap;
    const coinsBefore = g.stats.coins;
    const wasFullAtStart = g.workers.autoSells('lumberjack');
    for (let i = 0; i < 30; i++) st.update(0.1, g);
    return {
      cap, wasFullAtStart, stockAfter: st.stock, coinsGained: g.stats.coins - coinsBefore,
    };
  });
  console.log('MAGAZZINO PIENO:', JSON.stringify(fullResult));
  console.log('VENDEVA APPENA PIENO:', fullResult.wasFullAtStart ? '✓' : '✗');
  console.log('HA VENDUTO L\'ECCEDENZA (monete guadagnate):', fullResult.coinsGained > 0 ? '✓' : '✗');

  // non svuota tutto: si ferma appena non è più pieno, per lasciarne
  // comunque disponibile per le costruzioni
  console.log('SI FERMA SOTTO IL TETTO (non svuota tutto il magazzino):',
    fullResult.stockAfter > 0 && fullResult.stockAfter < fullResult.cap ? '✓'
      : (fullResult.stockAfter === fullResult.cap - 1 ? '✓' : `✗ (${fullResult.stockAfter}/${fullResult.cap})`));
  const stillNotFull = await page.evaluate(() => window.game.workers.autoSells('lumberjack'));
  console.log('NON VENDE PIÙ ORA CHE NON È PIENO:', !stillNotFull ? '✓' : '✗');

  // negozio: il manager compare comunque una volta pronti resa/magazzino,
  // indipendentemente dal fatto che il magazzino sia pieno o no
  await page.evaluate(() => {
    const g = window.game;
    for (let i = 0; i < 10; i++) g.workers.buyUpgrade('lumberjack', 'yield', g);
    for (let i = 0; i < 10; i++) g.workers.buyUpgrade('lumberjack', 'capacity', g);
  });
  await page.click('#hud-shop');
  await page.waitForTimeout(300);
  const hasManager = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.shop-item-title')).some((e) => e.textContent.includes('Manager')));
  console.log('IL MANAGER COMPARE NEL NEGOZIO (indipendente dal magazzino pieno):', hasManager ? '✓' : '✗');
  await page.click('#shop-close');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
