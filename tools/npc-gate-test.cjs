/**
 * npc-gate-test.cjs — Verifica che gli abitanti nati fuori dal recinto
 * riescano davvero a entrare (passando per un varco), invece di restare a
 * correre contro un tratto chiuso per sempre.
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/npcgate-${n}.png`;

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

  // porta il villaggio fino al livello con la staccionata (liv. 4, "casa")
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(2000);
    for (const id of ['hut', 'sawmill', 'quarry', 'house']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);

  const fenceInfo = await page.evaluate(() => ({
    H: window.game.village.fenceHalfExtent,
    varchi: window.game.village.gateCenters,
  }));
  console.log('RECINTO:', JSON.stringify(fenceInfo));

  // forza la comparsa di alcuni nuovi abitanti, tutti fuori dal recinto per
  // costruzione (spawnNPC li mette a fenceRadius + un margine)
  const fresh = await page.evaluate(() => {
    const g = window.game;
    const before = g.village.npcs.length;
    for (let i = 0; i < 6; i++) g.village.spawnNPC(0);
    return g.village.npcs.slice(before).map((n) => ({ x: +n.x.toFixed(1), z: +n.z.toFixed(1) }));
  });
  console.log('NUOVI ABITANTI (posizione di nascita):', JSON.stringify(fresh));
  const H = fenceInfo.H;
  const startOutside = fresh.filter((n) => Math.abs(n.x) > H || Math.abs(n.z) > H).length;
  console.log('Nati fuori dal recinto:', startOutside, '/', fresh.length);

  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 0; g.player.z = 20;
    g.grid.update(g.player); g.cam.snapTo(0, 20);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('1-appena-nati') });

  // lascia scorrere il tempo e controlla che entrino
  await page.waitForTimeout(15000);

  const after = await page.evaluate(() => {
    const g = window.game;
    const H = g.village.fenceHalfExtent;
    return g.village.npcs.slice(-6).map((n) => ({
      x: +n.x.toFixed(1), z: +n.z.toFixed(1),
      dentro: Math.abs(n.x) <= H && Math.abs(n.z) <= H,
      act: n.act,
    }));
  });
  console.log('DOPO 15s:', JSON.stringify(after));
  const nowInside = after.filter((n) => n.dentro).length;
  console.log('Ora dentro il recinto:', nowInside, '/', after.length,
    nowInside === after.length ? '✓ tutti entrati' : '✗ qualcuno è rimasto fuori');

  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 0; g.player.z = 20;
    g.grid.update(g.player); g.cam.snapTo(0, 20);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('2-dopo-15s') });

  // caso limite: nessun giocatore vicino a nessun cancello — gli abitanti
  // devono aprirli comunque da soli
  const gateOpenedByNpc = await page.evaluate(() => {
    const g = window.game;
    g.player.x = 40; g.player.z = 40;   // il giocatore è lontanissimo
    g.grid.update(g.player);
    const gates = g.world.dynamic.filter((e) => e.constructor.name === 'FenceGateEntity');
    return gates.some((gt) => gt.t < 0.9);
  });
  console.log('UN CANCELLO SI APRE ANCHE SENZA IL GIOCATORE VICINO:', gateOpenedByNpc ? '✓' : '(nessuno nei paraggi in questo istante)');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
