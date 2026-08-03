/**
 * music-test.cjs — Verifica della colonna sonora procedurale.
 *
 * Non si può "ascoltare" un test, quindi controlliamo ciò che è oggettivo:
 * che il metronomo avanzi, che le note finiscano davvero sul bus della
 * musica, che il tema cambi con la fase del villaggio e che l'interruttore
 * la spenga.
 */

const { chromium } = require('playwright');

const UPTO = ['hut', 'sawmill', 'quarry', 'house', 'warehouse', 'bridge', 'mill', 'smithy'];

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });

  // Contiamo gli oscillatori creati: è la prova che le note vengono suonate.
  await page.addInitScript(() => {
    window.__osc = 0;
    const P = (window.AudioContext || window.webkitAudioContext).prototype;
    const orig = P.createOscillator;
    P.createOscillator = function () { window.__osc++; return orig.call(this); };
  });

  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  // un tocco sblocca l'audio, come farebbe un giocatore
  await page.mouse.click(195, 600);
  await page.waitForTimeout(1500);

  const a = await page.evaluate(() => ({
    audioPronto: window.game.audio.ready,
    stato: window.game.audio.ctx?.state,
    busMusica: !!window.game.audio.musicBus,
    volume: window.game.audio.musicBus?.gain.value,
    tema: window.game.music.theme.name,
  }));
  console.log('AVVIO:', JSON.stringify(a));

  const s1 = await page.evaluate(() => window.game.music.step);
  const o1 = await page.evaluate(() => window.__osc);
  await page.waitForTimeout(3000);
  const s2 = await page.evaluate(() => window.game.music.step);
  const o2 = await page.evaluate(() => window.__osc);
  console.log('METRONOMO:', s1, '→', s2, `(+${s2 - s1} ottavi)`,
    '| note suonate:', o2 - o1, (s2 > s1 && o2 > o1) ? '✓' : '✗');

  /* --- il tema cambia con la fase --- */
  await page.evaluate((ids) => {
    const g = window.game;
    g.stats.hasPick = true; g.stats.pickLevel = 3; g.recomputeStats(); g.addCoins(60000);
    for (const id of ids) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
  }, UPTO);
  await page.waitForTimeout(3500);
  console.log('DOPO 8 EDIFICI:', JSON.stringify(await page.evaluate(() => ({
    livelloVillaggio: window.game.village.level,
    tema: window.game.music.theme.name,
    bpm: window.game.music.theme.bpm,
  }))));

  /* --- di notte la musica si abbassa (stesso tema, voci più basse) --- */
  await page.evaluate(() => window.game.dayNight.setTime(0.0));
  await page.waitForTimeout(1200);
  console.log('DI NOTTE:', JSON.stringify(await page.evaluate(() => ({
    notte: window.game.dayNight.isNight, tema: window.game.music.theme.name,
  }))));

  /* --- l'interruttore la spegne --- */
  const o3 = await page.evaluate(() => {
    window.game.music.setEnabled(false);
    return window.__osc;
  });
  await page.waitForTimeout(2000);
  const o4 = await page.evaluate(() => window.__osc);
  console.log('SPENTA: note nuove =', o4 - o3, (o4 - o3) === 0 ? '✓' : '✗');

  await page.evaluate(() => window.game.music.setEnabled(true));
  await page.waitForTimeout(1500);
  console.log('RIACCESA: note nuove =',
    await page.evaluate(() => window.__osc) - o4);

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 8).join('\n') : 'Nessun errore.');
  await browser.close();
})();
