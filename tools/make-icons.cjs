/**
 * make-icons.cjs — Genera icone e splash screen dell'app.
 *
 * L'icona è disegnata proceduralmente (SVG) e rasterizzata con Chromium:
 * nessun file grafico da versionare, e basta rilanciare lo script per
 * rigenerare tutte le densità dopo una modifica.
 *
 *   node tools/make-icons.cjs
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ arte */

/**
 * Icona: un albero low-poly stilizzato su fondo verde, nello stesso
 * linguaggio visivo del gioco.
 * @param {boolean} adaptive  true = solo il soggetto (icona adattiva Android)
 */
function iconSVG(adaptive) {
  const bg = adaptive ? '' : `
    <rect width="512" height="512" rx="112" fill="url(#sky)"/>
    <circle cx="256" cy="470" r="230" fill="#5aa84a" opacity=".55"/>`;
  // Nelle icone adattive il soggetto va tenuto dentro il cerchio di sicurezza.
  const s = adaptive ? 0.66 : 1;
  const tx = adaptive ? 256 * (1 - s) : 0;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5f9c4a"/>
      <stop offset="1" stop-color="#33682f"/>
    </linearGradient>
  </defs>
  ${bg}
  <g transform="translate(${tx},${tx}) scale(${s})">
    <!-- ombra a terra -->
    <ellipse cx="256" cy="424" rx="126" ry="36" fill="#000" opacity=".2"/>
    <!-- tronco (due facce: la destra in ombra) -->
    <path d="M226 424 L232 286 L256 286 L256 424 Z" fill="#8a6440"/>
    <path d="M256 424 L256 286 L280 286 L286 424 Z" fill="#6b4c30"/>
    <!-- chioma inferiore -->
    <path d="M256 168 L400 268 L256 348 L112 268 Z" fill="#4fae57"/>
    <path d="M256 168 L400 268 L256 348 Z" fill="#3f9950"/>
    <!-- chioma superiore -->
    <path d="M256 64 L364 176 L256 250 L148 176 Z" fill="#7cd873"/>
    <path d="M256 64 L364 176 L256 250 Z" fill="#5cc061"/>
    <!-- luce sulla faccia rivolta a sinistra -->
    <path d="M256 96 L196 168 L256 208 Z" fill="#a5eb96" opacity=".55"/>
  </g>
</svg>`;
}

function splashSVG(w, h) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="50%" cy="18%" r="95%">
      <stop offset="0" stop-color="#3b5a34"/>
      <stop offset="55%" stop-color="#253a22"/>
      <stop offset="100%" stop-color="#16210f"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <g transform="translate(${w / 2 - 128},${h / 2 - 160}) scale(0.5)">
    ${iconSVG(true).replace(/<svg[^>]*>|<\/svg>/g, '')}
  </g>
  <text x="${w / 2}" y="${h / 2 + 60}" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="46" font-weight="900"
        letter-spacing="4" fill="#ffffff" opacity=".92">VILLAGGIO</text>
</svg>`;
}

/* ------------------------------------------------------------- rendering */

const ANDROID_MIPMAP = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Le schermate di avvio Android usano i drawable per densità/orientamento.
const ANDROID_SPLASH = {
  'drawable': [480, 320],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();

  /** Rasterizza un SVG alle dimensioni richieste. */
  async function render(svg, w, h, out) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<body style="margin:0;background:transparent">
         <div style="width:${w}px;height:${h}px">${svg}</div>
       </body>`,
    );
    await page.locator('svg').first().evaluate((el, [W, H]) => {
      el.setAttribute('width', W); el.setAttribute('height', H);
    }, [w, h]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: true });
  }

  const res = path.join(ROOT, 'android/app/src/main/res');

  for (const [dir, size] of Object.entries(ANDROID_MIPMAP)) {
    await render(iconSVG(false), size, size, path.join(res, dir, 'ic_launcher.png'));
    await render(iconSVG(false), size, size, path.join(res, dir, 'ic_launcher_round.png'));
    // il foreground adattivo è più grande (108dp su 48dp di base)
    const fg = Math.round(size * 2.25);
    await render(iconSVG(true), fg, fg, path.join(res, dir, 'ic_launcher_foreground.png'));
  }
  console.log('✓ icone Android');

  for (const [dir, [w, h]] of Object.entries(ANDROID_SPLASH)) {
    await render(splashSVG(w, h), w, h, path.join(res, dir, 'splash.png'));
  }
  console.log('✓ splash Android');

  // Il colore di fondo dell'icona adattiva deve intonarsi al gioco.
  const bgXml = path.join(res, 'values/ic_launcher_background.xml');
  if (fs.existsSync(bgXml)) {
    fs.writeFileSync(bgXml,
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
      + '    <color name="ic_launcher_background">#3E7A38</color>\n</resources>\n');
  }

  // iOS: una sola immagine 1024×1024, senza canale alfa (requisito App Store).
  await render(iconSVG(false), 1024, 1024,
    path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
  console.log('✓ icona iOS');

  const iosSplash = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset');
  if (fs.existsSync(iosSplash)) {
    for (const [file, size] of [
      ['splash-2732x2732.png', 2732],
      ['splash-2732x2732-1.png', 2732],
      ['splash-2732x2732-2.png', 2732],
    ]) {
      await render(splashSVG(size, size), size, size, path.join(iosSplash, file));
    }
    console.log('✓ splash iOS');
  }

  await browser.close();
})();
