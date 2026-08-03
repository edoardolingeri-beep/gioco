/**
 * fence-test.cjs — Verifica della staccionata con varchi automatici:
 * l'anello resta chiuso, i cancelletti si aprono all'avvicinarsi e si
 * richiudono quando ci si allontana.
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/fg-${n}.png`;

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
    g.addCoins(1000);
    for (const id of ['hut', 'sawmill', 'quarry', 'house']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => {
    const g = window.game;
    const gates = g.village.fenceProps.filter((p) => p.constructor.name === 'FenceGateEntity');
    const uniqueCenters = new Set(gates.map((p) => `${p.gateX.toFixed(1)},${p.gateZ.toFixed(1)}`));
    return {
      totale: g.village.fenceProps.length,
      cancelli: gates.length,
      varchiUnici: uniqueCenters.size,
      centri: [...uniqueCenters],
    };
  });
  console.log('STACCIONATA:', JSON.stringify(info));

  // vai al centro di un varco e controlla che si apra
  const [gx, gz] = info.centri[0].split(',').map(Number);
  await page.evaluate(() => { window.game.player.x = 0; window.game.player.z = 0; window.game.grid.update(window.game.player); window.game.cam.snapTo(0,0); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('1-chiusa-da-lontano') });

  const solidBefore = await page.evaluate(([x, z]) => {
    const g = window.game;
    return g.village.fenceProps.filter((p) => p.constructor.name === 'FenceGateEntity'
      && Math.hypot(p.gateX - x, p.gateZ - z) < 0.5)
      .map((p) => ({ t: +p.t.toFixed(2), solid: p.solid }));
  }, [gx, gz]);
  console.log('CANCELLO PRIMA (lontano):', JSON.stringify(solidBefore));

  await page.evaluate(([x, z]) => {
    const g = window.game;
    g.player.x = x; g.player.z = z;
    g.grid.update(g.player); g.cam.snapTo(x, z);
  }, [gx * 0.82, gz * 0.82]);   // appena fuori dal cerchio, verso il varco
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot('2-si-apre') });

  const afterOpen = await page.evaluate(([x, z]) => {
    const g = window.game;
    return g.village.fenceProps.filter((p) => p.constructor.name === 'FenceGateEntity'
      && Math.hypot(p.gateX - x, p.gateZ - z) < 0.5)
      .map((p) => ({ t: +p.t.toFixed(2), solid: p.solid }));
  }, [gx, gz]);
  console.log('CANCELLO APERTO (vicino):', JSON.stringify(afterOpen),
    afterOpen.every((s) => s.t < 0.35 && !s.solid) ? '✓' : '✗');

  // attraversa davvero il varco senza essere respinto
  const crossed = await page.evaluate(async ([x, z]) => {
    const g = window.game;
    const startX = g.player.x, startZ = g.player.z;
    // spinge il giocatore verso il centro esatto del varco e oltre
    const dx = x - startX, dz = z - startZ;
    const len = Math.hypot(dx, dz) || 1;
    for (let i = 0; i < 40; i++) {
      g.player.x += (dx / len) * 0.15;
      g.player.z += (dz / len) * 0.15;
      g.grid.update(g.player);
      await new Promise((r) => setTimeout(r, 16));
    }
    return { x: +g.player.x.toFixed(2), z: +g.player.z.toFixed(2) };
  }, [gx * 1.15, gz * 1.15]);   // oltre il centro del varco, dentro il villaggio
  console.log('POSIZIONE DOPO ATTRAVERSAMENTO:', JSON.stringify(crossed));
  await page.screenshot({ path: shot('3-attraversato') });

  // si allontana: il cancello deve richiudersi
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 0; g.player.z = 0;
    g.grid.update(g.player); g.cam.snapTo(0, 0);
  });
  await page.waitForTimeout(1200);
  const afterClose = await page.evaluate(([x, z]) => {
    const g = window.game;
    return g.village.fenceProps.filter((p) => p.constructor.name === 'FenceGateEntity'
      && Math.hypot(p.gateX - x, p.gateZ - z) < 0.5)
      .map((p) => ({ t: +p.t.toFixed(2), solid: p.solid }));
  }, [gx, gz]);
  console.log('CANCELLO RICHIUSO:', JSON.stringify(afterClose),
    afterClose.every((s) => s.t > 0.85 && s.solid) ? '✓' : '✗');
  await page.screenshot({ path: shot('4-richiuso') });

  // un secondo varco, diverso dal primo, deve comportarsi allo stesso modo
  if (info.centri.length > 1) {
    const [gx2, gz2] = info.centri[1].split(',').map(Number);
    await page.evaluate(([x, z]) => {
      const g = window.game;
      g.player.x = x * 0.85; g.player.z = z * 0.85;
      g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
    }, [gx2, gz2]);
    await page.waitForTimeout(1200);
    console.log('SECONDO VARCO APERTO:', JSON.stringify(await page.evaluate(([x, z]) => {
      const g = window.game;
      return g.village.fenceProps.filter((p) => p.constructor.name === 'FenceGateEntity'
        && Math.hypot(p.gateX - x, p.gateZ - z) < 0.5)
        .map((p) => ({ t: +p.t.toFixed(2), solid: p.solid }));
    }, [gx2, gz2])));
    await page.screenshot({ path: shot('5-secondo-varco') });
  }

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
