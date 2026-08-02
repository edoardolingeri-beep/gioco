const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));

  await page.goto('http://localhost:8099/index.html', { waitUntil: 'load' });

  // aspetta la fine del caricamento
  await page.waitForFunction(() => window.game && window.game.loop && window.game.loop.running, { timeout: 30000 })
    .catch(() => errors.push('[timeout] il gioco non è partito'));

  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => {
    const g = window.game;
    if (!g) return { ok: false };
    return {
      ok: true,
      fps: Math.round(g.loop.fps),
      sprites: g.renderer.stats.sprites,
      shadows: g.renderer.stats.shadows,
      dynamic: g.world.dynamic.length,
      trees: g.world.visible.length,
      player: [g.player.x.toFixed(2), g.player.z.toFixed(2)],
      charAtlas: !!g.assets.char && g.assets.char.walk.length,
      carriedLogs: g.assets.carriedLogs ? g.assets.carriedLogs.length : 0,
    };
  });
  console.log('STATO:', JSON.stringify(info));

  await page.screenshot({ path: process.argv[2] || '/tmp/shot1.png' });

  // Simula: cammina verso un albero
  await page.evaluate(() => {
    const g = window.game;
    // teletrasporta il giocatore vicino a un albero vivo
    const trees = [];
    g.world.grid.queryRect(-40, -40, 40, 40, trees);
    const t = trees.find((e) => e.constructor.name === 'TreeEntity' && e.state === 0);
    if (t) { g.player.x = t.x + 0.9; g.player.z = t.z + 0.9; g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z); }
    window.__tree = t;
  });
  await page.waitForTimeout(4000);

  const chop = await page.evaluate(() => {
    const g = window.game;
    return {
      carry: g.carry.total,
      trees: g.stats.treesChopped,
      anim: g.player.anim,
      pickups: g.pickups.count,
      treeState: window.__tree ? window.__tree.state : -1,
      particles: g.fx.count,
    };
  });
  console.log('TAGLIO:', JSON.stringify(chop));
  await page.screenshot({ path: process.argv[3] || '/tmp/shot2.png' });

  // Riempi lo zaino e vai al cantiere
  await page.evaluate(() => {
    const g = window.game;
    g.carry.add('wood', 12);
    g.player.x = g.world.hut.x + 1.2; g.player.z = g.world.hut.z + 1.4;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(2500);
  const build = await page.evaluate(() => {
    const g = window.game;
    return { paid: g.world.hut.paid.wood, carry: g.carry.total, state: g.world.hut.state };
  });
  console.log('CANTIERE:', JSON.stringify(build));
  await page.screenshot({ path: process.argv[4] || '/tmp/shot3.png' });

  // Mercante
  await page.evaluate(() => {
    const g = window.game;
    g.carry.add('wood', 10);
    g.player.x = g.world.merchant.x + 1.5; g.player.z = g.world.merchant.z + 1.6;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(3000);
  const sell = await page.evaluate(() => ({
    coins: window.game.stats.coins, carry: window.game.carry.total,
  }));
  console.log('MERCANTE:', JSON.stringify(sell));
  await page.screenshot({ path: process.argv[5] || '/tmp/shot4.png' });

  const fps = await page.evaluate(() => Math.round(window.game.loop.fps));
  console.log('FPS finale:', fps);

  if (errors.length) console.log('ERRORI:\n' + errors.slice(0, 25).join('\n'));
  else console.log('Nessun errore in console.');

  await browser.close();
})();
