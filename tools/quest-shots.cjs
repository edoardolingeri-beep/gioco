/**
 * quest-shots.cjs — Schermate del cartello dell'obiettivo nei momenti chiave
 * della progressione: è la parte di interfaccia che guida i primi minuti.
 */

const { chromium } = require('playwright');
const shot = (n) => `/tmp/q-${n}.png`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });

  await page.goto('http://localhost:8099/index.html');
  await page.waitForFunction(() => window.game?.loop?.running, { timeout: 120000 });
  await page.waitForTimeout(1200);

  const obj = () => page.evaluate(() => {
    const o = window.game.objectives.current;
    return `${o.icon} ${o.text} (${o.have}/${o.need}) [${o.key}]`;
  });

  console.log('1. inizio        :', await obj());
  await page.screenshot({ path: shot('1-inizio') });

  // legno in spalla → deve chiedere di consegnarlo
  await page.evaluate(() => { window.game.carry.add('wood', 12); });
  await page.waitForTimeout(800);
  console.log('2. zaino pieno   :', await obj());
  await page.screenshot({ path: shot('2-zaino') });

  // capanna finita → il prossimo cantiere costa monete
  await page.evaluate(() => {
    const g = window.game;
    const b = g.world.buildings.hut;
    for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
    b._startRising(g); b.riseT = 1; b._finish(g);
    g.carry.stack.length = 0; g.carry.counts = {}; g.bus.emit('carry:changed');
  });
  await page.waitForTimeout(1200);
  console.log('3. capanna fatta :', await obj());
  await page.screenshot({ path: shot('3-segheria') });

  // monete a sufficienza → deve mandare al cantiere
  await page.evaluate(() => window.game.addCoins(200));
  await page.waitForTimeout(800);
  console.log('4. con monete    :', await obj());

  // segheria aperta ma senza piccone: la cava chiede pietra → prima il piccone
  await page.evaluate(() => {
    const g = window.game;
    for (const id of ['sawmill']) {
      const b = g.world.buildings[id];
      b.available = true; b.unlocked = true;
      for (const k in b.def.cost) b.paid[k] = b.def.cost[k];
      b._startRising(g); b.riseT = 1; b._finish(g);
    }
    g.world.buildings.quarry.unlocked = true;
  });
  await page.waitForTimeout(1200);
  console.log('5. serve piccone :', await obj());
  await page.screenshot({ path: shot('4-piccone') });

  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 6).join('\n') : 'Nessun errore.');
  await browser.close();
})();
