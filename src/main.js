/**
 * main.js — Punto di ingresso.
 *
 * 1. prepara lo schermo (fullscreen, safe-area, niente zoom);
 * 2. "cuoce" tutte le sprite mostrando una barra di caricamento reale;
 * 3. avvia il gioco.
 */

import { AssetForge } from './render/AssetForge.js';
import { Game } from './core/Game.js';
import { initNative } from './platform/native.js';
import { CFG, idealPPU } from './data/config.js';

const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderTip = document.getElementById('loader-tip');

const TIPS = [
  'Cammina contro un albero: l\'ascia parte da sola.',
  'I tronchi si impilano sulla schiena: più ne porti, più è alta la catasta.',
  'Entra nell\'area del cantiere per consegnare i materiali.',
  'Il mercante compra tutto quello che hai addosso.',
  'Con le monete potenzi ascia, zaino e stivali.',
];

async function boot() {
  // Adattamenti nativi (barra di stato, orientamento, splash screen).
  await initNative();

  loaderTip.textContent = TIPS[(Math.random() * TIPS.length) | 0];

  // Cuociamo le sprite ESATTAMENTE alla scala a cui verranno disegnate su
  // questo schermo: niente riscalature, quindi massima nitidezza.
  const dpr = Math.min(window.devicePixelRatio || 1, CFG.render.maxDPR);
  CFG.render.bakePPU = Math.min(
    idealPPU(window.innerWidth, dpr),
    CFG.render.maxBakePPU,
  );

  const forge = new AssetForge();

  // Cottura incrementale: un pezzo per frame, così la barra si muove davvero.
  await new Promise((resolve) => {
    const stepOnce = () => {
      forge.step(10);
      const p = forge.progress;
      loaderBar.style.transform = `scaleX(${p})`;
      if (forge.finished) resolve();
      else requestAnimationFrame(stepOnce);
    };
    requestAnimationFrame(stepOnce);
  });

  const canvas = document.getElementById('game');
  const game = new Game(canvas, forge.assets, forge);

  // Esposto per il debug da console (utile durante lo sviluppo).
  window.game = game;

  game.start();

  // Dissolvenza della schermata di caricamento
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 620);

  // Primo suggerimento nel mondo
  setTimeout(() => game.hud.toast('Taglia gli alberi 🌳 e costruisci la capanna 🏠'), 700);
}

boot().catch((err) => {
  console.error(err);
  loaderTip.textContent = 'Errore di avvio: ' + err.message;
});
