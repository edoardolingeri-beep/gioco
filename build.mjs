/**
 * build.mjs — "Build" del gioco.
 *
 * Non serve alcun bundler: il gioco usa moduli ES nativi, che i WebView di
 * Android (Chrome) e iOS (WKWebView) supportano da anni. Questo script si
 * limita a copiare i file statici dentro `www/`, la cartella che Capacitor
 * impacchetta nell'app.
 *
 *   node build.mjs
 */

import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = 'www';
const ASSETS = ['index.html', 'src', 'styles'];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const a of ASSETS) {
  if (!existsSync(a)) {
    console.error(`✗ manca "${a}"`);
    process.exit(1);
  }
  await cp(a, `${OUT}/${a}`, { recursive: true });
}

// Marcatore utile per capire quale build è installata sul telefono.
await writeFile(`${OUT}/build.json`, JSON.stringify({
  builtAt: new Date().toISOString(),
}, null, 2));

console.log(`✓ ${OUT}/ pronta (${ASSETS.join(', ')})`);
