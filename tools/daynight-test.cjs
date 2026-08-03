/**
 * daynight-test.cjs — Verifica del ciclo giorno/notte.
 *
 * Controlla che il velo atmosferico e i bagliori delle sorgenti luminose
 * si comportino come previsto a diverse ore, e cattura le schermate per il
 * controllo visivo (il velo si può misurare solo guardandolo).
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/dn-${n}.png`;

const UPTO_CITY = ['hut', 'sawmill', 'quarry', 'house', 'warehouse',
  'bridge', 'mill', 'smithy', 'townhall', 'shops', 'park', 'bank', 'hospital', 'tower'];

/** Luminosità media della schermata: il modo più diretto di misurare il velo. */
async function brightness(page) {
  return page.evaluate(() => {
    const src = document.querySelector('canvas');
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0, 64, 128);
    const d = x.getImageData(0, 0, 64, 128).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return +(s / (d.length / 4)).toFixed(1);
  });
}

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

  /* --- il tempo scorre da solo --- */
  const t0 = await page.evaluate(() => window.game.dayNight.time);
  await page.waitForTimeout(2000);
  const t1 = await page.evaluate(() => window.game.dayNight.time);
  console.log('SCORRE:', t0.toFixed(3), '→', t1.toFixed(3),
    t1 > t0 ? '✓' : '✗ fermo');

  /* --- curva di buio e calore lungo la giornata --- */
  const curve = await page.evaluate(() => {
    const dn = window.game.dayNight;
    const save = dn.time;
    const out = [];
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      dn.setTime(t);
      dn.enabled = true;
      dn.update(0);
      out.push({ t: +t.toFixed(2), ora: dn.label, buio: +dn.darkness.toFixed(2),
        caldo: +dn.warmth.toFixed(2), notte: dn.isNight });
    }
    dn.setTime(save);
    return out;
  });
  console.table(curve);

  /* --- il fuoco da campo al centro è già una sorgente di luce --- */
  console.log('LUCI ALL\'AVVIO:', await page.evaluate(() => window.game.world.lights.length));

  /* --- schermate all'accampamento a ore diverse --- */
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 1.6; g.player.z = 2.4;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  const hours = [['1-mattina', 0.34], ['2-tramonto', 0.76], ['3-notte', 0.02], ['4-alba', 0.24]];
  for (const [name, t] of hours) {
    await page.evaluate((tt) => { window.game.dayNight.setTime(tt); }, t);
    await page.waitForTimeout(600);
    const b = await brightness(page);
    const st = await page.evaluate(() => ({
      ora: window.game.dayNight.label,
      buio: +window.game.dayNight.darkness.toFixed(2),
    }));
    console.log(`${name}: ${st.ora} buio=${st.buio} luminosità=${b}`);
    await page.screenshot({ path: shot(name) });
  }

  /* --- la città illuminata --- */
  await page.evaluate((ids) => {
    const g = window.game;
    g.stats.hasPick = true; g.stats.pickLevel = 3; g.stats.axeLevel = 4; g.stats.bagLevel = 5;
    g.recomputeStats();
    g.addCoins(60000);
    for (const id of ids) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  }, UPTO_CITY);
  await page.waitForTimeout(4000);

  console.log('LUCI IN CITTÀ:', await page.evaluate(() => {
    const g = window.game;
    return { totali: g.world.lights.length, agganciate: g.world.lights.filter((l) => l.follow).length };
  }));

  for (const [name, t, x, z] of [
    ['5-citta-giorno', 0.45, 0, 3], ['6-citta-notte', 0.98, 0, 3],
    ['7-strada-notte', 0.98, 0, 10.5], ['8-piazza-tramonto', 0.78, 0, 3],
  ]) {
    await page.evaluate(([tt, px, pz]) => {
      const g = window.game;
      g.dayNight.setTime(tt);
      g.player.x = px; g.player.z = pz;
      g.grid.update(g.player); g.cam.snapTo(px, pz);
    }, [t, x, z]);
    await page.waitForTimeout(1000);
    console.log(`${name}: luminosità=${await brightness(page)}`);
    await page.screenshot({ path: shot(name) });
  }

  /* --- il salvataggio conserva l'ora --- */
  await page.evaluate(() => { window.game.dayNight.setTime(0.9); window.game.save(); });
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1500);
  console.log('DOPO RICARICA:', JSON.stringify(await page.evaluate(() => ({
    ora: +window.game.dayNight.time.toFixed(2),
    luci: window.game.world.lights.length,
  }))));

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)),
    '| qualità:', await page.evaluate(() => window.game.quality.scale));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
