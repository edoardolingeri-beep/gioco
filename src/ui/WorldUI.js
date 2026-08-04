/**
 * WorldUI.js — Pannelli informativi disegnati DENTRO il mondo di gioco.
 *
 * Il gioco non ha menù: tutte le informazioni (costo di un edificio, prezzo
 * del mercante, potenziamento disponibile) fluttuano sopra l'oggetto a cui si
 * riferiscono. Sono disegnate sul canvas in coordinate schermo, con un
 * piccolo rimbalzo quando appaiono.
 */

import { projectY } from '../render/Projection.js';
import { clamp, easeOutBack } from '../core/MathUtils.js';

/** Rettangolo con angoli arrotondati (compatibile ovunque). */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Pannello con titolo, barra di avanzamento e testo.
 * @param {object} o {title, icon, value, max, color, appear:0..1, pulse}
 */
export function drawPanel(ctx, cam, dpr, x, y, z, o) {
  const app = easeOutBack(clamp(o.appear ?? 1, 0, 1));
  if (app <= 0.01) return;

  const anchorX = x * cam.ppu - cam.sx;
  const sy = projectY(y, z) * cam.ppu - cam.sy;

  const S = dpr * app;
  const hasBar = o.max != null;
  const h = (hasBar ? 46 : 30) * S;

  // Molti titoli iniziano con un'emoji ("⛏️ Minatore al lavoro…"): su
  // certi motori (Safari/iOS in testa) `measureText` non la misura con la
  // stessa larghezza con cui viene poi disegnata, e un unico `fillText`
  // centrato finisce per non essere centrato affatto — tutto il gruppo si
  // sposta di quel disallineamento. La separiamo: il testo (misurabile in
  // modo affidabile) si centra da solo, l'emoji le sta accanto a sinistra
  // con uno spazio fisso, senza contare per il centraggio.
  ctx.font = `800 ${13 * S}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const iconMatch = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s(.+)$/u.exec(o.title);
  const titleIcon = iconMatch ? iconMatch[1] : null;
  const titleText = iconMatch ? iconMatch[2] : o.title;
  const titleTextW = ctx.measureText(titleText).width;
  const iconGap = 6 * S;
  const titleIconW = titleIcon ? ctx.measureText(titleIcon).width + iconGap : 0;

  // Il riquadro non ha una larghezza fissa: la calibriamo sul testo vero
  // (titolo, ed etichetta della barra se c'è), altrimenti un titolo più
  // lungo del previsto sborda fuori dagli angoli arrotondati — non è
  // "storto", è solo troppo stretto per quello che ci scriviamo dentro.
  // `o.width` resta come larghezza minima, per i pannelli con poco testo.
  let w = Math.max((o.width ?? 132) * S, titleTextW + titleIconW + 28 * S);
  if (hasBar) {
    ctx.font = `900 ${11 * S}px system-ui, -apple-system, sans-serif`;
    const barLabel = `${o.value}/${o.max} ${o.icon ?? ''}`;
    w = Math.max(w, ctx.measureText(barLabel).width + 28 * S);
  }

  // Il fumetto non deve mai uscire dallo schermo: il riquadro si sposta,
  // la punta resta agganciata all'oggetto.
  const margin = 8 * dpr;
  const sx = clamp(anchorX, w / 2 + margin, cam.view.w - w / 2 - margin);
  const tipX = clamp(anchorX, sx - w / 2 + 12 * S, sx + w / 2 - 12 * S);

  const px = sx - w / 2;
  const py = sy - h;

  ctx.save();
  ctx.globalAlpha = clamp(app, 0, 1);

  // ombra + fondo — un leggero gradiente verticale al posto del colore
  // piatto, con un bordo inferiore più scuro: dà l'idea di rilievo, come i
  // pulsanti e i pannelli dell'interfaccia in sovrimpressione.
  ctx.fillStyle = 'rgba(18,16,28,0.55)';
  roundRect(ctx, px, py + 2 * S, w, h, 12 * S);
  ctx.fill();
  const grad = ctx.createLinearGradient(px, py, px, py + h);
  grad.addColorStop(0, 'rgba(56,52,84,0.92)');
  grad.addColorStop(1, 'rgba(24,22,36,0.92)');
  ctx.fillStyle = grad;
  roundRect(ctx, px, py, w, h, 12 * S);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5 * S;
  roundRect(ctx, px, py, w, h, 12 * S);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2 * S;
  ctx.beginPath();
  ctx.moveTo(px + 12 * S, py + h - 1 * S);
  ctx.lineTo(px + w - 12 * S, py + h - 1 * S);
  ctx.stroke();

  // titolo — il testo si centra sul proprio (affidabile) `titleTextW`;
  // l'emoji, se c'è, gli sta accanto senza influenzare quel centraggio
  // (vedi il commento più sopra sul perché).
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${13 * S}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = o.titleColor ?? '#ffffff';
  const titleY = py + (hasBar ? 14 * S : h / 2);
  const textCenterX = sx + titleIconW / 2;
  ctx.textAlign = 'center';
  ctx.fillText(titleText, textCenterX, titleY);
  if (titleIcon) {
    ctx.textAlign = 'right';
    ctx.fillText(titleIcon, textCenterX - titleTextW / 2 - iconGap, titleY);
    ctx.textAlign = 'center';
  }

  if (hasBar) {
    const bw = w - 20 * S;
    const bh = 12 * S;
    const bx = sx - bw / 2;
    const by = py + 25 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();

    const ratio = clamp(o.value / o.max, 0, 1);
    if (ratio > 0.001) {
      ctx.fillStyle = o.color ?? '#ffce54';
      roundRect(ctx, bx, by, Math.max(bh, bw * ratio), bh, bh / 2);
      ctx.fill();
      // luce in cima alla barra
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, bx + 1.5 * S, by + 1.5 * S, Math.max(bh, bw * ratio) - 3 * S, bh * 0.36, bh * 0.2);
      ctx.fill();
      ctx.globalAlpha /= 0.35;
    }

    ctx.font = `900 ${11 * S}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3 * S;
    const label = `${o.value}/${o.max} ${o.icon ?? ''}`;
    ctx.strokeText(label, sx, by + bh / 2 + 0.5 * S);
    ctx.fillText(label, sx, by + bh / 2 + 0.5 * S);
  }

  // punta del fumetto
  ctx.fillStyle = 'rgba(30,28,44,0.9)';
  ctx.beginPath();
  ctx.moveTo(tipX - 7 * S, py + h - 1);
  ctx.lineTo(tipX + 7 * S, py + h - 1);
  ctx.lineTo(tipX, py + h + 8 * S);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Anello di caricamento (usato dal banco dei potenziamenti).
 */
export function drawRing(ctx, cam, dpr, x, y, z, ratio, color = '#ffce54') {
  const sx = x * cam.ppu - cam.sx;
  const sy = projectY(y, z) * cam.ppu - cam.sy;
  const r = 22 * dpr;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 6 * dpr;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, r, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Freccia lampeggiante che indica un obiettivo fuori schermo. */
export function drawOffscreenArrow(ctx, cam, dpr, x, z, color, icon) {
  const sx = x * cam.ppu - cam.sx;
  const sy = projectY(0, z) * cam.ppu - cam.sy;
  const w = cam.view.w, h = cam.view.h;
  const m = 46 * dpr;
  if (sx > m && sx < w - m && sy > m && sy < h - m) return false;

  const cx = w / 2, cy = h / 2;
  const dx = sx - cx, dy = sy - cy;
  const ang = Math.atan2(dy, dx);
  // proietta sul bordo di un'ellisse inscritta
  const rx = w / 2 - m, ry = h / 2 - m;
  const t = 1 / Math.max(Math.abs(Math.cos(ang)) / rx, Math.abs(Math.sin(ang)) / ry);
  const ax = cx + Math.cos(ang) * t;
  const ay = cy + Math.sin(ang) * t;

  ctx.save();
  ctx.translate(ax, ay);
  ctx.globalAlpha = 0.9;
  ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -13 * dpr);
  ctx.lineTo(11 * dpr, 9 * dpr);
  ctx.lineTo(-11 * dpr, 9 * dpr);
  ctx.closePath();
  ctx.fill();
  ctx.rotate(-(ang + Math.PI / 2));
  if (icon) {
    ctx.font = `${16 * dpr}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 24 * dpr);
  }
  ctx.restore();
  return true;
}
