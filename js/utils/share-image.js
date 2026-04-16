/**
 * share-image.js — Génération d'une image de partage des stats (Canvas HTML5)
 * Format : Story vertical 1080×1920, téléchargeable en PNG.
 */

import { winStats }      from '../charts/registry.js';
import { buildMatchups } from '../advanced/predictor.js';
import { INK_COLOR }     from './ink.js';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0a0b14',
  surface: '#141628',
  raised:  '#1c1f38',
  border:  '#2a2f55',
  gold:    '#c9a84c',
  goldL:   '#f0cc6e',
  win:     '#4ecca3',
  loss:    '#e85d7a',
  text:    '#d4c9f0',
  muted:   '#7a7fa0',
};

const W = 1080;
const H = 1920;

const INK_SRC = {
  amber:    'assets/inks/amber.png',
  amethyst: 'assets/inks/amethyst.png',
  emerald:  'assets/inks/emerald.png',
  ruby:     'assets/inks/ruby.png',
  sapphire: 'assets/inks/sapphire.png',
  steel:    'assets/inks/steel.png',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

/**
 * Dessine les icônes PNG d'une combinaison d'encres (ex: "Amethyst/Sapphire").
 * @returns {number} largeur totale dessinée
 */
function drawInkIcons(ctx, inkImages, colorStr, x, y, size) {
  if (!colorStr) return 0;
  const parts = colorStr.split('/').map(s => s.trim().toLowerCase());
  const gap   = 4;
  parts.forEach((key, i) => {
    const ix  = x + i * (size + gap);
    const img = inkImages[key];
    if (img) {
      ctx.drawImage(img, ix, y, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(ix + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = INK_COLOR[key] || C.muted;
      ctx.fill();
    }
  });
  return parts.length * size + (parts.length - 1) * gap;
}

function verdictColor(rate) {
  if (rate >= 60) return C.win;
  if (rate >= 40) return C.goldL;
  return C.loss;
}

function verdictLabel(rate) {
  if (rate >= 60) return 'Favorable';
  if (rate >= 40) return 'Équilibré';
  return 'Défavorable';
}

// ── Sections ──────────────────────────────────────────────────────────────────

function drawBackground(ctx) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(201,168,76,0.06)';
  const seed = [37, 113, 227, 401, 593, 719, 811, 937, 1049, 1153,
                1279, 1361, 1487, 1597, 1699, 1801, 1901, 83, 199, 311];
  seed.forEach((s, i) => {
    const px = ((s * 17 + i * 97)  % (W - 40)) + 20;
    const py = ((s * 23 + i * 113) % (H - 40)) + 20;
    ctx.beginPath();
    ctx.arc(px, py, (s % 3) + 1, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Header : nom du deck + trait doré. */
function drawHeader(ctx, activeDeck) {
  ctx.textAlign = 'center';
  const deckLabel = (!activeDeck || activeDeck === 'all') ? 'Tous les decks' : activeDeck;
  ctx.fillStyle = C.muted;
  ctx.font = '400 36px "Crimson Pro", serif';
  ctx.fillText(deckLabel, W / 2, 75);

  const grd = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  grd.addColorStop(0, 'transparent');
  grd.addColorStop(0.5, C.gold);
  grd.addColorStop(1, 'transparent');
  ctx.strokeStyle = grd;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 300, 105);
  ctx.lineTo(W / 2 + 300, 105);
  ctx.stroke();
}

/** Icônes des decks joués (myColors), centré, PNG uniquement. */
function drawDecksJoues(ctx, inkImages, games, y) {
  const groups = {};
  for (const g of games) {
    if (g.myColors) groups[g.myColors] = (groups[g.myColors] || 0) + 1;
  }
  const combos = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 7);
  if (!combos.length) return;

  const iconSize = 38;
  const iconGap  = 4;
  const comboGap = 20;

  const items = combos.map(([combo]) => {
    const parts = combo.split('/').map(s => s.trim().toLowerCase());
    return { parts, w: parts.length * iconSize + (parts.length - 1) * iconGap };
  });

  const totalW = items.reduce((a, it) => a + it.w, 0) + comboGap * (items.length - 1);
  let x = W / 2 - totalW / 2;

  items.forEach(item => {
    item.parts.forEach((key, i) => {
      const img = inkImages[key];
      if (img) {
        ctx.drawImage(img, x + i * (iconSize + iconGap), y, iconSize, iconSize);
      } else {
        ctx.beginPath();
        ctx.arc(x + i * (iconSize + iconGap) + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = INK_COLOR[key] || C.muted;
        ctx.fill();
      }
    });
    x += item.w + comboGap;
  });
}

/** Arc circulaire winrate. */
function drawWinrate(ctx, stats) {
  const cx = W / 2;
  const cy = 370;
  const R  = 160;

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = C.raised;
  ctx.lineWidth = 26;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(201,168,76,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const startAngle = -Math.PI / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, startAngle, startAngle + Math.PI * 2 * (stats.rate / 100));
  ctx.strokeStyle = stats.rate >= 50 ? C.win : C.loss;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.textAlign = 'center';
  ctx.fillStyle = C.text;
  ctx.font = '700 92px Cinzel, serif';
  ctx.fillText(stats.rate.toFixed(1) + '%', cx, cy + 18);

  ctx.fillStyle = C.gold;
  ctx.font = '600 26px Cinzel, serif';
  ctx.fillText('WINRATE', cx, cy + 60);

  ctx.font = '300 32px "Crimson Pro", serif';
  ctx.fillStyle = C.win;
  ctx.fillText(`${stats.wins}V`, cx - 75, cy + 106);
  ctx.fillStyle = C.muted;
  ctx.fillText('·', cx, cy + 106);
  ctx.fillStyle = C.loss;
  ctx.fillText(`${stats.losses}D`, cx + 75, cy + 106);

  ctx.fillStyle = C.muted;
  ctx.font = '300 24px "Crimson Pro", serif';
  ctx.fillText(`${stats.total} parties`, cx, cy + 140);
}

function drawDivider(ctx, y) {
  const grd = ctx.createLinearGradient(W / 2 - 400, 0, W / 2 + 400, 0);
  grd.addColorStop(0, 'transparent');
  grd.addColorStop(0.5, C.border);
  grd.addColorStop(1, 'transparent');
  ctx.strokeStyle = grd;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 400, y);
  ctx.lineTo(W / 2 + 400, y);
  ctx.stroke();
}

/** Carte meilleur matchup. */
function drawBestMatchup(ctx, inkImages, best, y) {
  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold;
  ctx.font = '600 26px Cinzel, serif';
  ctx.fillText('MEILLEUR MATCHUP', W / 2, y + 44);

  if (!best) {
    ctx.fillStyle = C.muted;
    ctx.font = 'italic 28px "Crimson Pro", serif';
    ctx.fillText('Pas assez de parties (min. 3)', W / 2, y + 100);
    return;
  }

  const cardX = 70, cardW = W - 140, cardH = 158;
  roundRect(ctx, cardX, y + 60, cardW, cardH, 18, C.surface);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, y + 60, cardW, cardH, 18);
  ctx.stroke();

  const iconSize = 36;
  const iconY    = y + 60 + 48;
  const iconsW   = drawInkIcons(ctx, inkImages, best.opp, cardX + 36, iconY, iconSize);

  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  ctx.font = '400 36px "Crimson Pro", serif';
  ctx.fillText(best.opp, cardX + 36 + iconsW + 16, iconY + 27);

  const vc = verdictColor(best.rate);
  ctx.textAlign = 'right';
  ctx.fillStyle = vc;
  ctx.font = '700 52px Cinzel, serif';
  ctx.fillText(best.rate.toFixed(0) + '%', cardX + cardW - 36, iconY + 38);
  ctx.font = '400 22px "Crimson Pro", serif';
  ctx.fillText(verdictLabel(best.rate), cardX + cardW - 36, iconY + 66);

  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = '300 24px "Crimson Pro", serif';
  ctx.fillText(`${best.wins}V · ${best.losses}D · ${best.total} parties`, cardX + 36, y + 60 + cardH - 22);
}

/** Top 5 adversaires pleine largeur. */
function drawTop5(ctx, inkImages, matchups, y) {
  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold;
  ctx.font = '600 26px Cinzel, serif';
  ctx.fillText('TOP 5 ADVERSAIRES', W / 2, y + 44);

  const top5  = matchups.slice(0, 5);
  const rowH  = 150;
  const barH  = 20;
  const leftX = 50;
  const barW  = 820;

  top5.forEach((m, i) => {
    const ry = y + 72 + i * rowH;

    if (i % 2 === 0) {
      roundRect(ctx, leftX - 12, ry - 12, W - 2 * (leftX - 12), rowH - 8, 12, 'rgba(28,31,56,0.5)');
    }

    // Icônes + nom
    const iconSize = 28;
    const iconsW  = drawInkIcons(ctx, inkImages, m.opp, leftX + 10, ry + 18, iconSize);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text;
    ctx.font      = '400 30px "Crimson Pro", serif';
    ctx.fillText(m.opp, leftX + 10 + iconsW + 14, ry + 18 + 22);

    // Barre
    const barY = ry + 56;
    roundRect(ctx, leftX, barY, barW, barH, barH / 2, C.raised);
    const wW = Math.round((m.wins   / m.total) * barW);
    const lW = Math.round((m.losses / m.total) * barW);
    if (wW > 0) roundRect(ctx, leftX, barY, wW, barH, barH / 2, C.win);
    if (lW > 0 && wW + lW <= barW) roundRect(ctx, leftX + wW, barY, lW, barH, barH / 2, C.loss);

    // % global
    const vc = verdictColor(m.rate);
    ctx.textAlign = 'right';
    ctx.fillStyle = vc;
    ctx.font      = '700 30px Cinzel, serif';
    ctx.fillText(m.rate.toFixed(0) + '%', leftX + barW + 125, barY + 15);

    // Bilan V/D
    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted;
    ctx.font      = '300 22px "Crimson Pro", serif';
    ctx.fillText(`${m.wins}V · ${m.losses}D · ${m.total}p`, leftX, barY + barH + 22);

    // OTP / OTD
    const parts = [];
    if (m.otpRate !== null) parts.push({ label: `OTP ${m.otpRate.toFixed(0)}%`, color: m.otpRate >= 50 ? C.win : C.loss });
    if (m.otdRate !== null) parts.push({ label: `OTD ${m.otdRate.toFixed(0)}%`, color: m.otdRate >= 50 ? C.win : C.loss });
    if (parts.length) {
      let ox = leftX;
      parts.forEach((part, pi) => {
        if (pi > 0) {
          ctx.fillStyle = C.border;
          ctx.font = '300 20px "Crimson Pro", serif';
          ctx.fillText('  ·  ', ox, barY + barH + 46);
          ox += ctx.measureText('  ·  ').width;
        }
        ctx.fillStyle = part.color;
        ctx.font = '400 20px "Crimson Pro", serif';
        ctx.fillText(part.label, ox, barY + barH + 46);
        ox += ctx.measureText(part.label).width;
      });
    }
  });
}

/** Footer avec icônes PNG des encres. */
function drawFooter(ctx, inkImages, y) {
  drawDivider(ctx, y);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold;
  ctx.font = '500 24px Cinzel, serif';
  ctx.fillText('Inkwell Stats · duels.ink', W / 2, y + 44);

  const gems       = ['amber', 'amethyst', 'emerald', 'ruby', 'sapphire', 'steel'];
  const iconSize   = 36;
  const gemSpacing = 52;
  const gemStart   = W / 2 - (gems.length - 1) / 2 * gemSpacing;
  gems.forEach((ink, i) => {
    const ix  = gemStart + i * gemSpacing - iconSize / 2;
    const iy  = y + 56;
    const img = inkImages[ink];
    if (img) {
      ctx.drawImage(img, ix, iy, iconSize, iconSize);
    } else {
      ctx.beginPath();
      ctx.arc(gemStart + i * gemSpacing, iy + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = INK_COLOR[ink] || C.muted;
      ctx.fill();
    }
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Génère l'image de partage sur un canvas offscreen et retourne un data URL PNG.
 * @param {object[]} games     — parties filtrées (store.getFiltered())
 * @param {string}   activeDeck — deck actif ('all' ou nom du deck)
 * @returns {Promise<string>}
 */
export async function generateShareImage(games, activeDeck) {
  await document.fonts.ready;

  // Préchargement des icônes PNG d'encre
  const inkImages = {};
  await Promise.all(
    Object.entries(INK_SRC).map(async ([key, src]) => {
      inkImages[key] = await loadImage(src);
    })
  );

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const stats    = winStats(games);
  const matchups = buildMatchups(games);
  const best     = matchups.filter(m => m.total >= 3 && m.rate >= 50)
                           .sort((a, b) => b.rate - a.rate)[0] || null;

  // Layout (y positions) :
  //   Header       : deck label y=75, divider y=105
  //   Decks joués  : icônes y=120 (hauteur 38 → bottom 158)
  //   Winrate arc  : cy=370, R=160 (top ~197, bottom ~543, text ~510)
  //   Divider      : 562
  //   Matchup      : 578 (carte y+60=638, hauteur 158 → bottom 796)
  //   Divider      : 820
  //   Top 5        : 835 (5 × 150 = 750 → bottom ~1660)
  //   Footer       : 1680 (text y+44=1724, icônes y+56=1736)

  drawBackground(ctx);
  drawHeader(ctx, activeDeck);
  drawDecksJoues(ctx, inkImages, games, 120);
  drawWinrate(ctx, stats);
  drawDivider(ctx, 562);
  drawBestMatchup(ctx, inkImages, best, 578);
  drawDivider(ctx, 820);
  drawTop5(ctx, inkImages, matchups, 835);
  drawFooter(ctx, inkImages, 1680);

  return canvas.toDataURL('image/png');
}

/**
 * Génère et déclenche le téléchargement de l'image de partage.
 */
export async function downloadShareImage(games, activeDeck) {
  const dataUrl = await generateShareImage(games, activeDeck);
  const a = document.createElement('a');
  a.href     = dataUrl;
  a.download = 'inkwell-stats.png';
  a.click();
}
