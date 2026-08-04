/**
 * welcome-back-test.cjs — Verifica il popup "bentornato": gli operai già
 * assunti (e la banca) devono fruttare qualcosa in base al tempo reale
 * trascorso da fuori dal gioco, non solo mentre l'app è aperta.
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

  // Prepara una partita con un boscaiolo assunto e un po' di rendita dalla
  // banca, poi salva e "invecchia" il salvataggio di 20 minuti: come se
  // l'app fosse rimasta chiusa per davvero.
  await page.evaluate(() => {
    const g = window.game;
    g.addCoins(500000);
    g.workers.counts.lumberjack = 2;
    g.stats.income = 5;
    g.save();
    const raw = JSON.parse(localStorage.getItem('gioco.save.v1'));
    raw.ts -= 20 * 60 * 1000;
    localStorage.setItem('gioco.save.v1', JSON.stringify(raw));
    // Un'eventuale visibilitychange durante il reload che sta per arrivare
    // non deve rifare il salvataggio e vanificare il "ts" invecchiato qui
    // sopra: da qui in poi salva solo il test, non più il gioco.
    g.save = () => {};
  });

  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1400);

  const shown = await page.evaluate(() => !document.getElementById('hud-welcome-sheet').hidden);
  console.log('POPUP BENTORNATO VISIBILE DOPO 20 MIN DI ASSENZA:', shown ? '✓' : '✗');

  const listText = await page.evaluate(() => document.getElementById('welcome-list').textContent);
  console.log('CONTENUTO:', listText.trim().replace(/\s+/g, ' '));
  console.log('MOSTRA LEGNO GUADAGNATO:', /Legno/.test(listText) ? '✓' : '✗');
  console.log('MOSTRA MONETE (rendita banca):', /Monete/.test(listText) ? '✓' : '✗');

  const coinsAfter = await page.evaluate(() => window.game.stats.coins);
  console.log('MONETE DOPO IL POPUP (>500000, la rendita è stata accreditata):', coinsAfter, coinsAfter > 500000 ? '✓' : '✗');

  await page.screenshot({ path: '/tmp/claude-0/-home-user-gioco/fab77fb3-0376-5014-b9b8-8a620b019231/scratchpad/welcome-back.png' });

  // chiude e verifica che il pannello sparisca
  await page.click('#welcome-close');
  await page.waitForTimeout(200);
  const closedOk = await page.evaluate(() => document.getElementById('hud-welcome-sheet').hidden);
  console.log('SI CHIUDE COL PULSANTE:', closedOk ? '✓' : '✗');

  // ---- una seconda partita "fresca": ricarico subito, senza aver aspettato
  // abbastanza — il popup NON deve comparire (soglia minima in CFG.offline).
  await page.evaluate(() => {
    const g = window.game;
    g.workers.counts.lumberjack = 2;
    g.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1400);
  const shownTooSoon = await page.evaluate(() => !document.getElementById('hud-welcome-sheet').hidden);
  console.log('NESSUN POPUP SE IL RICARICO È IMMEDIATO:', !shownTooSoon ? '✓' : '✗ è comparso lo stesso');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
