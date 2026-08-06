/**
 * raid-test.cjs — Verifica il raid dei ladri: bande incappucciate che
 * puntano al centro del villaggio e rubano monete se arrivano indisturbate.
 * Le vere difese sono fisiche, non un dado nascosto: un recinto chiuso
 * blocca un ladro (niente `opensGates`, vedi FenceGateEntity) esattamente
 * come bloccherebbe il giocatore, e la torretta di guardia lo colpisce da
 * sola se è nel suo raggio (vedi TowerEntity._defend).
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

  /* --- atlante dei ladri: cinque varianti, stesso rig degli abitanti --- */
  const atlas = await page.evaluate(() => {
    const A = window.game.assets.thief;
    return { variants: A?.length, dirs: A?.[0]?.dirs, hasIdle: !!A?.[0]?.idle?.[0] };
  });
  console.log('ATLANTE LADRI:', JSON.stringify(atlas),
    atlas.variants === 5 && atlas.dirs === 8 && atlas.hasIdle ? '✓' : '✗');

  /* --- villaggio ancora senza mura: un raid deve riuscire a rubare --- */
  const undefended = await page.evaluate(() => {
    const g = window.game;
    g.addCoins(500000);
    g.raid.enabled = true;
    g.player.x = 200; g.player.z = 200;
    g.grid.update(g.player);
    const coinsBefore = g.stats.coins;
    g.raid._spawnRaid(g);
    const raidThieves = g.raid.thieves.slice();
    for (let i = 0; i < 300; i++) {
      for (const th of raidThieves) if (!th.dead) th.update(0.1, g);
    }
    return {
      coinsBefore, coinsAfter: g.stats.coins,
      allResolved: raidThieves.every((th) => th.state === 2 /* FLEE */ || th.state === 4 /* DYING */),
    };
  });
  console.log('RAID SENZA DIFESE:', JSON.stringify(undefended),
    undefended.coinsAfter < undefended.coinsBefore ? '✓ derubato' : '✗ nessun furto (atteso invece un furto)');

  // il riepilogo del raid deve comparire come popup, non solo un toast
  await page.waitForTimeout(200);
  const popup = await page.evaluate(() => {
    const el = document.getElementById('hud-raid-sheet');
    return { hidden: el.hidden, title: document.getElementById('raid-title').textContent };
  });
  console.log('POPUP "SEI STATO DERUBATO":', JSON.stringify(popup), !popup.hidden ? '✓' : '✗');
  await page.click('#raid-close');

  /* --- costruisce la casa (livello 4: compare il recinto) e la torretta --- */
  await page.evaluate(() => {
    const g = window.game;
    for (const id of ['hut', 'sawmill', 'quarry', 'house', 'guardTower']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  });
  await page.waitForTimeout(1500);
  const fence = await page.evaluate(() => window.game.village.fenceHalfExtent);
  console.log('RECINTO SU (livello 4):', fence, fence > 0 ? '✓' : '✗');

  /* --- con il recinto chiuso, un nuovo raid non deve riuscire a rubare --- */
  const blocked = await page.evaluate(() => {
    const g = window.game;
    g.player.x = 200; g.player.z = 200;
    g.grid.update(g.player);
    const coinsBefore = g.stats.coins;
    g.raid._spawnRaid(g);
    const raidThieves = g.raid.thieves.filter((th) => !th.dead);
    for (let i = 0; i < 250; i++) {
      for (const th of raidThieves) if (!th.dead) th.update(0.1, g);
    }
    return {
      coinsBefore, coinsAfter: g.stats.coins,
      stillTrying: raidThieves.every((th) => th.state === 0 /* APPROACH */),
      count: raidThieves.length,
    };
  });
  console.log('RAID COL RECINTO CHIUSO:', JSON.stringify(blocked),
    blocked.coinsAfter === blocked.coinsBefore ? '✓ nessun furto, bloccati dal recinto' : '✗');

  /* --- il giocatore accorre e finisce i ladri intrappolati al muro: il
     raid deve chiudersi come "respinto", con la ricompensa per ognuno e
     senza alcun furto — vedi RaidSystem._finishRaid --- */
  const trappedFight = await page.evaluate(() => {
    const g = window.game;
    const coinsBefore = g.stats.coins;
    const repelledBefore = g.stats.thievesRepelled ?? 0;
    const trapped = g.raid.thieves.filter((th) => !th.dead);
    for (const th of trapped) th.takeDamage(9999, th.x, th.z, g);
    return {
      coinsGained: g.stats.coins - coinsBefore,
      repelledGained: (g.stats.thievesRepelled ?? 0) - repelledBefore,
      expected: trapped.length,
    };
  });
  console.log('IL GIOCATORE FINISCE I LADRI INTRAPPOLATI:', JSON.stringify(trappedFight),
    trappedFight.repelledGained === trappedFight.expected && trappedFight.coinsGained === trappedFight.expected * 6
      ? '✓ tutti respinti, nessun furto' : '✗');

  /* --- la torretta colpisce da sola un ladro nel suo raggio --- */
  const towerKill = await page.evaluate(async () => {
    const g = window.game;
    const mod = await import('/src/entities/ThiefEntity.js');
    const tower = g.world.buildings.guardTower;
    const th = new mod.ThiefEntity(tower.x + 3, tower.z, g, 0);
    g.world.add(th, true);
    const coinsBefore = g.stats.coins;
    for (let i = 0; i < 200 && th.alive; i++) g.world.update(0.1, g);
    return { alive: th.alive, coinsGained: g.stats.coins - coinsBefore };
  });
  console.log('LADRO NEL RAGGIO DELLA TORRETTA:', JSON.stringify(towerKill),
    !towerKill.alive && towerKill.coinsGained > 0 ? '✓ ucciso dalla torretta, ricompensa data' : '✗');

  /* --- il giocatore stesso può respingere un ladro a colpi --- */
  const playerKill = await page.evaluate(async () => {
    const g = window.game;
    const mod = await import('/src/entities/ThiefEntity.js');
    const th = new mod.ThiefEntity(g.player.x + 1, g.player.z, g, 1);
    g.world.add(th, true);
    for (let i = 0; i < 60 && th.alive; i++) g.world.update(0.1, g);
    return { alive: th.alive };
  });
  console.log('IL GIOCATORE PUÒ RESPINGERE UN LADRO:', JSON.stringify(playerKill), !playerKill.alive ? '✓' : '✗');

  /* --- salva e ricarica: le statistiche del raid devono sopravvivere --- */
  const beforeReload = await page.evaluate(() => ({
    thievesRepelled: window.game.stats.thievesRepelled,
    coinsStolen: window.game.stats.coinsStolen,
  }));
  await page.evaluate(() => window.game.save());
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(() => ({
    thievesRepelled: window.game.stats.thievesRepelled,
    coinsStolen: window.game.stats.coinsStolen,
  }));
  console.log('DOPO RICARICA:', JSON.stringify(reloaded),
    reloaded.thievesRepelled === beforeReload.thievesRepelled && reloaded.coinsStolen === beforeReload.coinsStolen
      ? '✓ statistiche persistite' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
