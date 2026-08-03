/**
 * bear-test.cjs — Verifica del nuovo nemico "orso": si cuoce senza errori,
 * appare, insegue, morde e muore come il lupo (stessa macchina a stati),
 * ma con numeri diversi (più vita, più danno, ricompensa più alta).
 */
const { chromium } = require('playwright');
const shot = (n) => `/tmp/bear-${n}.png`;

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

  const atlas = await page.evaluate(() => {
    const a = window.game.assets.bear;
    return a ? { dirs: a.dirs, walkFrames: a.walk[0]?.length, attackFrames: a.attack[0]?.length, idleOk: !!a.idle[0] } : null;
  });
  console.log('ATLANTE ORSO:', JSON.stringify(atlas));

  // forza un orso vicino al giocatore, in un punto valido (fuori dal villaggio)
  const info = await page.evaluate(async () => {
    const g = window.game;
    const mod = await import('/src/entities/BearEntity.js');
    g.village.level = 4;
    g.player.x = 0; g.player.z = 0;
    g.grid.update(g.player);
    const bear = new mod.BearEntity(3, 0, g);
    g.world.add(bear, true);
    g.spawner.enemies.push(bear);
    return { hp: bear.hp, speed: bear.speed, radius: bear.radius };
  });
  console.log('ORSO CREATO:', JSON.stringify(info));
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('1-appena-nato') });

  // lascia che insegua e attacchi (aggroRange 6, è a 3 unità → aggro immediato)
  await page.waitForTimeout(2500);
  const chasing = await page.evaluate(() => {
    const b = window.game.spawner.enemies[window.game.spawner.enemies.length - 1];
    return { state: b.state, hp: b.hp, playerHp: window.game.player.hp };
  });
  console.log('DOPO 2.5s (dovrebbe aver attaccato almeno una volta):', JSON.stringify(chasing));
  await page.screenshot({ path: shot('2-attacco') });

  // uccidilo e verifica la ricompensa/contatore
  const beforeCoins = await page.evaluate(() => window.game.stats.coins);
  const beforeBears = await page.evaluate(() => window.game.stats.bearsKilled);
  await page.evaluate(() => {
    const g = window.game;
    const b = g.spawner.enemies[g.spawner.enemies.length - 1];
    b.takeDamage(9999, g.player.x, g.player.z, g);
  });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    coins: window.game.stats.coins,
    bearsKilled: window.game.stats.bearsKilled,
  }));
  console.log('DOPO UCCISIONE:', JSON.stringify(after),
    after.coins - beforeCoins === 14 && after.bearsKilled === beforeBears + 1 ? '✓ ricompensa e contatore corretti' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
