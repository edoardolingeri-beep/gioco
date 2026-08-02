// Cattura i momenti chiave (taglio, caduta, capanna finita) per ispezione visiva.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 30000 });
  await page.waitForTimeout(800);

  // 1. avvicina il giocatore a un albero e lascialo tagliare
  await page.evaluate(() => {
    const g = window.game;
    const out = [];
    g.world.grid.queryRect(-40, -40, 40, 40, out);
    const t = out.filter((e) => e.constructor.name === 'TreeEntity' && e.state === 0)
      .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
    g.player.x = t.x - 0.1; g.player.z = t.z + 1.35;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
    window.__t = t;
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/a-chop.png' });

  // 2. istante della caduta
  await page.evaluate(() => {
    const t = window.__t;
    // porta l'albero a un solo colpo dalla caduta
    t.hp = 1;
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/b-fall.png' });
  await page.waitForTimeout(450);
  await page.screenshot({ path: '/tmp/c-logs.png' });

  // 3. capanna quasi completa → completamento
  await page.evaluate(() => {
    const g = window.game;
    g.world.hut.paid.wood = 36;
    g.carry.add('wood', 6);
    g.player.x = g.world.hut.x + 1.6; g.player.z = g.world.hut.z + 2.0;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/d-rising.png' });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: '/tmp/e-done.png' });

  // 4. zaino pieno: catasta alta
  await page.evaluate(() => {
    const g = window.game;
    g.stats.bagLevel = 2; g.recomputeStats();
    g.carry.add('wood', 20);
    g.player.yaw = 0.6;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/f-stack.png' });

  // 5. banco potenziamenti con monete
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(200);
    g.player.x = g.world.workbench.x + 1.1; g.player.z = g.world.workbench.z + 1.8;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/g-bench.png' });

  console.log('fps', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI: ' + errs.join(' | ') : 'nessun errore');
  await browser.close();
})();
