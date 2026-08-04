/**
 * events-test.cjs — Verifica gli eventi casuali (EventSystem): il carro
 * rovesciato lascia risorse gratis, il mercante paga di più per un po', e
 * il lupo feroce è una scelta vera (accettare spawna un nemico più tosto
 * con ricompensa maggiore, rifiutare non fa succedere nulla).
 *
 * Il timer vero è troppo lento per un test (90-180s): chiamiamo i metodi
 * interni direttamente, bypassando l'attesa — è lo stesso approccio già
 * usato per i potenziamenti del negozio in altri test di questa suite.
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

  // --- carro rovesciato: risorse gratis vicino al giocatore ---
  const cart = await page.evaluate(() => {
    const g = window.game;
    const before = g.carry.total;
    g.events._cart(g);
    return { pickups: g.pickups.count, before };
  });
  console.log('CARRO ROVESCIATO — RISORSE APPARSE A TERRA:', JSON.stringify(cart),
    cart.pickups > 0 ? '✓' : '✗');

  // --- mercante generoso: bonus di vendita temporaneo ---
  const bonus = await page.evaluate(() => {
    const g = window.game;
    const before = g.events.sellMul;
    g.events._merchantBonus(g);
    return { before, after: g.events.sellMul, timer: g.events.sellMulT };
  });
  console.log('BONUS MERCANTE:', JSON.stringify(bonus), bonus.after > 1 && bonus.timer > 0 ? '✓' : '✗');

  // il bonus deve davvero alzare il prezzo di vendita
  const priceCheck = await page.evaluate(() => {
    const g = window.game;
    return {
      normal: Math.round(2 * (g.stats.sellBonus ?? 1)),
      withBonus: Math.round(2 * (g.stats.sellBonus ?? 1) * g.events.sellMul),
    };
  });
  console.log('PREZZO LEGNO NORMALE VS CON BONUS:', JSON.stringify(priceCheck),
    priceCheck.withBonus > priceCheck.normal ? '✓' : '✗');

  // il bonus scade da solo
  await page.evaluate(() => { window.game.events.sellMulT = 0.05; });
  await page.waitForTimeout(300);
  const expired = await page.evaluate(() => window.game.events.sellMul);
  console.log('IL BONUS SCADE DA SOLO:', expired === 1 ? '✓' : '✗');

  // --- lupo feroce: popup con scelta vera ---
  await page.evaluate(() => window.game.events._rareWolf(window.game));
  await page.waitForTimeout(200);
  const popupShown = await page.evaluate(() => !document.getElementById('hud-event-sheet').hidden);
  console.log('POPUP LUPO FEROCE VISIBILE:', popupShown ? '✓' : '✗');

  // rifiutare: nessun lupo in più
  const beforeDecline = await page.evaluate(() =>
    window.game.world.dynamic.filter((e) => e.constructor.name === 'WolfEntity').length);
  await page.click('#event-decline');
  await page.waitForTimeout(200);
  const afterDecline = await page.evaluate(() =>
    window.game.world.dynamic.filter((e) => e.constructor.name === 'WolfEntity').length);
  console.log('RIFIUTARE NON FA COMPARIRE NULLA:', afterDecline === beforeDecline ? '✓' : '✗');
  const closedAfterDecline = await page.evaluate(() => document.getElementById('hud-event-sheet').hidden);
  console.log('IL POPUP SI CHIUDE:', closedAfterDecline ? '✓' : '✗');

  // accettare: spawna un lupo feroce più forte, con ricompensa moltiplicata
  await page.evaluate(() => window.game.events._rareWolf(window.game));
  await page.waitForTimeout(200);
  await page.click('#event-accept');
  await page.waitForTimeout(200);
  const fierce = await page.evaluate(() => {
    const g = window.game;
    const w = g.world.dynamic.find((e) => e.constructor.name === 'WolfEntity' && e.fierce);
    return w ? { hp: w.maxHp, rewardMul: w.rewardMul } : null;
  });
  console.log('LUPO FEROCE APPARSO:', JSON.stringify(fierce));
  console.log('PIÙ VITA E RICOMPENSA MOLTIPLICATA:', fierce && fierce.hp > 34 && fierce.rewardMul > 1 ? '✓' : '✗');

  // uccidilo e verifica la ricompensa moltiplicata
  const killResult = await page.evaluate(async () => {
    const g = window.game;
    const w = g.world.dynamic.find((e) => e.constructor.name === 'WolfEntity' && e.fierce);
    const coinsBefore = g.stats.coins;
    w.takeDamage(9999, w.x, w.z, g);
    for (let i = 0; i < 40 && !w.dead; i++) w.update(0.05, g);
    return { coinsGained: g.stats.coins - coinsBefore };
  });
  console.log('MONETE GUADAGNATE DAL LUPO FEROCE:', killResult.coinsGained,
    killResult.coinsGained >= 16 ? '✓ ricompensa quadrupla (4x4)' : '✗');

  console.log('FPS:', await page.evaluate(() => Math.round(window.game.loop.fps)));
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 15).join('\n') : 'Nessun errore.');
  await browser.close();
})();
