// Profilo grossolano: quanto costano update, terreno, entità, flush, particelle.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 30000 });
  await page.waitForTimeout(1200);

  const res = await page.evaluate(async () => {
    const g = window.game;
    const r = g.renderer, ctx = r.ctx, cam = g.cam;
    const N = 120;
    const t = (fn) => { const a = performance.now(); for (let i = 0; i < N; i++) fn(); return (performance.now() - a) / N; };

    const tUpdate = t(() => g.update(1 / 60));
    const tTerrain = t(() => { r.begin(cam); g.world.terrain.draw(ctx, cam, { w: r.w, h: r.h }); });
    const tEntities = t(() => { r.begin(cam); g.world.draw(r, g, cam); });
    const tFlush = t(() => { r.begin(cam); g.world.draw(r, g, cam); r.flush(g.assets.fx.shadow); });
    const tFull = t(() => g.render());

    return {
      update: +tUpdate.toFixed(2),
      terreno: +tTerrain.toFixed(2),
      entita_queue: +tEntities.toFixed(2),
      entita_flush: +(tFlush - tEntities).toFixed(2),
      render_totale: +tFull.toFixed(2),
      sprite: r.stats.sprites,
      ombre: r.stats.shadows,
      dinamiche: g.world.dynamic.length,
      celle: g.world.grid.cells.size,
    };
  });
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
