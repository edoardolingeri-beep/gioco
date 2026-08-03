/**
 * phase3-test.cjs — Verifica delle meccaniche di Fase 3:
 * fiume invalicabile, ponte che apre il guado, ferro oltre l'acqua,
 * mulino con pale rotanti, fucina, strade lastricate.
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/f3-${n}.png`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });

  const t0 = Date.now();
  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 60000 });
  console.log('Caricamento:', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await page.waitForTimeout(700);

  const boot = await page.evaluate(() => {
    const g = window.game;
    const out = []; g.world.grid.queryRect(-50, -50, 50, 50, out);
    const rocks = out.filter((e) => e.constructor.name === 'RockEntity');
    return {
      millSails: g.assets.millSails?.length ?? 0,
      ironVeins: g.assets.ironVeins.length,
      buildings: Object.keys(g.world.buildings).length,
      veniInWorld: rocks.filter((r) => r.resource === 'iron').length,
      tuttiOltreFiume: rocks.filter((r) => r.resource === 'iron')
        .every((r) => g.world.river.isBeyond(r.x, r.z)),
      townProps: ['wagon', 'trough', 'lamp'].filter((k) => g.assets.village[k]).length,
    };
  });
  console.log('AVVIO:', JSON.stringify(boot));

  /* --- 1. il fiume respinge --- */
  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 1.5; g.player.z = g.world.river.centerAt(1.5) + 4;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(400);
  const blocked = await page.evaluate(async () => {
    const g = window.game;
    // prova a spingersi dentro l'acqua per un secondo
    const target = g.world.river.centerAt(1.5);
    for (let i = 0; i < 40; i++) {
      g.player.z -= 0.15;
      g.player._collide(g);
    }
    return {
      z: +g.player.z.toFixed(2),
      centro: +target.toFixed(2),
      dentro: g.world.river.contains(g.player.x, g.player.z),
      oltre: g.world.river.isBeyond(g.player.x, g.player.z),
    };
  });
  console.log('FIUME BLOCCA:', JSON.stringify(blocked));
  await page.screenshot({ path: shot('1-fiume') });

  /* --- 2. costruiamo tutto fino al ponte --- */
  await page.evaluate(() => {
    const g = window.game;
    g.stats.hasPick = true; g.stats.pickLevel = 2;
    g.stats.axeLevel = 3; g.stats.bagLevel = 3;
    g.recomputeStats();
    g.addCoins(5000);
    for (const id of ['hut', 'sawmill', 'quarry', 'house', 'warehouse', 'bridge']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(2500);

  const bridge = await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.bridge;
    return {
      state: b.state, solido: b.solid,
      varchi: g.world.river.gaps.length,
      passaggio: !g.world.river.contains(b.x, g.world.river.centerAt(b.x)),
      livello: g.village.level, fase: g.village.stageName,
      millAvailable: g.world.buildings.mill.available,
    };
  });
  console.log('PONTE:', JSON.stringify(bridge));

  /* --- 3. attraversiamo davvero --- */
  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.bridge;
    g.player.x = b.x; g.player.z = b.z + 4.5;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('2-ponte') });
  const crossed = await page.evaluate(() => {
    const g = window.game;
    for (let i = 0; i < 70; i++) { g.player.z -= 0.14; g.player._collide(g); }
    return { z: +g.player.z.toFixed(2), oltre: g.world.river.isBeyond(g.player.x, g.player.z) };
  });
  console.log('ATTRAVERSATO:', JSON.stringify(crossed));
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('3-oltre') });

  /* --- 4. estrazione del ferro --- */
  const iron = await page.evaluate(async () => {
    const g = window.game;
    const out = []; g.world.grid.queryRect(-50, -50, 50, 50, out);
    const vein = out.filter((e) => e.constructor.name === 'RockEntity' && e.resource === 'iron')
      .sort((a, b) => Math.hypot(a.x - g.player.x, a.z - g.player.z)
        - Math.hypot(b.x - g.player.x, b.z - g.player.z))[0];
    if (!vein) return 'nessuna vena';
    g.player.x = vein.x + 1.0; g.player.z = vein.z + 1.0;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
    window.__vein = vein;
    return { hp: vein.hp, richiede: vein.requiredPick };
  });
  console.log('VENA TROVATA:', JSON.stringify(iron));
  await page.waitForTimeout(5000);
  const mined = await page.evaluate(() => ({
    hp: window.__vein.hp,
    ferro: window.game.carry.count('iron'),
    estratte: window.game.stats.ironMined,
    anim: window.game.player.anim,
  }));
  console.log('FERRO ESTRATTO:', JSON.stringify(mined));
  await page.screenshot({ path: shot('4-ferro') });

  /* --- 5. mulino e fucina --- */
  await page.evaluate(() => {
    const g = window.game;
    for (const id of ['mill', 'smithy']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(3000);
  const town = await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, fase: g.village.stageName,
      abitanti: g.village.population,
      carrettieri: g.village.npcs.filter((n) => n.hauling).length,
      sellBonus: g.stats.sellBonus,
      ironBonus: g.stats.ironBonus,
      decals: g.world.terrain.decals.length,
    };
  });
  console.log('PAESE:', JSON.stringify(town));

  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.mill;
    g.player.x = b.x + 0.3; g.player.z = b.z + 3.4;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot('5-mulino') });
  await page.waitForTimeout(700);
  await page.screenshot({ path: shot('5b-mulino') });

  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.smithy;
    g.player.x = b.x + 0.4; g.player.z = b.z + 3.2;
    g.grid.update(g.player); g.cam.snapTo(g.player.x, g.player.z);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot('6-fucina') });

  await page.evaluate(() => {
    const g = window.game;
    g.player.x = 0; g.player.z = 2;
    g.grid.update(g.player); g.cam.snapTo(0, 2);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot('7-piazza') });

  /* --- 6. salvataggio: il varco resta aperto --- */
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => {
    const g = window.game;
    return {
      livello: g.village.level, varchi: g.world.river.gaps.length,
      abitanti: g.village.population, sellBonus: g.stats.sellBonus,
      smithy: g.world.buildings.smithy.state,
    };
  });
  console.log('DOPO RICARICA:', JSON.stringify(after));

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 10).join('\n') : 'Nessun errore.');
  await browser.close();
})();
